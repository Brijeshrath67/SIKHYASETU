import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_DIR = BASE_DIR / "backend" / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)

APP_NAME = os.getenv("APP_NAME", "SikhyaSetu")
ENVIRONMENT = os.getenv("APP_ENV", "development")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_DIR / 'sikhyasetu.db'}")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
MAX_SYNC_BATCH_SIZE = int(os.getenv("MAX_SYNC_BATCH_SIZE", "50"))

__all__ = [
    "APP_NAME",
    "ENVIRONMENT",
    "DATABASE_URL",
    "API_BASE_URL",
    "DB_DIR",
    "MAX_SYNC_BATCH_SIZE",
]

