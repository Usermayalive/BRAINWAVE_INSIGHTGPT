from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from backend.core.config import get_settings
from backend.models.user import TokenData, User
from backend.dependencies.services import get_firestore_client
from backend.services.firestore_client import FirestoreClient

settings = get_settings()

# Required OAuth2 scheme - will fail if no token provided
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# Optional OAuth2 scheme - won't fail if no token
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    firestore: FirestoreClient = Depends(get_firestore_client)
) -> User:
    """Get current authenticated user. Raises 401 if not authenticated."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Using HS256 as hardcoded in security.py
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user_data = await firestore.get_user_by_email(email=token_data.email)
    if user_data is None:
        raise credentials_exception
        
    return User(**user_data)


async def get_current_user_optional(
    token: Annotated[Optional[str], Depends(oauth2_scheme_optional)],
    firestore: FirestoreClient = Depends(get_firestore_client)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.
    Use this for endpoints that can work with or without authentication.
    """
    if token is None:
        return None
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            return None
        token_data = TokenData(email=email)
    except JWTError:
        return None
    
    user_data = await firestore.get_user_by_email(email=token_data.email)
    if user_data is None:
        return None
        
    return User(**user_data)

