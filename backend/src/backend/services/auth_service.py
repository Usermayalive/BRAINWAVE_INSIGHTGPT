import logging
from fastapi import HTTPException, status
from backend.core.security import get_password_hash, verify_password, create_access_token
from backend.services.firestore_client import FirestoreClient

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        self.firestore = FirestoreClient()

    async def register_user(self, email: str, password: str, full_name: str):
        # 1. Check if user exists
        user = await self.firestore.get_user_by_email(email)
        if user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # 2. Hash password
        hashed_password = get_password_hash(password)
        
        # 3. Create user in Firestore
        user_data = {
            "email": email,
            "hashed_password": hashed_password,
            "full_name": full_name,
            "is_active": True
        }
        # In a real app we'd likely use Firebase Auth, but here we implement custom auth via Firestore
        # We need a method in FirestoreClient to create a user
        user_id = await self.firestore.create_user(user_data)
        return {"user_id": user_id, "email": email, "full_name": full_name}

    async def login_user(self, email: str, password: str):
        user = await self.firestore.get_user_by_email(email)
        if not user or not verify_password(password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user["email"]})
        return {"access_token": access_token, "token_type": "bearer"}
