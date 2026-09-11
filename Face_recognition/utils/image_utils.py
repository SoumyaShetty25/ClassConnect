"""
utils/image_utils.py — Drawing and saving annotated output images.

Responsibilities:
  - Draw bounding boxes and name labels on a copy of the input image.
  - Save the annotated image to the output directory.
"""

import os
import cv2
import numpy as np
import logging
from typing import List, Tuple

import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Visual styling
# ---------------------------------------------------------------------------

# Bounding box colours (BGR)
COLOR_KNOWN   = (0, 200, 80)   # green  — identified student
COLOR_UNKNOWN = (0, 80, 220)   # orange/red — unrecognised face

FONT       = cv2.FONT_HERSHEY_DUPLEX
FONT_SCALE = 0.65
FONT_THICK = 1
BOX_THICK  = 2
LABEL_PAD  = 6  # pixels of padding inside the label background


def draw_results(
    image: np.ndarray,
    faces: list,
    results: List[Tuple[str, float]],
) -> np.ndarray:
    """
    Draw bounding boxes and name/similarity labels on a copy of *image*.

    Parameters
    ----------
    image : np.ndarray (H, W, 3) BGR
        The original image as loaded by OpenCV.
    faces : list of InsightFace Face objects
        Detected faces (same order as *results*).
    results : list of (name, similarity) tuples
        Recognition results from core.recognizer.recognize_faces().
        Must be the same length as *faces*.

    Returns
    -------
    np.ndarray
        Annotated image (a copy — the original is not modified).
    """
    annotated = image.copy()

    for face, (name, sim) in zip(faces, results):
        x1, y1, x2, y2 = face.bbox.astype(int)
        color = COLOR_KNOWN if name != "Unknown" else COLOR_UNKNOWN

        # Bounding box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, BOX_THICK)

        # Label text:  "Student_01 (0.72)"  or  "Unknown (0.38)"
        label = f"{name} ({sim:.2f})"

        # Measure text size so we can draw a filled background rectangle
        (tw, th), baseline = cv2.getTextSize(label, FONT, FONT_SCALE, FONT_THICK)
        label_y1 = max(y1 - th - LABEL_PAD * 2, 0)
        label_y2 = y1
        label_x2 = x1 + tw + LABEL_PAD * 2

        # Filled label background
        cv2.rectangle(annotated, (x1, label_y1), (label_x2, label_y2), color, -1)

        # White text on the filled background
        cv2.putText(
            annotated,
            label,
            (x1 + LABEL_PAD, label_y2 - LABEL_PAD // 2),
            FONT,
            FONT_SCALE,
            (255, 255, 255),
            FONT_THICK,
            cv2.LINE_AA,
        )

    return annotated


def save_annotated_image(
    annotated: np.ndarray,
    source_image_path: str,
    suffix: str = "_annotated",
) -> str:
    """
    Save *annotated* to the output directory.

    The output filename is derived from the source image name:
        test_images/classroom.jpg  →  data/output/classroom_annotated.jpg

    Parameters
    ----------
    annotated : np.ndarray
        Image returned by draw_results().
    source_image_path : str
        Original image path (used only to derive the output filename).
    suffix : str, optional
        String appended to the stem before the extension.

    Returns
    -------
    str
        Absolute path to the saved file.
    """
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)

    basename = os.path.basename(source_image_path)
    stem, ext = os.path.splitext(basename)
    out_name  = f"{stem}{suffix}{ext}"
    out_path  = os.path.join(config.OUTPUT_DIR, out_name)

    cv2.imwrite(out_path, annotated)
    return out_path
