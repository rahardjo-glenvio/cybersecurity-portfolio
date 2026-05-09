"""Application settings loaded from environment / .env file."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    APP_NAME: str = "HeimdallrOsint"
    DEBUG: bool = False
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # --- DB ---
    DATABASE_URL: str = "sqlite:///./heimdallr.db"

    # --- Target ---
    TARGET_DOMAIN: str = "example.com"

    # --- Scheduler ---
    SCAN_INTERVAL_MINUTES: int = 60
    SCAN_ON_STARTUP: bool = False

    # --- Collectors ---
    GITHUB_TOKEN: str = ""
    XPOSEDORNOT_BASE_URL: str = "https://api.xposedornot.com/v1"
    LEAKCHECK_API_KEY: str = ""
    CRTSH_BASE_URL: str = "https://crt.sh"
    PASTEBIN_ENABLED: bool = True

    # --- Google Dork (DDG-backed) ---
    GOOGLE_DORK_ENABLED: bool = True
    GOOGLE_DORK_TIERS: str = "1,2,3"  # comma-sep
    GOOGLE_DORK_DELAY_SECONDS: float = 1.8
    GOOGLE_DORK_MAX_RESULTS: int = 8

    # --- HTTP ---
    HTTP_TIMEOUT_SECONDS: int = 20
    HTTP_MAX_RETRIES: int = 2
    USER_AGENT: str = "HeimdallrOsint/0.1"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
