"""
Structured logging configuration
"""
import logging
import sys
from typing import Optional
from backend.core.config import get_settings

def setup_logging() -> None:
    """Read logging config from settings and configure the root logger."""
    settings = get_settings()
    
    # Create root logger
    logger = logging.getLogger()
    logger.setLevel(settings.LOG_LEVEL)
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(settings.LOG_LEVEL)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(handler)
    
    # Set levels for third-party libraries to reduce noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the specified name."""
    return logging.getLogger(name)
