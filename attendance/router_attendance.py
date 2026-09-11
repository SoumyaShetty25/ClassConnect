"""
attendance/router_attendance.py — Attendance marking and records.

Routes:
  POST  /attendance/mark                          — mark attendance from a classroom photo
  GET   /attendance/records                       — query attendance records (teacher)
  GET   /attendance/my-records                    — student's own attendance summary + per-lecture status
  PATCH /attendance/records/{lectureId}/override  — teacher manually toggles a student present/absent
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
    PresentStudentDetail,
    AbsentStudentDetail,
    StudentAttendanceSummary,
    StudentLectureRecord,
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
    lectureName: str = Form("Lecture"),
    date: str = Form(None),
    file: UploadFile = File(...),
    user: dict = Depends(require_role("teacher", "admin")),
):
    """
    Mark attendance from a classroom photo.

    1. Detect all faces in the photo → generate embeddings
    2. Load all registered student embeddings for this class from MongoDB
    3. Match using MAX cosine similarity per student
    4. Above threshold → Present, below → Unknown
    5. All enrolled students NOT detected → Absent
    6. Store attendance record with present + absent lists
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

    # Load ALL enrolled students for this class (for absent tracking)
    student_ids = class_doc.get("studentIds", [])
    if not student_ids:
        raise HTTPException(
            status_code=400,
            detail="No students registered in this class",
        )

    # Build { student_id: { "name": ..., "rollNumber": ..., "embeddings": [...] } }
    registered = {}
    student_names = {}
    student_rolls = {}
    all_enrolled_ids = set()

    for sid in student_ids:
        profile = await db.studentProfiles.find_one({"userId": sid})
        if profile is None:
            continue

        all_enrolled_ids.add(sid)
        student_names[sid] = profile.get("name", "Unknown")
        student_rolls[sid] = profile.get("rollNumber", "")

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

    # Match each detected face against registered students
    threshold = fr_config.SIMILARITY_THRESHOLD
    results = []
    present_student_ids = []
    present_students = []
    present_similarities = {}
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
                present_similarities[best_student_id] = round(best_sim, 4)
                present_students.append(PresentStudentDetail(
                    studentId=best_student_id,
                    studentName=student_names.get(best_student_id, "Unknown"),
                    rollNumber=student_rolls.get(best_student_id, ""),
                    similarity=round(best_sim, 4),
                ))
            results.append(AttendanceMatchResult(
                studentId=best_student_id,
                studentName=student_names.get(best_student_id, "Unknown"),
                rollNumber=student_rolls.get(best_student_id, ""),
                similarity=round(best_sim, 4),
                matched=True,
            ))
        else:
            unknown_count += 1
            results.append(AttendanceMatchResult(
                similarity=round(best_sim, 4),
                matched=False,
            ))

    # Build absent list — all enrolled students NOT in present list
    absent_students = []
    for sid in all_enrolled_ids:
        if sid not in present_student_ids:
            absent_students.append(AbsentStudentDetail(
                studentId=sid,
                studentName=student_names.get(sid, "Unknown"),
                rollNumber=student_rolls.get(sid, ""),
            ))

    total_students = len(all_enrolled_ids)
    present_count = len(present_student_ids)
    absent_count = total_students - present_count
    attendance_rate = round((present_count / total_students * 100), 1) if total_students > 0 else 0.0

    # Resolve date
    now = datetime.now(timezone.utc)
    record_date = date if date else now.strftime("%Y-%m-%d")

    # Store attendance record
    lecture_id = str(uuid.uuid4())

    attendance_doc = {
        "classId": classId,
        "lectureId": lecture_id,
        "lectureName": lectureName,
        "date": record_date,
        "createdAt": now.isoformat(),
        "presentStudentIds": present_student_ids,
        "presentStudents": [ps.model_dump() for ps in present_students],
        "absentStudents": [ab.model_dump() for ab in absent_students],
        "totalStudents": total_students,
        "presentCount": present_count,
        "absentCount": absent_count,
        "attendanceRate": attendance_rate,
        "unknownFaceCount": unknown_count,
        "totalFacesDetected": len(query_embeddings),
        "createdBy": user["_id"],
    }
    await db.attendanceRecords.insert_one(attendance_doc)

    logger.info(
        "Attendance marked: class=%s, lecture=%s (%s), present=%d/%d, unknown=%d",
        classId, lecture_id, lectureName, present_count, total_students, unknown_count,
    )

    return AttendanceMarkResponse(
        lectureId=lecture_id,
        classId=classId,
        lectureName=lectureName,
        date=record_date,
        totalFacesDetected=len(query_embeddings),
        totalStudents=total_students,
        presentCount=present_count,
        absentCount=absent_count,
        unknownCount=unknown_count,
        attendanceRate=attendance_rate,
        presentStudents=present_students,
        absentStudents=absent_students,
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
            lectureName=doc.get("lectureName", "Lecture"),
            date=doc["date"],
            totalStudents=doc.get("totalStudents", 0),
            presentCount=doc.get("presentCount", len(doc.get("presentStudentIds", []))),
            absentCount=doc.get("absentCount", 0),
            attendanceRate=doc.get("attendanceRate", 0.0),
            presentStudentIds=doc.get("presentStudentIds", []),
            presentStudents=[
                PresentStudentDetail(**ps) for ps in doc.get("presentStudents", [])
            ],
            absentStudents=[
                AbsentStudentDetail(**ab) for ab in doc.get("absentStudents", [])
            ],
            unknownFaceCount=doc.get("unknownFaceCount", 0),
        ))

    return records


# ---------------------------------------------------------------------------
# GET /attendance/my-records
# ---------------------------------------------------------------------------

@router.get("/my-records", response_model=StudentAttendanceSummary)
async def get_my_records(
    user: dict = Depends(get_current_user),
):
    """
    Student queries their own attendance across all classes.
    Returns a summary with per-lecture status (Present/Absent) and overall percentage.
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can view their own records")

    db = get_db()
    student_id = user["_id"]

    # Get student's class
    profile = await db.studentProfiles.find_one({"userId": student_id})
    if not profile:
        return StudentAttendanceSummary(
            totalLectures=0, attended=0, absent=0,
            attendancePercentage=0.0, lectures=[],
        )

    class_id = profile.get("classId")
    if not class_id:
        return StudentAttendanceSummary(
            totalLectures=0, attended=0, absent=0,
            attendancePercentage=0.0, lectures=[],
        )

    class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
    class_name = class_doc["name"] if class_doc else None

    # Get ALL attendance records for this class (not just where student is present)
    lectures = []
    attended = 0
    cursor = db.attendanceRecords.find({"classId": class_id}).sort("date", -1)

    async for doc in cursor:
        present_ids = doc.get("presentStudentIds", [])
        is_present = student_id in present_ids

        # Try to find similarity score for this student
        sim = None
        if is_present:
            attended += 1
            for ps in doc.get("presentStudents", []):
                if ps.get("studentId") == student_id:
                    sim = ps.get("similarity")
                    break

        lectures.append(StudentLectureRecord(
            lectureId=doc["lectureId"],
            lectureName=doc.get("lectureName", "Lecture"),
            className=class_name,
            date=doc["date"],
            status="Present" if is_present else "Absent",
            similarity=sim,
        ))

    total = len(lectures)
    absent = total - attended
    pct = round((attended / total * 100), 1) if total > 0 else 0.0

    return StudentAttendanceSummary(
        totalLectures=total,
        attended=attended,
        absent=absent,
        attendancePercentage=pct,
        lectures=lectures,
    )


# ---------------------------------------------------------------------------
# PATCH /attendance/records/{lectureId}/override
# ---------------------------------------------------------------------------

from pydantic import BaseModel

class OverrideRequest(BaseModel):
    studentId: str
    action: str  # "mark_present" or "mark_absent"

@router.patch("/records/{lectureId}/override")
async def override_attendance(
    lectureId: str,
    payload: OverrideRequest,
    user: dict = Depends(require_role("teacher", "admin")),
):
    """
    Teacher manually toggles a student between Present / Absent for a given lecture.
    """
    db = get_db()

    record = await db.attendanceRecords.find_one({"lectureId": lectureId})
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    student_id = payload.studentId
    present_ids = record.get("presentStudentIds", [])
    present_students = record.get("presentStudents", [])
    absent_students = record.get("absentStudents", [])

    # Look up student info
    profile = await db.studentProfiles.find_one({"userId": student_id})
    student_name = profile.get("name", "Unknown") if profile else "Unknown"
    roll_number = profile.get("rollNumber", "") if profile else ""

    if payload.action == "mark_present":
        if student_id in present_ids:
            return {"status": "no_change", "message": "Student already marked present"}
        # Move from absent to present
        present_ids.append(student_id)
        present_students.append({
            "studentId": student_id,
            "studentName": student_name,
            "rollNumber": roll_number,
            "similarity": 0.0,  # manual override
        })
        absent_students = [a for a in absent_students if a.get("studentId") != student_id]

    elif payload.action == "mark_absent":
        if student_id not in present_ids:
            return {"status": "no_change", "message": "Student already marked absent"}
        # Move from present to absent
        present_ids = [pid for pid in present_ids if pid != student_id]
        present_students = [p for p in present_students if p.get("studentId") != student_id]
        absent_students.append({
            "studentId": student_id,
            "studentName": student_name,
            "rollNumber": roll_number,
        })
    else:
        raise HTTPException(status_code=400, detail="action must be 'mark_present' or 'mark_absent'")

    total_students = record.get("totalStudents", len(present_ids) + len(absent_students))
    present_count = len(present_ids)
    absent_count = total_students - present_count
    attendance_rate = round((present_count / total_students * 100), 1) if total_students > 0 else 0.0

    await db.attendanceRecords.update_one(
        {"lectureId": lectureId},
        {"$set": {
            "presentStudentIds": present_ids,
            "presentStudents": present_students,
            "absentStudents": absent_students,
            "presentCount": present_count,
            "absentCount": absent_count,
            "attendanceRate": attendance_rate,
        }},
    )

    logger.info(
        "Attendance override: lecture=%s, student=%s, action=%s",
        lectureId, student_id, payload.action,
    )

    return {
        "status": "updated",
        "lectureId": lectureId,
        "studentId": student_id,
        "action": payload.action,
        "presentCount": present_count,
        "absentCount": absent_count,
        "attendanceRate": attendance_rate,
    }
