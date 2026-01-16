from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def read_qa():
    return {"message": "QA endpoint"}
