import os
from threading import Thread

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.schemas import PredictRequest
from app.services import (
    ensure_artifacts,
    get_forecast,
    get_metrics,
    get_readiness_status,
    predict_click_probability,
)


def _load_cors_origins() -> list[str]:
    raw_value = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    origins = [origin.strip() for origin in raw_value.split(",") if origin.strip()]
    return origins or ["http://localhost:5173", "http://127.0.0.1:5173"]


app = FastAPI(
    title="Advanced Analytics Dashboard API",
    description="FastAPI backend for CTR analytics, prediction, and forecasting.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_load_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Warm startup artifacts without blocking API boot.
    Thread(target=ensure_artifacts, daemon=True).start()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> JSONResponse:
    readiness = get_readiness_status()
    status_code = 200 if readiness["ready"] else 503
    return JSONResponse(content=readiness, status_code=status_code)


@app.post("/predict")
def predict(payload: PredictRequest) -> dict:
    return predict_click_probability(payload.model_dump())


@app.get("/forecast")
def forecast(days: int = Query(default=30, ge=7, le=90)) -> dict:
    return get_forecast(days=days)


@app.get("/metrics")
def metrics() -> dict:
    return get_metrics()
