"""
attendance/face_adapter.py — Adapter bridging Face_recognition/core/ into ClassConnect.

Problem:
  Face_recognition/core/detector.py does `import config` (bare import).
  When running from the ClassConnect root, Python can't find `config` because
  it lives in Face_recognition/, not on sys.path.

Solution:
  This module inserts Face_recognition/ into sys.path ONCE at import time,
  then re-exports the functions we need. All other attendance modules import
  from here — never directly from Face_recognition.core.

Also provides bytes-based wrappers since the web frontend sends images as
binary data, not file paths.
"""

import sys
import os
import tempfile
import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Fix import path for Face_recognition/core/ modules
# ---------------------------------------------------------------------------

_FR_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Face_recognition")

if _FR_DIR not in sys.path:
    sys.path.insert(0, _FR_DIR)
    logger.info("Added %s to sys.path for Face_recognition imports", _FR_DIR)

# Now these bare imports work (detector.py → `import config` finds Face_recognition/config.py)
from core.detector import detect_faces          # noqa: E402
from core.embedder import get_embedding          # noqa: E402
from core.recognizer import (                    # noqa: E402
    cosine_similarity,
    best_match_for_student,
    recognize_faces,
)

# Re-export for clean imports elsewhere
__all__ = [
    "detect_faces",
    "get_embedding",
    "cosine_similarity",
    "best_match_for_student",
    "recognize_faces",
    "detect_faces_from_bytes",
    "detect_and_embed_from_bytes",
    "detect_and_embed_multiple",
    "validate_image_upload",
]


# ---------------------------------------------------------------------------
# File validation
# ---------------------------------------------------------------------------

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


async def validate_image_upload(file) -> bytes:
    """
    Validate an uploaded image file (content-type + size).

    Parameters
    ----------
    file : fastapi.UploadFile

    Returns
    -------
    bytes : the raw image data

    Raises
    ------
    HTTPException(400) on invalid content-type or oversized file.
    """
    from fastapi import HTTPException

    # Check content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type: {file.content_type}. "
                   f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    data = await file.read()

    # Check size
    if len(data) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large: {len(data)} bytes. Max: {MAX_IMAGE_SIZE_BYTES} bytes (5 MB).",
        )

    return data


# ---------------------------------------------------------------------------
# Bytes-based wrappers
# ---------------------------------------------------------------------------

def detect_faces_from_bytes(
    image_bytes: bytes,
    min_face_size: Optional[int] = None,
) -> list:
    """
    Detect faces from raw image bytes.

    Saves bytes to a temp file, calls detect_faces(), and cleans up.
    Returns list of InsightFace Face objects (may be empty if detection fails).
    Does NOT raise on 0 faces — returns empty list instead, so callers can
    handle the 0-face case with their own logic (reject vs. skip).
    """
    fd, tmp_path = tempfile.mkstemp(suffix=".jpg")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(image_bytes)

        faces = detect_faces(tmp_path, min_face_size=min_face_size)
        return faces
    except RuntimeError as e:
        # detect_faces raises RuntimeError for 0 faces or all filtered
        if "No faces" in str(e):
            return []
        raise
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def detect_and_embed_from_bytes(
    image_bytes: bytes,
) -> tuple[int, list[np.ndarray]]:
    """
    Detect faces and generate embeddings from raw image bytes.

    Returns
    -------
    (face_count, embeddings)
        face_count : int — number of faces detected
        embeddings : list of np.ndarray (512,) — one per face
    """
    faces = detect_faces_from_bytes(image_bytes)
    face_count = len(faces)

    embeddings = []
    for face in faces:
        emb = get_embedding(face)
        embeddings.append(emb)

    return face_count, embeddings


def detect_and_embed_multiple(
    image_bytes: bytes,
) -> list[np.ndarray]:
    """
    Detect ALL faces in an image and return their embeddings.
    For attendance marking (multi-face classroom photos).

    Returns list of 512-D embeddings (may be empty if no faces detected).
    """
    _, embeddings = detect_and_embed_from_bytes(image_bytes)
    return embeddings
