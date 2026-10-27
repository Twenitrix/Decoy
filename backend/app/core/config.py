import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


def _resolve_database_url() -> str:
    default_sqlite = "sqlite:////tmp/dda.db" if os.getenv("VERCEL") else "sqlite:///./dda.db"
    raw_url = os.getenv("DDA_DATABASE_URL") or os.getenv("DATABASE_URL") or default_sqlite
    # Guard against async-only SQLAlchemy URLs (e.g. postgresql+asyncpg) since
    # backend/app/core/database.py uses a synchronous SQLAlchemy Engine.
    if "+asyncpg" in raw_url:
        return default_sqlite
    return raw_url


class Settings(BaseSettings):
    PROJECT_NAME: str = "Identity Drift Detection Control Plane"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dda-security-gateway-master-key-2026")
    DATABASE_URL: str = _resolve_database_url()
    ML_SERVICE_URL: Optional[str] = os.getenv("ML_SERVICE_URL", None)
    SHADOW_MODE: bool = os.getenv("SHADOW_MODE", "false").lower() == "true"
    DEGRADED_MODE: bool = False
    ACTION_AUTH_EXPIRY_SECONDS: int = 60
    APPROVAL_EXPIRY_MINUTES: int = 60

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
# Force synchronous-safe URL even if BaseSettings env lookup populated an asyncpg URL
if "+asyncpg" in settings.DATABASE_URL:
    settings.DATABASE_URL = _resolve_database_url()
