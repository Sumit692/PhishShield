import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()


class Config:
    """Base application configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY") or "phishshield-secret-production-key-seed-982341"
    ENV = os.environ.get("FLASK_ENV", "production" if os.environ.get("RENDER") or os.environ.get("PORT") else "development")
    DEBUG = os.environ.get("FLASK_DEBUG", "0").lower() in ("1", "true", "yes")

    # Database
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    INSTANCE_DIR = os.path.join(PROJECT_ROOT, "instance")
    os.makedirs(INSTANCE_DIR, exist_ok=True)
    DEFAULT_DB_PATH = os.path.join(INSTANCE_DIR, "phishshield.db")
    raw_db_url = os.environ.get("DATABASE_URL") or f"sqlite:///{DEFAULT_DB_PATH}"
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Session & Cookie Security
    SESSION_COOKIE_NAME = "phishshield_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.environ.get("FLASK_ENV") == "production" or os.environ.get("RENDER") is not None
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    # CORS
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    CORS_ORIGINS = [
        FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]
