from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from backend.core.config import get_settings
from backend.core.security import create_access_token, get_password_hash, verify_password
from backend.dependencies.auth import get_current_user
from backend.dependencies.services import get_firestore_client
from backend.models.user import Token, User, UserCreate
from backend.services.firestore_client import FirestoreClient

router = APIRouter()
settings = get_settings()

@router.post("/register", response_model=User)
async def register(
    user_in: UserCreate,
    firestore: FirestoreClient = Depends(get_firestore_client)
) -> Any:
    """
    Register a new user.
    """
    # Check if user exists
    existing_user = await firestore.get_user_by_email(user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    hashed_password = get_password_hash(user_in.password)
    
    user_data = user_in.model_dump(exclude={"password"})
    user_data["hashed_password"] = hashed_password
    # updated_at will be handled or we can set it here if we want defaults
    
    user_id = await firestore.create_user(user_data)
    
    # Manually construct response since we don't have the full object back from DB yet
    return {
        "id": user_id,
        "email": user_data["email"],
        "full_name": user_data.get("full_name"),
        "is_active": user_data.get("is_active", True),
        "is_superuser": user_data.get("is_superuser", False),
    }

@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    firestore: FirestoreClient = Depends(get_firestore_client)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user_data = await firestore.get_user_by_email(form_data.username)
    if not user_data:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not verify_password(form_data.password, user_data.get("hashed_password")):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data["email"]}, expires_delta=access_token_expires
    )
    
    # Ensure ID is present. FirestoreClient now returns it.
    if "id" not in user_data:
        # Fallback if somehow missing
        user_data["id"] = "unknown"

    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": user_data
    }

@router.get("/me", response_model=User)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)]
) -> Any:
    """
    Get current user.
    """
    return current_user
