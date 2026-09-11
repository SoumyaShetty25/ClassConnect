"""
attendance/router_auth.py — Authentication endpoints.

Routes:
  POST /auth/bootstrap-admin  — one-time first admin creation
  POST /auth/login             — email + password → JWT (24h)
  POST /auth/change-password   — forced password change (onboarding step 1)
  GET  /me/next-step           — centralized onboarding routing
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from attendance.database import get_db
from attendance.auth import (
    hash_password,
    verify_password,
    create_token,
    get_current_user,
)
from attendance.models import (
    BootstrapAdminRequest,
    LoginRequest,
    LoginResponse,
    ChangePasswordRequest,
    NextStepResponse,
    OnboardingStep,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])


# ---------------------------------------------------------------------------
# POST /auth/bootstrap-admin
# ---------------------------------------------------------------------------

@router.post("/auth/bootstrap-admin")
async def bootstrap_admin(payload: BootstrapAdminRequest):
    """
    Create the very first admin account.
    Only works when the users collection is empty. Returns 403 after.
    """
    db = get_db()

    count = await db.users.count_documents({})
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin bootstrap is disabled — users already exist.",
        )

    normalized_email = payload.email.strip().lower()

    user_doc = {
        "email": normalized_email,
        "passwordHash": hash_password(payload.password),
        "role": "admin",
        "isTemporaryPassword": False,
        "isFirstLoginComplete": True,
        "createdAt": datetime.now(timezone.utc),
    }

    result = await db.users.insert_one(user_doc)
    logger.info("Bootstrap admin created: %s (id=%s)", normalized_email, result.inserted_id)

    return {
        "status": "success",
        "message": f"Admin account created: {normalized_email}",
        "userId": str(result.inserted_id),
    }


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@router.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    """Authenticate with email + password. Returns a JWT (24h expiry)."""
    db = get_db()
    normalized_email = payload.email.strip().lower()

    user = await db.users.find_one({"email": normalized_email})
    if user is None:
        logger.warning("Failed login attempt: user not found for email '%s'", normalized_email)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, user["passwordHash"]):
        logger.warning("Failed login attempt: password mismatch for user '%s'", normalized_email)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    logger.info("Successful login for user '%s' (role: %s)", normalized_email, user["role"])

    token = create_token(
        user_id=str(user["_id"]),
        role=user["role"],
        email=user["email"],
    )

    return LoginResponse(
        token=token,
        role=user["role"],
        email=user["email"],
    )


# ---------------------------------------------------------------------------
# POST /auth/change-password
# ---------------------------------------------------------------------------

@router.post("/auth/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    user: dict = Depends(get_current_user),
):
    """
    Change password. If isTemporaryPassword was true, clears it.
    Validates old password matches before accepting new one.
    """
    db = get_db()

    # Re-fetch to get the hash (get_current_user strips sensitive fields)
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})

    if not verify_password(payload.oldPassword, full_user["passwordHash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if payload.oldPassword == payload.newPassword:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {
            "$set": {
                "passwordHash": hash_password(payload.newPassword),
                "isTemporaryPassword": False,
            }
        },
    )

    logger.info("Password changed for user %s", user["email"])
    return {"status": "success", "message": "Password changed successfully"}


# ---------------------------------------------------------------------------
# GET /me/next-step
# ---------------------------------------------------------------------------

@router.get("/me/next-step", response_model=NextStepResponse)
async def next_step(user: dict = Depends(get_current_user)):
    """
    Centralized onboarding router. Returns the next step the user must complete:
      - password_change   → isTemporaryPassword is true
      - face_registration → student whose face registration isn't completed
      - dashboard         → fully onboarded, proceed to main app
    """
    # Step 1: Password change required?
    if user.get("isTemporaryPassword", False):
        return NextStepResponse(step=OnboardingStep.password_change)

    # Step 2: Face registration required? (students only)
    if user.get("role") == "student":
        db = get_db()
        profile = await db.studentProfiles.find_one({"userId": user["_id"]})
        if profile and profile.get("faceRegistrationStatus", "pending") != "completed":
            return NextStepResponse(step=OnboardingStep.face_registration)

    # Step 3: Fully onboarded
    return NextStepResponse(step=OnboardingStep.dashboard)
