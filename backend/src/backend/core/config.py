"""
Application configuration using Pydantic Settings
"""
from typing import List
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )
    
    # Basic server settings
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    WORKERS: int = Field(default=1, description="Number of worker processes")
    DEBUG: bool = Field(default=False, description="Debug mode")
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    
    # API settings
    API_V1_STR: str = Field(default="/api/v1", description="API v1 prefix")

    # GCP Settings
    PROJECT_ID: str = Field(default="legalease-ai", description="GCP Project ID")
    REGION: str = Field(default="us-central1", description="GCP Region")
    GOOGLE_APPLICATION_CREDENTIALS: str = Field(default="", description="Path to service account credentials")
    FIRESTORE_DATABASE: str = Field(default="(default)", description="Firestore database name")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
