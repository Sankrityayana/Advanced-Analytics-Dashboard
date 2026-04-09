from __future__ import annotations

import json
import threading
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBClassifier
except Exception:  # pragma: no cover - fallback if xgboost is unavailable
    XGBClassifier = None

try:
    from prophet import Prophet
except Exception:  # pragma: no cover - fallback if prophet is unavailable
    Prophet = None


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
DATASET_PATH = DATA_DIR / "ads_ctr_dashboard.csv"
ANALYTICS_PATH = MODELS_DIR / "analytics_cache.json"
FORECAST_PATH = MODELS_DIR / "ctr_forecast.json"

FEATURE_COLUMNS = [
    "age",
    "daily_time_spent",
    "area_income",
    "daily_internet_usage",
    "male",
    "previous_clicks",
    "ad_quality_score",
    "hour",
    "device_score",
    "campaign_score",
]

MODEL_FILE_MAP = {
    "logistic_regression": MODELS_DIR / "logistic_regression.joblib",
    "random_forest": MODELS_DIR / "random_forest.joblib",
    "xgboost": MODELS_DIR / "xgboost.joblib",
}

MODEL_CACHE: dict[str, Any] = {}
ANALYTICS_CACHE: dict[str, Any] | None = None
FORECAST_CACHE: dict[str, Any] | None = None
ARTIFACT_LOCK = threading.Lock()


def _sigmoid(values: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-values))


def _safe_pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return ((current - previous) / previous) * 100.0


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_or_create_dataset() -> pd.DataFrame:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if DATASET_PATH.exists():
        frame = pd.read_csv(DATASET_PATH, parse_dates=["date"])
        frame["date"] = pd.to_datetime(frame["date"]).dt.date
        return frame

    rng = np.random.default_rng(42)
    rows = 12000
    day_span = 540
    start_date = datetime.utcnow().date() - timedelta(days=day_span)
    day_offsets = rng.integers(0, day_span, size=rows)

    age = rng.integers(18, 68, size=rows)
    daily_time_spent = np.clip(rng.normal(55, 14, size=rows), 8, 130)
    area_income = np.clip(rng.normal(68000, 18000, size=rows), 18000, 180000)
    daily_internet_usage = np.clip(rng.normal(170, 35, size=rows), 45, 320)
    male = rng.integers(0, 2, size=rows)
    previous_clicks = rng.integers(0, 11, size=rows)
    ad_quality_score = np.clip(rng.normal(62, 17, size=rows), 5, 100)
    hour = rng.integers(0, 24, size=rows)
    device_score = np.clip(rng.normal(58, 16, size=rows), 8, 100)
    campaign_score = np.clip(rng.normal(60, 15, size=rows), 5, 100)

    weekly_seasonality = np.sin(2 * np.pi * day_offsets / 7)
    monthly_seasonality = np.sin(2 * np.pi * day_offsets / 30)
    trend = day_offsets / day_span

    logit = (
        -3.8
        + 0.012 * (daily_time_spent - 50)
        + 0.00002 * (area_income - 65000)
        + 0.03 * (ad_quality_score - 55)
        + 0.11 * previous_clicks
        + 0.015 * (campaign_score - 50)
        + 0.01 * (device_score - 50)
        + 0.23 * ((hour >= 18) & (hour <= 22)).astype(float)
        + 0.16 * weekly_seasonality
        + 0.09 * monthly_seasonality
        + 0.24 * trend
    )

    ctr_probability = np.clip(_sigmoid(logit), 0.003, 0.3)
    clicked_probability = np.clip(ctr_probability * 2.1, 0.01, 0.85)

    impressions = rng.integers(300, 5000, size=rows)
    clicks = rng.binomial(impressions, ctr_probability)
    clicked = rng.binomial(1, clicked_probability)

    frame = pd.DataFrame(
        {
            "date": [start_date + timedelta(days=int(offset)) for offset in day_offsets],
            "age": age,
            "daily_time_spent": daily_time_spent,
            "area_income": area_income,
            "daily_internet_usage": daily_internet_usage,
            "male": male,
            "previous_clicks": previous_clicks,
            "ad_quality_score": ad_quality_score,
            "hour": hour,
            "device_score": device_score,
            "campaign_score": campaign_score,
            "impressions": impressions,
            "clicks": clicks,
            "clicked": clicked,
        }
    ).sort_values("date")

    frame.to_csv(DATASET_PATH, index=False)
    return frame


def _build_models() -> dict[str, Any]:
    models: dict[str, Any] = {
        "logistic_regression": Pipeline(
            steps=[
                ("scaler", StandardScaler()),
                (
                    "model",
                    LogisticRegression(
                        max_iter=1500,
                        class_weight="balanced",
                        random_state=42,
                    ),
                ),
            ]
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=260,
            max_depth=12,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1,
        ),
    }

    if XGBClassifier is not None:
        models["xgboost"] = XGBClassifier(
            objective="binary:logistic",
            eval_metric="logloss",
            n_estimators=250,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42,
            n_jobs=4,
        )
    else:
        models["xgboost"] = HistGradientBoostingClassifier(
            max_depth=6,
            learning_rate=0.06,
            max_iter=260,
            random_state=42,
        )

    return models


def _extract_importance(model: Any) -> np.ndarray:
    if hasattr(model, "feature_importances_"):
        return np.array(model.feature_importances_, dtype=float)

    if isinstance(model, Pipeline):
        estimator = model.named_steps.get("model")
        if estimator is not None and hasattr(estimator, "coef_"):
            return np.abs(np.array(estimator.coef_).ravel())

    return np.zeros(len(FEATURE_COLUMNS), dtype=float)


def train_models(frame: pd.DataFrame) -> tuple[dict[str, Any], dict[str, list[dict[str, float]]]]:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    x_train, x_test, y_train, y_test = train_test_split(
        frame[FEATURE_COLUMNS],
        frame["clicked"],
        test_size=0.2,
        random_state=42,
        stratify=frame["clicked"],
    )

    models = _build_models()
    metrics: dict[str, Any] = {}
    feature_importance: dict[str, list[dict[str, float]]] = {}

    for model_name, model in models.items():
        model.fit(x_train, y_train)
        probabilities = model.predict_proba(x_test)[:, 1]
        predictions = (probabilities >= 0.5).astype(int)

        metrics[model_name] = {
            "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
            "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, probabilities)), 4),
        }

        importance_values = _extract_importance(model)
        total_importance = float(importance_values.sum())
        if total_importance > 0:
            normalized = importance_values / total_importance
        else:
            normalized = importance_values

        feature_importance[model_name] = [
            {
                "feature": feature,
                "importance": round(float(weight), 4),
            }
            for feature, weight in sorted(
                zip(FEATURE_COLUMNS, normalized, strict=False),
                key=lambda item: item[1],
                reverse=True,
            )
        ]

        joblib.dump(model, MODEL_FILE_MAP[model_name])

    return metrics, feature_importance


def build_forecast(frame: pd.DataFrame, horizon: int = 45) -> dict[str, Any]:
    daily = (
        frame.groupby("date", as_index=False)
        .agg(clicks=("clicks", "sum"), impressions=("impressions", "sum"))
        .sort_values("date")
    )
    daily["ctr"] = np.where(daily["impressions"] > 0, daily["clicks"] / daily["impressions"], 0.0)

    history = [
        {
            "date": item.date.isoformat() if isinstance(item.date, date) else str(item.date),
            "ctr": round(float(item.ctr), 6),
        }
        for item in daily.tail(90).itertuples(index=False)
    ]

    if Prophet is not None:
        prophet_frame = daily[["date", "ctr"]].rename(columns={"date": "ds", "ctr": "y"})
        prophet_frame["ds"] = pd.to_datetime(prophet_frame["ds"])

        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode="additive",
        )
        model.fit(prophet_frame)

        future = model.make_future_dataframe(periods=horizon, freq="D")
        forecast_frame = model.predict(future).tail(horizon)[["ds", "yhat", "yhat_lower", "yhat_upper"]]

        forecast = [
            {
                "date": row.ds.date().isoformat(),
                "ctr": round(float(np.clip(row.yhat, 0.001, 0.5)), 6),
                "lower": round(float(np.clip(row.yhat_lower, 0.0005, 0.5)), 6),
                "upper": round(float(np.clip(row.yhat_upper, 0.001, 0.55)), 6),
            }
            for row in forecast_frame.itertuples(index=False)
        ]
    else:
        last_date = pd.to_datetime(daily["date"].iloc[-1]).date()
        baseline = daily["ctr"].tail(30).mean()
        trend = np.linspace(-0.0015, 0.0035, horizon)
        weekly_wave = 0.002 * np.sin(np.arange(horizon) * 2 * np.pi / 7)
        yhat = np.clip(baseline + trend + weekly_wave, 0.001, 0.5)

        forecast = [
            {
                "date": (last_date + timedelta(days=idx + 1)).isoformat(),
                "ctr": round(float(value), 6),
                "lower": round(float(max(value - 0.005, 0.0005)), 6),
                "upper": round(float(min(value + 0.005, 0.55)), 6),
            }
            for idx, value in enumerate(yhat)
        ]

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "history": history,
        "forecast": forecast,
    }


def build_analytics_cache(
    frame: pd.DataFrame,
    model_metrics: dict[str, Any],
    feature_importance: dict[str, list[dict[str, float]]],
) -> dict[str, Any]:
    daily = (
        frame.groupby("date", as_index=False)
        .agg(clicks=("clicks", "sum"), impressions=("impressions", "sum"))
        .sort_values("date")
    )
    daily["ctr"] = np.where(daily["impressions"] > 0, daily["clicks"] / daily["impressions"], 0.0)

    recent_period = daily.tail(30)
    previous_period = daily.iloc[-60:-30] if len(daily) >= 60 else daily.head(max(len(daily) - 30, 1))

    recent_clicks = float(recent_period["clicks"].sum())
    recent_impressions = float(recent_period["impressions"].sum())
    previous_clicks = float(previous_period["clicks"].sum())
    previous_impressions = float(previous_period["impressions"].sum())

    recent_ctr = recent_clicks / recent_impressions if recent_impressions else 0.0
    previous_ctr = previous_clicks / previous_impressions if previous_impressions else 0.0

    trend = [
        {
            "date": item.date.isoformat() if isinstance(item.date, date) else str(item.date),
            "ctr": round(float(item.ctr), 6),
            "clicks": int(item.clicks),
            "impressions": int(item.impressions),
        }
        for item in daily.tail(120).itertuples(index=False)
    ]

    heatmap_labels = [
        "age",
        "daily_time_spent",
        "area_income",
        "daily_internet_usage",
        "ad_quality_score",
        "previous_clicks",
        "clicks",
        "impressions",
        "clicked",
    ]
    correlation = frame[heatmap_labels].corr(numeric_only=True).fillna(0.0).round(3)

    hourly = frame.groupby("hour", as_index=False).agg(clicks=("clicks", "sum"), impressions=("impressions", "sum"))
    hourly["ctr"] = np.where(hourly["impressions"] > 0, hourly["clicks"] / hourly["impressions"], 0.0)

    gender = frame.groupby("male", as_index=False).agg(clicks=("clicks", "sum"), impressions=("impressions", "sum"))
    gender["ctr"] = np.where(gender["impressions"] > 0, gender["clicks"] / gender["impressions"], 0.0)

    source_importance = (
        feature_importance.get("xgboost")
        or feature_importance.get("random_forest")
        or feature_importance.get("logistic_regression")
        or []
    )

    best_model = max(model_metrics.items(), key=lambda item: item[1]["roc_auc"])[0]

    return {
        "kpis": {
            "ctr": round(recent_ctr, 6),
            "clicks": int(recent_clicks),
            "impressions": int(recent_impressions),
            "ctr_change_pct": round(_safe_pct_change(recent_ctr, previous_ctr), 2),
            "clicks_change_pct": round(_safe_pct_change(recent_clicks, previous_clicks), 2),
            "impressions_change_pct": round(_safe_pct_change(recent_impressions, previous_impressions), 2),
        },
        "best_model": best_model,
        "trend": trend,
        "feature_insights": source_importance[:10],
        "heatmap": {
            "labels": heatmap_labels,
            "values": correlation.values.tolist(),
        },
        "segments": {
            "hourly_ctr": [
                {
                    "hour": int(item.hour),
                    "ctr": round(float(item.ctr), 6),
                }
                for item in hourly.sort_values("hour").itertuples(index=False)
            ],
            "gender_ctr": [
                {
                    "segment": "Male" if int(item.male) == 1 else "Female",
                    "ctr": round(float(item.ctr), 6),
                }
                for item in gender.sort_values("male").itertuples(index=False)
            ],
        },
        "model_performance": model_metrics,
        "generated_at": datetime.utcnow().isoformat(),
    }


def ensure_artifacts(force_retrain: bool = False) -> None:
    global ANALYTICS_CACHE, FORECAST_CACHE, MODEL_CACHE

    with ARTIFACT_LOCK:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        MODELS_DIR.mkdir(parents=True, exist_ok=True)

        frame = load_or_create_dataset()

        models_missing = force_retrain or any(not model_path.exists() for model_path in MODEL_FILE_MAP.values())
        analytics_missing = force_retrain or not ANALYTICS_PATH.exists()
        forecast_missing = force_retrain or not FORECAST_PATH.exists()

        if models_missing:
            MODEL_CACHE = {}
            model_metrics, feature_importance = train_models(frame)
        else:
            model_metrics = {}
            feature_importance = {}

        if analytics_missing or models_missing:
            if not model_metrics:
                loaded_models = {name: joblib.load(path) for name, path in MODEL_FILE_MAP.items()}
                sample_x = frame[FEATURE_COLUMNS]
                sample_y = frame["clicked"]
                model_metrics = {}
                feature_importance = {}
                for name, model in loaded_models.items():
                    probabilities = model.predict_proba(sample_x)[:, 1]
                    predictions = (probabilities >= 0.5).astype(int)
                    model_metrics[name] = {
                        "accuracy": round(float(accuracy_score(sample_y, predictions)), 4),
                        "precision": round(float(precision_score(sample_y, predictions, zero_division=0)), 4),
                        "recall": round(float(recall_score(sample_y, predictions, zero_division=0)), 4),
                        "f1": round(float(f1_score(sample_y, predictions, zero_division=0)), 4),
                        "roc_auc": round(float(roc_auc_score(sample_y, probabilities)), 4),
                    }
                    importance_values = _extract_importance(model)
                    total_importance = float(importance_values.sum())
                    normalized = importance_values / total_importance if total_importance > 0 else importance_values
                    feature_importance[name] = [
                        {
                            "feature": feature,
                            "importance": round(float(weight), 4),
                        }
                        for feature, weight in sorted(
                            zip(FEATURE_COLUMNS, normalized, strict=False),
                            key=lambda item: item[1],
                            reverse=True,
                        )
                    ]

            analytics = build_analytics_cache(frame, model_metrics, feature_importance)
            _write_json(ANALYTICS_PATH, analytics)
            ANALYTICS_CACHE = analytics

        if forecast_missing or models_missing:
            forecast = build_forecast(frame)
            _write_json(FORECAST_PATH, forecast)
            FORECAST_CACHE = forecast


def load_models() -> dict[str, Any]:
    global MODEL_CACHE
    if MODEL_CACHE:
        return MODEL_CACHE

    ensure_artifacts()
    MODEL_CACHE = {name: joblib.load(path) for name, path in MODEL_FILE_MAP.items()}
    return MODEL_CACHE


def get_metrics() -> dict[str, Any]:
    global ANALYTICS_CACHE

    ensure_artifacts()
    if ANALYTICS_CACHE is None:
        ANALYTICS_CACHE = _read_json(ANALYTICS_PATH)

    return ANALYTICS_CACHE


def get_forecast(days: int = 30) -> dict[str, Any]:
    global FORECAST_CACHE

    ensure_artifacts()
    if FORECAST_CACHE is None:
        FORECAST_CACHE = _read_json(FORECAST_PATH)

    horizon = max(7, min(days, 90))

    return {
        "generated_at": FORECAST_CACHE["generated_at"],
        "history": FORECAST_CACHE["history"],
        "forecast": FORECAST_CACHE["forecast"][:horizon],
        "horizon_days": horizon,
    }


def predict_click_probability(payload: dict[str, Any]) -> dict[str, Any]:
    models = load_models()
    metrics = get_metrics()

    features = pd.DataFrame(
        [{column: payload[column] for column in FEATURE_COLUMNS}],
        columns=FEATURE_COLUMNS,
    )

    model_probabilities: dict[str, float] = {}
    for model_name, model in models.items():
        model_probabilities[model_name] = float(model.predict_proba(features)[0, 1])

    ensemble_probability = float(np.mean(list(model_probabilities.values())))

    aliases = {
        "logistic": "logistic_regression",
        "logistic_regression": "logistic_regression",
        "random_forest": "random_forest",
        "random-forest": "random_forest",
        "xgboost": "xgboost",
        "xgb": "xgboost",
        "ensemble": "ensemble",
    }

    requested_model = aliases.get(str(payload.get("model_name", "ensemble")).lower().strip(), "ensemble")
    selected_probability = ensemble_probability

    if requested_model in model_probabilities:
        selected_probability = model_probabilities[requested_model]

    std_dev = float(np.std(list(model_probabilities.values())))
    lower = float(np.clip(selected_probability - std_dev, 0.0, 1.0))
    upper = float(np.clip(selected_probability + std_dev, 0.0, 1.0))

    if selected_probability >= 0.2:
        risk_band = "High Intent"
    elif selected_probability >= 0.08:
        risk_band = "Moderate Intent"
    else:
        risk_band = "Low Intent"

    return {
        "selected_model": requested_model,
        "best_model": metrics["best_model"],
        "click_probability": round(selected_probability, 6),
        "click_probability_pct": round(selected_probability * 100.0, 2),
        "confidence_interval": {
            "lower": round(lower, 6),
            "upper": round(upper, 6),
        },
        "intent_band": risk_band,
        "model_probabilities": {name: round(value, 6) for name, value in model_probabilities.items()},
        "ensemble_probability": round(ensemble_probability, 6),
    }
