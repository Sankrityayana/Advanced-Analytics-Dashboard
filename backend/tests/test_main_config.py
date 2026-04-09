import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import main  # noqa: E402


class MainConfigTests(unittest.TestCase):
    def test_load_cors_origins_from_env(self) -> None:
        with patch.dict(os.environ, {"CORS_ORIGINS": "https://a.example, https://b.example "}, clear=False):
            origins = main._load_cors_origins()

        self.assertEqual(origins, ["https://a.example", "https://b.example"])

    def test_load_cors_origins_fallback_when_empty(self) -> None:
        with patch.dict(os.environ, {"CORS_ORIGINS": " ,  , "}, clear=False):
            origins = main._load_cors_origins()

        self.assertEqual(origins, ["http://localhost:5173", "http://127.0.0.1:5173"])


if __name__ == "__main__":
    unittest.main()
