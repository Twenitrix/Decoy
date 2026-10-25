import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Identity Drift Detection Control Plane"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dda-security-gateway-master-key-2026")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./dda.db")
    ML_SERVICE_URL: Optional[str] = os.getenv("ML_SERVICE_URL", None)
    SHADOW_MODE: bool = os.getenv("SHADOW_MODE", "false").lower() == "true"
    DEGRADED_MODE: bool = False
    ACTION_AUTH_EXPIRY_SECONDS: int = 60
    APPROVAL_EXPIRY_MINUTES: int = 60

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
