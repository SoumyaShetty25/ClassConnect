"""
attendance/auth.py — Authentication utilities.

- Password hashing (bcrypt directly — passlib has compatibility issues with
  bcrypt 4.x on Python 3.14)
- JWT creation / verification (24-hour expiry via python-jose)
- FastAPI dependencies: get_current_user(), require_role()
- Backend onboarding enforcement: blocks all endpoints except
  /auth/change-password and /me/next-step while isTemporaryPassword is true
"""

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from attendance.database import get_db

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

JWT_SECRET = os.getenv("JWT_SECRET", "classconnect-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


def hash_password(plain: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_token(user_id: str, role: str, email: str) -> str:
    """Create a JWT with 24-hour expiry."""
    payload = {
        "sub": user_id,
        "role": role,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises on invalid/expired tokens."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# FastAPI Dependencies
# ---------------------------------------------------------------------------

security = HTTPBearer()

# Paths that are allowed even when isTemporaryPassword is true
_ONBOARDING_ALLOWED_PATHS = {
    "/auth/change-password",
    "/me/next-step",
}


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Decode the JWT, fetch the user from MongoDB, and return the user document.

    Also enforces onboarding: if isTemporaryPassword is true and the request
    path is NOT in the allowed set, returns 403.
    """
    payload = decode_token(credentials.credentials)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing subject")

    db = get_db()
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(user_id)})

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    # --- Backend onboarding enforcement ---
    if user.get("isTemporaryPassword", False):
        if request.url.path not in _ONBOARDING_ALLOWED_PATHS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Password change required before accessing this resource",
            )

    # Attach string ID for convenience
    user["_id"] = str(user["_id"])
    return user


def require_role(*roles: str):
    """
    Factory: returns a dependency that checks the user has one of the given roles.

    Usage:
        @router.get("/admin/students", dependencies=[Depends(require_role("admin"))])
    """
    async def _check(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {', '.join(roles)}",
            )
        return user
    return _check
