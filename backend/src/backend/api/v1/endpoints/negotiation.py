from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def read_negotiation():
    return {"message": "Negotiation endpoint"}
