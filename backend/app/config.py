"""Configuration loaded from environment variables and backend/.env."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(BASE_DIR / ".env")

# Database: sqlite for local/limited deployment (README section 10).
# For an online PostgreSQL deployment set DATABASE_URL, e.g.:
#   postgresql+psycopg://user:pass@host:5432/store
# NOTE: the data layer currently targets SQLite; Postgres migration notes in docs/DEPLOYMENT.md
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", BASE_DIR / "data" / "store.db"))
MEDIA_DIR = Path(os.getenv("MEDIA_DIR", BASE_DIR / "media"))
DATA_DIR = DATABASE_PATH.parent

SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY must be configured with at least 32 characters")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "12"))

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "").strip()

ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",") if o.strip()
]

MAX_IMAGE_MB = int(os.getenv("MAX_IMAGE_MB", "8"))
