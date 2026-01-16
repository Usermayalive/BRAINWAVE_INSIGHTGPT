import logging
import sys
from typing import Dict, Any


def setup_logging(log_level: str = "INFO") -> None:

    class StructuredFormatter(logging.Formatter):
        """Custom formatter for structured logging."""
        
        def format(self, record: logging.LogRecord) -> str:
            # Add common fields
            record.service = "brainwave-insightgpt-api"
            record.version = "0.1.0"
            
            # Format the message
            formatted = super().format(record)
            return formatted
    

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    

    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    

    formatter = StructuredFormatter(
        fmt="%(asctime)s - %(service)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(formatter)
    
    # Add handler to root logger
    root_logger.addHandler(console_handler)
    
    # Configure specific loggers
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("google").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
       return logging.getLogger(name)


class LogContext:
    """Context manager for adding structured logging context."""
    
    def __init__(self, logger: logging.Logger, **context: Any):
        self.logger = logger
        self.context = context
        self.old_factory = None
    
    def __enter__(self):
        self.old_factory = logging.getLogRecordFactory()
        
        def record_factory(*args, **kwargs):
            record = self.old_factory(*args, **kwargs)
            for key, value in self.context.items():
                setattr(record, key, value)
            return record
        
        logging.setLogRecordFactory(record_factory)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        logging.setLogRecordFactory(self.old_factory)


def log_function_call(logger: logging.Logger, func_name: str, **kwargs: Any) -> None:

    sensitive_keys = {"password", "token", "key", "secret", "credential"}
    safe_kwargs = {
        k: v for k, v in kwargs.items()
        if not any(sensitive in k.lower() for sensitive in sensitive_keys)
    }
    
    logger.debug(f"Calling {func_name}", extra={"params": safe_kwargs})


def log_execution_time(logger: logging.Logger, operation: str, duration_ms: float) -> None:
        logger.info(
        f"Operation completed: {operation}",
        extra={"duration_ms": duration_ms, "operation": operation}
    )
