import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.api.v1.api import api_router
from backend.dependencies.services import initialize_services

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("InsightGPT Backend Server has started!")
    # Initialize all singleton services
    await initialize_services()
    yield
    logger.info("InsightGPT Backend Server is shutting down...")


app = FastAPI(
    title="InsightGPT API",
    description="AI-powered document analysis and insights platform",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "InsightGPT Backend is active", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "insightgpt-api"}


def main():
    logger.info("Initializing application...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
