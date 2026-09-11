"""
attendance/router_registration.py — Face registration endpoints.

Routes:
  POST /face/register  — upload up to 20 images for face registration
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from bson import ObjectId

from attendance.database import get_db
from attendance.auth import get_current_user
from attendance.face_adapter import (
    detect_and_embed_from_bytes,
    validate_image_upload,
)
from attendance.models import (
    FaceRegistrationResponse,
    ImageResult,
    FaceRegStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/face", tags=["face-registration"])

# Minimum valid embeddings for faceRegistrationStatus: completed
MIN_VALID_EMBEDDINGS = 15
MAX_IMAGES_PER_REQUEST = 20


# ---------------------------------------------------------------------------
# POST /face/register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=FaceRegistrationResponse)
async def register_faces(
    files: List[UploadFile] = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Receive up to 20 face images for registration.

    Each image is validated (type + size), then processed:
      - 0 faces → rejected (reason: "No face detected")
      - >1 faces → rejected (reason: "Multiple faces detected")
      - 1 face → accepted, embedding extracted and stored

    Status becomes 'completed' only when ≥15 valid embeddings are stored.
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can register faces")

    if len(files) > MAX_IMAGES_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_IMAGES_PER_REQUEST} images per request",
        )

    db = get_db()
    profile = await db.studentProfiles.find_one({"userId": user["_id"]})
    if profile is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    results: list[ImageResult] = []
    new_embeddings: list[list[float]] = []

    for idx, file in enumerate(files):
        # Validate file type + size
        try:
            image_bytes = await validate_image_upload(file)
        except HTTPException as e:
            results.append(ImageResult(
                index=idx,
                accepted=False,
                reason=f"File validation failed: {e.detail}",
            ))
            continue

        # Detect and embed
        try:
            face_count, embeddings = detect_and_embed_from_bytes(image_bytes)
        except Exception as e:
            results.append(ImageResult(
                index=idx,
                accepted=False,
                reason=f"Processing error: {str(e)}",
            ))
            continue

        if face_count == 0:
            results.append(ImageResult(
                index=idx,
                accepted=False,
                reason="No face detected in image",
            ))
        elif face_count > 1:
            results.append(ImageResult(
                index=idx,
                accepted=False,
                reason=f"Multiple faces detected ({face_count}). Registration requires exactly 1 face per image.",
            ))
        else:
            # Exactly 1 face — accepted
            new_embeddings.append(embeddings[0].tolist())
            results.append(ImageResult(
                index=idx,
                accepted=True,
            ))

    # Store embeddings in MongoDB
    student_id = user["_id"]
    accepted_count = len(new_embeddings)

    if accepted_count > 0:
        # Upsert: append new embeddings to existing ones
        existing_doc = await db.faceEmbeddings.find_one({"studentId": student_id})

        if existing_doc:
            existing_embs = existing_doc.get("embeddings", [])
            all_embeddings = existing_embs + new_embeddings
            await db.faceEmbeddings.update_one(
                {"studentId": student_id},
                {
                    "$set": {
                        "embeddings": all_embeddings,
                        "imageCount": len(all_embeddings),
                    }
                },
            )
            total_valid = len(all_embeddings)
        else:
            await db.faceEmbeddings.insert_one({
                "studentId": student_id,
                "embeddings": new_embeddings,
                "imageCount": accepted_count,
            })
            total_valid = accepted_count

        # Update profile
        reg_status = "completed" if total_valid >= MIN_VALID_EMBEDDINGS else "partial"
        await db.studentProfiles.update_one(
            {"userId": student_id},
            {
                "$set": {
                    "faceRegistrationStatus": reg_status,
                    "faceImagesCaptured": total_valid,
                }
            },
        )
    else:
        # No new embeddings — check existing count
        existing_doc = await db.faceEmbeddings.find_one({"studentId": student_id})
        total_valid = len(existing_doc["embeddings"]) if existing_doc else 0
        reg_status = "completed" if total_valid >= MIN_VALID_EMBEDDINGS else (
            "partial" if total_valid > 0 else "pending"
        )

    rejected_count = len(files) - accepted_count

    status_enum = FaceRegStatus(reg_status)

    if status_enum == FaceRegStatus.completed:
        message = f"Face registration complete! {total_valid} embeddings stored."
    elif status_enum == FaceRegStatus.partial:
        remaining = MIN_VALID_EMBEDDINGS - total_valid
        message = (
            f"{accepted_count} images accepted this batch. "
            f"Total: {total_valid} embeddings. Need {remaining} more to complete registration."
        )
    else:
        message = f"No valid images accepted. Please retake all {len(files)} images."

    return FaceRegistrationResponse(
        totalImages=len(files),
        acceptedCount=accepted_count,
        rejectedCount=rejected_count,
        results=results,
        status=status_enum,
        message=message,
    )
