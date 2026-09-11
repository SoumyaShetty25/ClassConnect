"""
core/registration.py — Student enrollment logic.

Responsibilities:
  - Register a new student by detecting exactly one face in a photo,
    generating its ArcFace embedding, and saving it to disk.
  - Load all registered student embeddings from disk for recognition.

Storage layout:
    data/embeddings/
        <student_name>/          ← one folder per student
            <unix_timestamp>.npy ← one embedding file per registered photo

Why folders instead of flat files?
    A flat layout like  <student_name>_<timestamp>.npy  requires splitting
    on the last underscore to recover the name — which breaks for names that
    contain underscores (e.g. "John_Smith"). Using one folder per student
    makes the student name the folder name itself: zero parsing, zero ambiguity.
"""

import os
import hashlib
import time
import logging
import numpy as np
from typing import Dict, List

from core.detector import detect_faces
from core.embedder import get_embedding
import config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _student_dir(name: str) -> str:
    """Return the embedding directory for *name*, creating it if needed."""
    path = os.path.join(config.EMBEDDINGS_DIR, name)
    os.makedirs(path, exist_ok=True)
    return path


def _image_sha256(image_path: str) -> str:
    """Return the SHA-256 hex digest of the raw bytes of *image_path*."""
    h = hashlib.sha256()
    with open(image_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _existing_hashes(student_name: str) -> set:
    """
    Return the set of SHA-256 hashes already stored for *student_name*.

    Hashes are stored as sidecar `.hash` files alongside each `.npy` file,
    e.g.  1725993600.npy  →  1725993600.hash
    """
    sdir = _student_dir(student_name)
    hashes = set()
    for fname in os.listdir(sdir):
        if fname.endswith(".hash"):
            fpath = os.path.join(sdir, fname)
            with open(fpath, "r") as f:
                hashes.add(f.read().strip())
    return hashes


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def register_student(name: str, image_path: str) -> None:
    """
    Enroll *name* using the face found in *image_path*.

    Validation rules (hard stops):
      - Exactly ONE face must be present in the photo.
        0 faces → rejected (no face to embed).
        2+ faces → rejected (ambiguous — which face belongs to the student?).

    Duplicate guard:
      - The SHA-256 hash of the image file is compared against all previously
        registered hashes for this student. If the exact same image was already
        registered, the operation is skipped with a warning. This is cheap
        (stdlib hashlib, no extra dependencies) and prevents bloating the
        embedding store with redundant data.

    Adds a new student without touching the pretrained InsightFace model or
    modifying any existing student's embeddings.

    Parameters
    ----------
    name : str
        Student identifier (used as the folder name — avoid path separators).
    image_path : str
        Path to a photo containing exactly one face.
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    # ------------------------------------------------------------------
    # Step 1: Duplicate-photo guard
    # ------------------------------------------------------------------
    img_hash = _image_sha256(image_path)
    existing = _existing_hashes(name)
    if img_hash in existing:
        print(f"[Register] ⚠️  This exact image was already registered for '{name}'. Skipping.")
        return

    # ------------------------------------------------------------------
    # Step 2: Detect faces — must be exactly one
    # ------------------------------------------------------------------
    try:
        faces = detect_faces(image_path)
    except RuntimeError as e:
        # detect_faces raises RuntimeError for 0 faces / all-filtered
        raise RuntimeError(f"[Register] Rejected — {e}") from e

    if len(faces) > 1:
        raise RuntimeError(
            f"[Register] Rejected — found {len(faces)} faces in '{image_path}'. "
            f"Registration requires a photo with exactly ONE face."
        )

    # Exactly one face — proceed
    face = faces[0]

    # ------------------------------------------------------------------
    # Step 3: Generate L2-normalized embedding (via embedder — single point)
    # ------------------------------------------------------------------
    emb = get_embedding(face)  # shape (512,), unit norm guaranteed

    # ------------------------------------------------------------------
    # Step 4: Save embedding + hash sidecar
    # ------------------------------------------------------------------
    sdir = _student_dir(name)
    timestamp = int(time.time())
    npy_path  = os.path.join(sdir, f"{timestamp}.npy")
    hash_path = os.path.join(sdir, f"{timestamp}.hash")

    np.save(npy_path, emb)
    with open(hash_path, "w") as f:
        f.write(img_hash)

    print(f"[Register] ✅ Student '{name}' registered successfully.")
    print(f"           Embedding saved → {npy_path}")
    print(f"           Embedding shape : {emb.shape}  |  norm: {np.linalg.norm(emb):.6f}")


def load_all_embeddings() -> Dict[str, List[np.ndarray]]:
    """
    Load all registered student embeddings from disk.

    Returns
    -------
    dict { student_name: [emb1, emb2, ...] }
        Keys are student names (subfolder names under EMBEDDINGS_DIR).
        Values are lists of L2-normalized np.ndarray (512,) embeddings.
        Students with no valid .npy files are excluded with a warning.

    Storage layout:
        data/embeddings/
            John_Smith/         ← subfolder name = student name (no parsing)
                17259936000.npy
                17259937000.npy
            Student_01/
                17259938000.npy
    """
    embeddings_dir = config.EMBEDDINGS_DIR

    if not os.path.isdir(embeddings_dir):
        logger.warning("Embeddings directory does not exist: %s", embeddings_dir)
        return {}

    registered: Dict[str, List[np.ndarray]] = {}

    for entry in sorted(os.scandir(embeddings_dir), key=lambda e: e.name):
        if not entry.is_dir():
            continue  # skip stray files at the top level

        student_name = entry.name
        emb_list: List[np.ndarray] = []

        for fname in sorted(os.listdir(entry.path)):
            if not fname.endswith(".npy"):
                continue
            fpath = os.path.join(entry.path, fname)
            try:
                emb = np.load(fpath).astype(np.float32)
                if emb.shape != (512,):
                    logger.warning("Skipping malformed embedding %s (shape=%s)", fpath, emb.shape)
                    continue
                emb_list.append(emb)
            except Exception as exc:
                logger.warning("Could not load embedding %s: %s", fpath, exc)

        if emb_list:
            registered[student_name] = emb_list
            logger.debug("Loaded %d embedding(s) for '%s'.", len(emb_list), student_name)
        else:
            logger.warning("No valid embeddings found for student '%s' — skipping.", student_name)

    return registered
