import logging
import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager


from backend.api.v1.api import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("InsightGPT Backend Server has started!")
    yield
    logger.info("InsightGPT Backend Server is shutting down...")

app = FastAPI(lifespan=lifespan)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "InsightGPT Backend is active"}

def main():
    """Entry point for the application script."""
    logger.info("Initializing application...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
