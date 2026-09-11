"""
attendance/models.py — Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Role(str, Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class OnboardingStep(str, Enum):
    password_change = "password_change"
    face_registration = "face_registration"
    dashboard = "dashboard"


class FaceRegStatus(str, Enum):
    pending = "pending"
    partial = "partial"
    completed = "completed"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class BootstrapAdminRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str
    email: str


class ChangePasswordRequest(BaseModel):
    oldPassword: str
    newPassword: str


class NextStepResponse(BaseModel):
    step: OnboardingStep


# ---------------------------------------------------------------------------
# Admin — Account Management
# ---------------------------------------------------------------------------

class CreateAccountRequest(BaseModel):
    name: str
    role: Role
    classId: Optional[str] = None  # required for students, optional for teachers


class CreateAccountResponse(BaseModel):
    email: str
    temporaryPassword: str
    role: str
    userId: str


class StudentStatusItem(BaseModel):
    userId: str
    name: str
    email: str
    rollNumber: str
    classId: Optional[str] = None
    passwordChanged: bool
    faceRegistered: bool
    faceRegistrationStatus: FaceRegStatus = FaceRegStatus.pending


class CreateClassRequest(BaseModel):
    name: str


class ClassResponse(BaseModel):
    id: str
    name: str
    teacherCount: int = 0
    studentCount: int = 0


# ---------------------------------------------------------------------------
# Face Registration
# ---------------------------------------------------------------------------

class ImageResult(BaseModel):
    index: int
    accepted: bool
    reason: Optional[str] = None  # e.g. "0 faces detected", ">1 faces detected"


class FaceRegistrationResponse(BaseModel):
    totalImages: int
    acceptedCount: int
    rejectedCount: int
    results: list[ImageResult]
    status: FaceRegStatus  # completed (≥15 valid) or partial (<15 valid)
    message: str


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

class AttendanceMatchResult(BaseModel):
    studentId: Optional[str] = None
    studentName: Optional[str] = None
    similarity: float
    matched: bool


class AttendanceMarkResponse(BaseModel):
    lectureId: str
    classId: str
    date: str
    totalFacesDetected: int
    presentCount: int
    unknownCount: int
    results: list[AttendanceMatchResult]


class AttendanceRecordResponse(BaseModel):
    lectureId: str
    classId: str
    className: Optional[str] = None
    date: str
    presentStudentIds: list[str]
    unknownFaceCount: int
