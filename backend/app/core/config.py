from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CCAP"
    app_version: str = "0.1.0"
    environment: str = Field(default="local", alias="ENVIRONMENT")
    api_prefix: str = "/api"

    database_url: str = Field(
        default="postgresql+psycopg://ccap:ccap@postgres:5432/ccap",
        alias="DATABASE_URL",
    )
    jwt_secret_key: str = Field(default="change-this-secret-in-production", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    cors_origins: list[str] = Field(
        default=["http://localhost", "http://localhost:4200", "http://localhost:8080"],
        alias="CORS_ORIGINS",
    )
    source_excel_path: Path = Field(
        default=Path("/app/CEKAL DATABASE - FINALIZED 11_7_2025.xlsx"),
        alias="SOURCE_EXCEL_PATH",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

