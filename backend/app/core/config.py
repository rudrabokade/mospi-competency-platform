from __future__ import annotations

import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "MoSPI AI Competency Platform"
    debug: bool = False

    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./mospi.db")
    database_url_sync: str = os.getenv("DATABASE_URL_SYNC", "sqlite:///./mospi.db")

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # LLM
    llm_provider: str = "openai"  # 'openai' | 'ollama'
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.openai.com/v1"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # iGOT
    igot_api_base_url: str = "https://igot.gov.in/api"
    igot_api_key: str = "stub"

    # Storage
    storage_backend: str = "local"
    local_upload_dir: str = "./uploads"
    s3_bucket: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-south-1"

    # Sentence transformer model
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
