from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def read_documents():
    return {"message": "Documents endpoint"}
