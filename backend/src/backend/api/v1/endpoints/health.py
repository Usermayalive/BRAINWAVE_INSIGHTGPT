from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def check_health():
    return {"status": "healthy"}
