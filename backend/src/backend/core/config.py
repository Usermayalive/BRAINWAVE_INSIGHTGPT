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
        extra="ignore",
        populate_by_name=True
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
    
    # Security Settings
    SECRET_KEY: str = Field(default="dev_secret_key_change_in_production", description="Secret key for JWT")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=10080, description="Token expiration in minutes (7 days)")

    # GCP Settings
    PROJECT_ID: str = Field(default="brainwave-insightgpt", description="GCP Project ID")
    PROJECT_NUMBER: str = Field(default="", description="GCP Project Number")
    REGION: str = Field(default="us-central1", description="GCP Region")
    VERTEX_AI_LOCATION: str = Field(default="us-central1", description="Vertex AI location")
    GOOGLE_APPLICATION_CREDENTIALS: str = Field(default="", description="Path to service account credentials")
    
    # Firestore Settings
    FIRESTORE_DATABASE: str = Field(default="(default)", description="Firestore database name")

    # Document AI Settings
    DOC_AI_LOCATION: str = Field(default="us", description="Document AI location")
    DOC_AI_PROCESSOR_ID: str = Field(default="", description="Document AI Processor ID")

    GEMINI_API_KEY: str = Field(default="", alias="GOOGLE_GENAI_API_KEY", description="Google Gemini API key")
    GEMINI_MODEL: str = Field(default="gemini-2.0-flash", alias="GEMINI_MODEL_NAME", description="Gemini model name")
    EMBEDDING_MODEL: str = Field(default="text-embedding-004", description="Embedding model name")
    
    # Document processing limits
    MAX_FILE_SIZE_MB: int = Field(default=10, description="Maximum file size in MB")
    MAX_PAGES: int = Field(default=100, description="Maximum pages per document")
    MAX_BATCH_SIZE: int = Field(default=10, description="Maximum files per batch upload")
    
    @property
    def max_file_size_bytes(self) -> int:
        """Get maximum file size in bytes."""
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
