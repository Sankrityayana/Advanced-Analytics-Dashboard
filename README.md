# Advanced Analytics Dashboard

A full-stack, SaaS-style analytics platform built with **React (Vite)** and **FastAPI** for click-through-rate (CTR) intelligence. The application combines interactive analytics, machine learning prediction, and forward-looking forecasting in one product-grade web experience.

## Overview

This project is designed as a production-ready starter for digital marketing analytics teams. It provides:

- A modern dark-theme dashboard with KPI monitoring
- Real-time click probability prediction for ad campaigns
- Forecasted CTR trajectories using time-series modeling
- Data storytelling through feature insights and correlation views

## Features

- **Dashboard**
  - KPI cards for CTR, clicks, and impressions
  - Trend charts for daily CTR movement and engagement volume
  - Trained model performance snapshot

- **Analytics**
  - Feature importance insights from trained models
  - Correlation heatmap across campaign and user signals
  - Segment-level CTR charts (hourly and audience slices)

- **Predictions**
  - Interactive form for ad/user context input
  - Click probability inference via Logistic Regression, Random Forest, and XGBoost
  - Ensemble scoring and confidence interval presentation

- **Forecasting**
  - Future CTR projection with confidence bounds
  - Adjustable forecast horizon (7 to 90 days)
  - Historical vs projected trend visualization

## Architecture

```text
Advanced-Analytics-Dashboard/
|
|-- frontend/        # React (Vite) + Tailwind + Recharts
|-- backend/         # FastAPI services and ML orchestration
|-- models/          # Runtime-generated model artifacts
|-- data/            # Runtime-generated dataset artifacts
|-- notebooks/       # Optional experimentation workspace
|-- requirements.txt
|-- README.md
```

### Backend Flow

1. Synthetic CTR dataset is generated if missing.
2. Three classifiers are trained and persisted with `joblib`:
   - Logistic Regression
   - Random Forest
   - XGBoost (with fallback if package is unavailable)
3. Forecast payload is produced with Prophet (or deterministic fallback if Prophet is unavailable).
4. FastAPI serves real-time endpoints consumed by the frontend.

### API Endpoints

- `POST /predict`
  - Input: ad/user feature payload
  - Output: click probability, model-level probabilities, confidence interval

- `GET /forecast?days=30`
  - Output: historical CTR and forward forecast values

- `GET /metrics`
  - Output: KPI summary, trend series, feature insights, heatmap, segment data

- `GET /ready`
  - Output: artifact readiness state for models and cache files
  - Status: `200` when ready, `503` while warming or on initialization error

## Setup Instructions

### 1. Clone and enter project

```bash
git clone https://github.com/Sankrityayana/Advanced-Analytics-Dashboard.git
cd Advanced-Analytics-Dashboard
```

### 2. Create Python environment and install backend dependencies

```bash
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

## Run Frontend and Backend

### Backend

Run this from the `backend` directory:

```bash
cd backend
uvicorn main:app --reload
```

Backend default URL: `http://127.0.0.1:8000`

Optional backend configuration:

- `CORS_ORIGINS`: comma-separated allowed origins (example: `https://app.example.com,https://admin.example.com`)

### Frontend

Run this from the `frontend` directory:

```bash
npm run dev
```

Frontend default URL: `http://127.0.0.1:5173`

If needed, set frontend API base URL in `frontend/.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Automated Tests

Run backend tests from the project root:

```bash
python -m unittest discover -s backend/tests
```

Run frontend tests from the `frontend` directory:

```bash
npm test
```

## Screenshots

Add UI screenshots in this section after launching locally.

- Dashboard view
- Analytics view
- Predictions view
- Forecasting view

## Future Scope

- Authentication and role-based access control
- Live data ingestion from ad platforms
- Model registry and experiment tracking
- Drift monitoring and automated retraining pipelines
- Exportable PDF reports and alert subscriptions

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Recharts, Axios
- **Backend:** FastAPI, Pandas, NumPy, Scikit-learn, XGBoost, Prophet, Joblib
- **Modeling:** Classification for click prediction + time-series forecasting for CTR

