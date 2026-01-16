from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def read_chat():
    return {"message": "Chat endpoint"}
