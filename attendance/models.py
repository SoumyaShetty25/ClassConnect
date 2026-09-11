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
    rollNumber: Optional[str] = None
    similarity: float
    matched: bool


class PresentStudentDetail(BaseModel):
    studentId: str
    studentName: str
    rollNumber: str = ""
    similarity: float


class AbsentStudentDetail(BaseModel):
    studentId: str
    studentName: str
    rollNumber: str = ""


class AttendanceMarkResponse(BaseModel):
    lectureId: str
    classId: str
    lectureName: str
    date: str
    totalFacesDetected: int
    totalStudents: int
    presentCount: int
    absentCount: int
    unknownCount: int
    attendanceRate: float
    presentStudents: list[PresentStudentDetail]
    absentStudents: list[AbsentStudentDetail]
    results: list[AttendanceMatchResult]


class AttendanceRecordResponse(BaseModel):
    lectureId: str
    classId: str
    className: Optional[str] = None
    lectureName: str = "Lecture"
    date: str
    totalStudents: int = 0
    presentCount: int = 0
    absentCount: int = 0
    attendanceRate: float = 0.0
    presentStudentIds: list[str] = []
    presentStudents: list[PresentStudentDetail] = []
    absentStudents: list[AbsentStudentDetail] = []
    unknownFaceCount: int = 0


class StudentLectureRecord(BaseModel):
    lectureId: str
    lectureName: str
    className: Optional[str] = None
    date: str
    status: str  # "Present" or "Absent"
    similarity: Optional[float] = None


class StudentAttendanceSummary(BaseModel):
    totalLectures: int
    attended: int
    absent: int
    attendancePercentage: float
    lectures: list[StudentLectureRecord]
