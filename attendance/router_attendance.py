"""
attendance/router_attendance.py — Attendance marking and records.

Routes:
  POST /attendance/mark          — mark attendance from a classroom photo
  GET  /attendance/records       — query attendance records (teacher)
  GET  /attendance/my-records    — student's own attendance records
"""

import logging
import uuid
from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from bson import ObjectId

from attendance.database import get_db
from attendance.auth import get_current_user, require_role
from attendance.face_adapter import (
    detect_and_embed_multiple,
    validate_image_upload,
    cosine_similarity,
    best_match_for_student,
)
from attendance.models import (
    AttendanceMatchResult,
    AttendanceMarkResponse,
    AttendanceRecordResponse,
)

# Import threshold from Face_recognition config (via the patched sys.path)
import config as fr_config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["attendance"])


# ---------------------------------------------------------------------------
# POST /attendance/mark
# ---------------------------------------------------------------------------

@router.post("/mark", response_model=AttendanceMarkResponse)
async def mark_attendance(
    classId: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(require_role("teacher", "admin")),
):
    """
    Mark attendance from a classroom photo.

    1. Detect all faces in the photo → generate embeddings
    2. Load all registered student embeddings for this class from MongoDB
    3. Match using MAX cosine similarity per student
    4. Above threshold → Present, below → Unknown
    5. Store attendance record
    """
    # Validate image
    image_bytes = await validate_image_upload(file)

    # Detect and embed all faces
    query_embeddings = detect_and_embed_multiple(image_bytes)

    if not query_embeddings:
        raise HTTPException(
            status_code=400,
            detail="No faces detected in the classroom photo",
        )

    db = get_db()

    # Verify class exists
    class_doc = await db.classes.find_one({"_id": ObjectId(classId)})
    if class_doc is None:
        raise HTTPException(status_code=404, detail="Class not found")

    # Load all registered student embeddings for this class
    student_ids = class_doc.get("studentIds", [])
    if not student_ids:
        raise HTTPException(
            status_code=400,
            detail="No students registered in this class",
        )

    # Build { student_id: { "name": ..., "embeddings": [...] } }
    registered = {}
    student_names = {}

    for sid in student_ids:
        profile = await db.studentProfiles.find_one({"userId": sid})
        if profile is None:
            continue
        if profile.get("faceRegistrationStatus") != "completed":
            continue

        emb_doc = await db.faceEmbeddings.find_one({"studentId": sid})
        if emb_doc is None or not emb_doc.get("embeddings"):
            continue

        student_embs = [
            np.array(e, dtype=np.float32)
            for e in emb_doc["embeddings"]
        ]
        registered[sid] = student_embs
        student_names[sid] = profile["name"]

    # Match each detected face against registered students
    threshold = fr_config.SIMILARITY_THRESHOLD
    results = []
    present_student_ids = []
    unknown_count = 0

    for query_emb in query_embeddings:
        best_student_id = None
        best_sim = -1.0

        for sid, student_embs in registered.items():
            sim = best_match_for_student(query_emb, student_embs)
            if sim > best_sim:
                best_sim = sim
                best_student_id = sid

        if best_sim >= threshold and best_student_id is not None:
            # Positive match
            if best_student_id not in present_student_ids:
                present_student_ids.append(best_student_id)
            results.append(AttendanceMatchResult(
                studentId=best_student_id,
                studentName=student_names.get(best_student_id, "Unknown"),
                similarity=round(best_sim, 4),
                matched=True,
            ))
        else:
            unknown_count += 1
            results.append(AttendanceMatchResult(
                similarity=round(best_sim, 4),
                matched=False,
            ))

    # Store attendance record
    lecture_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    attendance_doc = {
        "classId": classId,
        "lectureId": lecture_id,
        "date": now.isoformat(),
        "presentStudentIds": present_student_ids,
        "unknownFaceCount": unknown_count,
        "totalFacesDetected": len(query_embeddings),
        "createdBy": user["_id"],
    }
    await db.attendanceRecords.insert_one(attendance_doc)

    logger.info(
        "Attendance marked: class=%s, lecture=%s, present=%d, unknown=%d",
        classId, lecture_id, len(present_student_ids), unknown_count,
    )

    return AttendanceMarkResponse(
        lectureId=lecture_id,
        classId=classId,
        date=now.strftime("%Y-%m-%d"),
        totalFacesDetected=len(query_embeddings),
        presentCount=len(present_student_ids),
        unknownCount=unknown_count,
        results=results,
    )


# ---------------------------------------------------------------------------
# GET /attendance/records
# ---------------------------------------------------------------------------

@router.get("/records", response_model=list[AttendanceRecordResponse])
async def get_records(
    classId: str,
    user: dict = Depends(require_role("teacher", "admin")),
):
    """Query attendance records for a class."""
    db = get_db()

    class_doc = await db.classes.find_one({"_id": ObjectId(classId)})
    class_name = class_doc["name"] if class_doc else None

    records = []
    cursor = db.attendanceRecords.find({"classId": classId}).sort("date", -1)
    async for doc in cursor:
        records.append(AttendanceRecordResponse(
            lectureId=doc["lectureId"],
            classId=doc["classId"],
            className=class_name,
            date=doc["date"],
            presentStudentIds=doc.get("presentStudentIds", []),
            unknownFaceCount=doc.get("unknownFaceCount", 0),
        ))

    return records


# ---------------------------------------------------------------------------
# GET /attendance/my-records
# ---------------------------------------------------------------------------

@router.get("/my-records", response_model=list[AttendanceRecordResponse])
async def get_my_records(
    user: dict = Depends(get_current_user),
):
    """Student queries their own attendance across all classes."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can view their own records")

    db = get_db()
    student_id = user["_id"]

    records = []
    cursor = db.attendanceRecords.find(
        {"presentStudentIds": student_id}
    ).sort("date", -1)

    async for doc in cursor:
        class_doc = await db.classes.find_one({"_id": ObjectId(doc["classId"])})
        records.append(AttendanceRecordResponse(
            lectureId=doc["lectureId"],
            classId=doc["classId"],
            className=class_doc["name"] if class_doc else None,
            date=doc["date"],
            presentStudentIds=doc.get("presentStudentIds", []),
            unknownFaceCount=doc.get("unknownFaceCount", 0),
        ))

    return records
