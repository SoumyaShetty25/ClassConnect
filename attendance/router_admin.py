"""
attendance/router_admin.py — Admin-only endpoints.

Routes:
  POST /admin/create-account  — create student or teacher account
  GET  /admin/students        — list all students with onboarding status
  POST /admin/create-class    — create a class
  GET  /admin/classes         — list all classes
"""

import logging
import secrets
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from attendance.database import get_db
from attendance.auth import hash_password, require_role
from attendance.models import (
    CreateAccountRequest,
    CreateAccountResponse,
    StudentStatusItem,
    CreateClassRequest,
    ClassResponse,
    Role,
    FaceRegStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_email(name: str) -> str:
    """
    Generate a college email from a name.
    'John Doe' → 'john.doe@classconnect.edu'
    Handles multi-word names and strips special characters.
    """
    parts = name.strip().lower().split()
    # Filter out empty parts and non-alpha characters
    clean = [
        "".join(c for c in part if c.isalnum())
        for part in parts
        if part
    ]
    if not clean:
        raise HTTPException(status_code=400, detail="Name must contain at least one word")
    return ".".join(clean) + "@classconnect.edu"


def _generate_temp_password(length: int = 10) -> str:
    """Generate a random temporary password."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _generate_roll_number() -> str:
    """Generate a unique roll number like 'CC-20260911-XXXX'."""
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_part = "".join(secrets.choice(string.digits) for _ in range(4))
    return f"CC-{date_part}-{random_part}"


# ---------------------------------------------------------------------------
# POST /admin/create-account
# ---------------------------------------------------------------------------

@router.post("/create-account", response_model=CreateAccountResponse)
async def create_account(
    payload: CreateAccountRequest,
    admin: dict = Depends(require_role("admin")),
):
    """
    Create a student or teacher account.
    Auto-generates email + temp password. Returns both in the response
    for the admin to relay manually (no email delivery for now).
    """
    db = get_db()

    email = _generate_email(payload.name).strip().lower()

    # Check for email collision
    existing = await db.users.find_one({"email": email})
    if existing:
        # Append a random suffix to make unique
        suffix = "".join(secrets.choice(string.digits) for _ in range(3))
        base = email.split("@")[0]
        email = f"{base}{suffix}@classconnect.edu"

    temp_password = _generate_temp_password()

    # Create the user document
    user_doc = {
        "email": email,
        "passwordHash": hash_password(temp_password),
        "role": payload.role.value,
        "isTemporaryPassword": True,
        "isFirstLoginComplete": False,
        "createdAt": datetime.now(timezone.utc),
    }
    user_result = await db.users.insert_one(user_doc)
    user_id = str(user_result.inserted_id)

    # Create the profile document
    if payload.role == Role.student:
        if not payload.classId:
            # Roll back user creation
            await db.users.delete_one({"_id": user_result.inserted_id})
            raise HTTPException(
                status_code=400,
                detail="classId is required for student accounts",
            )

        roll_number = _generate_roll_number()
        profile_doc = {
            "userId": user_id,
            "name": payload.name,
            "rollNumber": roll_number,
            "classId": payload.classId,
            "faceRegistrationStatus": "pending",
            "faceImagesCaptured": 0,
            "faceEmbeddingId": None,
        }
        await db.studentProfiles.insert_one(profile_doc)

        # Add student to the class's studentIds
        await db.classes.update_one(
            {"_id": ObjectId(payload.classId)},
            {"$addToSet": {"studentIds": user_id}},
        )

        logger.info(
            "Student account created: %s (roll: %s, class: %s)",
            email, roll_number, payload.classId,
        )

    elif payload.role == Role.teacher:
        profile_doc = {
            "userId": user_id,
            "name": payload.name,
            "classIds": [payload.classId] if payload.classId else [],
        }
        await db.teacherProfiles.insert_one(profile_doc)

        # Add teacher to the class's teacherIds
        if payload.classId:
            await db.classes.update_one(
                {"_id": ObjectId(payload.classId)},
                {"$addToSet": {"teacherIds": user_id}},
            )

        logger.info("Teacher account created: %s", email)
    else:
        raise HTTPException(status_code=400, detail="Cannot create admin accounts via this endpoint")

    return CreateAccountResponse(
        email=email,
        temporaryPassword=temp_password,
        role=payload.role.value,
        userId=user_id,
    )


# ---------------------------------------------------------------------------
# GET /admin/students
# ---------------------------------------------------------------------------

@router.get("/students", response_model=list[StudentStatusItem])
async def list_students(
    admin: dict = Depends(require_role("admin")),
):
    """List all students with their onboarding status."""
    db = get_db()

    students = []
    async for profile in db.studentProfiles.find():
        user = await db.users.find_one({"_id": ObjectId(profile["userId"])})
        if user is None:
            continue

        students.append(StudentStatusItem(
            userId=profile["userId"],
            name=profile["name"],
            email=user["email"],
            rollNumber=profile["rollNumber"],
            classId=profile.get("classId"),
            passwordChanged=not user.get("isTemporaryPassword", True),
            faceRegistered=profile.get("faceRegistrationStatus") == "completed",
            faceRegistrationStatus=FaceRegStatus(
                profile.get("faceRegistrationStatus", "pending")
            ),
        ))

    return students


# ---------------------------------------------------------------------------
# POST /admin/create-class
# ---------------------------------------------------------------------------

@router.post("/create-class", response_model=ClassResponse)
async def create_class(
    payload: CreateClassRequest,
    admin: dict = Depends(require_role("admin")),
):
    """Create a new class."""
    db = get_db()

    class_doc = {
        "name": payload.name,
        "teacherIds": [],
        "studentIds": [],
        "createdAt": datetime.now(timezone.utc),
    }
    result = await db.classes.insert_one(class_doc)

    logger.info("Class created: %s (id=%s)", payload.name, result.inserted_id)

    return ClassResponse(
        id=str(result.inserted_id),
        name=payload.name,
        teacherCount=0,
        studentCount=0,
    )


# ---------------------------------------------------------------------------
# GET /admin/classes
# ---------------------------------------------------------------------------

@router.get("/classes", response_model=list[ClassResponse])
async def list_classes(
    admin: dict = Depends(require_role("admin", "teacher")),
):
    """List all classes."""
    db = get_db()

    classes = []
    async for cls in db.classes.find():
        classes.append(ClassResponse(
            id=str(cls["_id"]),
            name=cls["name"],
            teacherCount=len(cls.get("teacherIds", [])),
            studentCount=len(cls.get("studentIds", [])),
        ))

    return classes
