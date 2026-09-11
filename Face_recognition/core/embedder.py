"""
core/embedder.py — ArcFace face embedding generation.

Responsibilities:
  - Accept a detected InsightFace Face object.
  - Return a 512-dimensional, L2-normalized embedding vector.

⚠️  NORMALIZATION CONTRACT (read before modifying this module):
    L2-normalization is applied HERE and ONLY HERE, immediately before
    returning. The returned numpy array is guaranteed to have unit norm
    (np.linalg.norm(embedding) ≈ 1.0).

    Downstream code (recognizer.py) MUST NOT normalize again.
    Cosine similarity of two unit vectors is simply their dot product,
    so recognizer.py uses np.dot() — not a full cosine computation.
    Adding a second normalization step would be invisible at first glance
    but would silently corrupt similarity scores if the input is ever
    non-unit for some reason.
"""

import numpy as np
import logging

logger = logging.getLogger(__name__)


def get_embedding(face) -> np.ndarray:
    """
    Extract and return the L2-normalized ArcFace embedding for *face*.

    Parameters
    ----------
    face : insightface Face object
        A face returned by core.detector.detect_faces(). InsightFace
        populates face.embedding automatically during app.get().

    Returns
    -------
    np.ndarray, shape (512,), dtype float32
        L2-normalized embedding vector. Unit norm is guaranteed.

    Raises
    ------
    ValueError
        If the face object has no embedding (e.g. model pack missing ArcFace).
    """
    if face.embedding is None:
        raise ValueError(
            "Face object has no embedding. "
            "Ensure you are using a model pack that includes ArcFace (e.g. 'buffalo_l')."
        )

    emb = np.array(face.embedding, dtype=np.float32)

    # --- Single L2-normalization point ---
    norm = np.linalg.norm(emb)
    if norm == 0.0:
        raise ValueError("Embedding has zero norm — this face crop may be invalid.")
    emb = emb / norm

    logger.debug("Embedding generated. Shape=%s, norm=%.6f", emb.shape, np.linalg.norm(emb))

    return emb  # shape (512,), unit norm guaranteed
