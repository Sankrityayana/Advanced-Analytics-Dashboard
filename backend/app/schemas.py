from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    age: int = Field(..., ge=13, le=90)
    daily_time_spent: float = Field(..., ge=0, le=180)
    area_income: float = Field(..., ge=5_000, le=300_000)
    daily_internet_usage: float = Field(..., ge=0, le=300)
    male: int = Field(..., ge=0, le=1)
    previous_clicks: int = Field(..., ge=0, le=20)
    ad_quality_score: float = Field(..., ge=0, le=100)
    hour: int = Field(..., ge=0, le=23)
    device_score: float = Field(..., ge=0, le=100)
    campaign_score: float = Field(..., ge=0, le=100)
    model_name: str = Field(default="ensemble")
