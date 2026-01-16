from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def read_metrics():
    return {"message": "Metrics endpoint"}
