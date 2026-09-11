"""
core/detector.py — Face detection using InsightFace (RetinaFace).

Responsibilities:
  - Load the InsightFace FaceAnalysis model (once, on first call).
  - Detect all faces in an image.
  - Filter out faces smaller than MIN_FACE_SIZE (configurable).
  - Return face objects ready for embedding.

This module does NOT generate embeddings. It is intentionally usable
standalone so you can test detection independently of recognition:

    python main.py detect --image data/test_images/classroom.jpg
"""

import cv2
import logging
from typing import Optional

import insightface
from insightface.app import FaceAnalysis

import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level model cache — loaded once, reused across calls
# ---------------------------------------------------------------------------

_app: Optional[FaceAnalysis] = None


def _get_app() -> FaceAnalysis:
    """Load and return the InsightFace FaceAnalysis model (singleton)."""
    global _app
    if _app is None:
        logger.info("Loading InsightFace model '%s' (first-run may download weights)...", config.MODEL_NAME)
        _app = FaceAnalysis(name=config.MODEL_NAME, providers=["CPUExecutionProvider"])
        # det_size controls the input resolution fed to the detector.
        # 640x640 is the standard; larger values improve small-face recall at
        # the cost of speed. Adjust if you need to detect very distant faces.
        _app.prepare(ctx_id=0, det_size=(640, 640))
        logger.info("Model loaded successfully.")
    return _app


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_faces(
    image_path: str,
    min_face_size: Optional[int] = None,
) -> list:
    """
    Detect all faces in *image_path* and return InsightFace Face objects.

    Parameters
    ----------
    image_path : str
        Path to the input image (any format readable by OpenCV).
    min_face_size : int, optional
        Minimum bounding-box short-side in pixels. Faces smaller than this
        are logged and excluded. Defaults to config.MIN_FACE_SIZE.

    Returns
    -------
    list of insightface Face objects
        Each object carries: .bbox (x1,y1,x2,y2), .kps (5 landmarks),
        .embedding (set later by embedder), .det_score (detection confidence).
        Sorted by x-coordinate (left to right) for deterministic ordering.

    Raises
    ------
    FileNotFoundError
        If *image_path* does not exist.
    RuntimeError
        If no faces survive the size filter.
    """
    import os
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    if min_face_size is None:
        min_face_size = config.MIN_FACE_SIZE

    # Read image (OpenCV BGR)
    img = cv2.imread(image_path)
    if img is None:
        raise RuntimeError(f"OpenCV could not read the image: {image_path}")

    app = _get_app()

    # Run RetinaFace detection + landmark detection
    faces = app.get(img)

    if not faces:
        raise RuntimeError(f"No faces detected in: {image_path}")

    # ------------------------------------------------------------------
    # Filter: skip faces whose bounding-box short-side < min_face_size
    # ------------------------------------------------------------------
    kept = []
    skipped = 0
    for face in faces:
        x1, y1, x2, y2 = face.bbox.astype(int)
        short_side = min(x2 - x1, y2 - y1)
        if short_side < min_face_size:
            logger.warning(
                "Skipping small face (short-side=%dpx < min_face_size=%dpx) at bbox [%d,%d,%d,%d]",
                short_side, min_face_size, x1, y1, x2, y2,
            )
            skipped += 1
        else:
            kept.append(face)

    if skipped:
        print(f"[Detector] Skipped {skipped} face(s) smaller than {min_face_size}px.")

    if not kept:
        raise RuntimeError(
            f"No faces passed the size filter (min_face_size={min_face_size}px) in: {image_path}"
        )

    # Sort left-to-right by the x1 coordinate of the bounding box
    kept.sort(key=lambda f: f.bbox[0])

    return kept
