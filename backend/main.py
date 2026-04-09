from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import PredictRequest
from app.services import ensure_artifacts, get_forecast, get_metrics, predict_click_probability


app = FastAPI(
    title="Advanced Analytics Dashboard API",
    description="FastAPI backend for CTR analytics, prediction, and forecasting.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    ensure_artifacts()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
def predict(payload: PredictRequest) -> dict:
    return predict_click_probability(payload.model_dump())


@app.get("/forecast")
def forecast(days: int = Query(default=30, ge=7, le=90)) -> dict:
    return get_forecast(days=days)


@app.get("/metrics")
def metrics() -> dict:
    return get_metrics()
