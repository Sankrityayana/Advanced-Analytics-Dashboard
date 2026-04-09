import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import main  # noqa: E402


class ApiRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        startup_patch = patch("main.ensure_artifacts", return_value=None)
        self.addCleanup(startup_patch.stop)
        startup_patch.start()
        self.client = TestClient(main.app)

    def test_health_endpoint(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_ready_returns_200_when_artifacts_ready(self) -> None:
        ready_payload = {
            "state": "ready",
            "ready": True,
            "last_error": None,
            "updated_at": "2026-04-09T00:00:00",
            "artifacts": {
                "model_files_ready": True,
                "cache_files_ready": True,
                "dataset_ready": True,
            },
        }

        with patch("main.get_readiness_status", return_value=ready_payload):
            response = self.client.get("/ready")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["ready"], True)

    def test_ready_returns_503_when_not_ready(self) -> None:
        not_ready_payload = {
            "state": "initializing",
            "ready": False,
            "last_error": None,
            "updated_at": "2026-04-09T00:00:00",
            "artifacts": {
                "model_files_ready": False,
                "cache_files_ready": False,
                "dataset_ready": True,
            },
        }

        with patch("main.get_readiness_status", return_value=not_ready_payload):
            response = self.client.get("/ready")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["state"], "initializing")

    def test_predict_endpoint_delegates_to_service(self) -> None:
        payload = {
            "age": 34,
            "daily_time_spent": 61,
            "area_income": 72000,
            "daily_internet_usage": 178,
            "male": 1,
            "previous_clicks": 4,
            "ad_quality_score": 74,
            "hour": 20,
            "device_score": 69,
            "campaign_score": 70,
            "model_name": "ensemble",
        }
        expected = {
            "selected_model": "ensemble",
            "best_model": "random_forest",
            "click_probability": 0.123,
            "click_probability_pct": 12.3,
            "confidence_interval": {"lower": 0.1, "upper": 0.15},
            "intent_band": "Moderate Intent",
            "model_probabilities": {
                "logistic_regression": 0.11,
                "random_forest": 0.13,
                "xgboost": 0.13,
            },
            "ensemble_probability": 0.123,
        }

        with patch("main.predict_click_probability", return_value=expected) as predict_mock:
            response = self.client.post("/predict", json=payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["click_probability_pct"], 12.3)
        predict_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main()
