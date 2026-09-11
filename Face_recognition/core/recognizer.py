"""
core/recognizer.py — Cosine similarity matching against registered students.

⚠️  NORMALIZATION CONTRACT (read before modifying this module):
    All embeddings passed into these functions MUST already be L2-normalized
    (unit norm). This is guaranteed by core.embedder.get_embedding().

    Cosine similarity of two unit vectors = their dot product.
    Therefore cosine_similarity() is implemented as np.dot(a, b).

    DO NOT add normalization steps here. Doing so would be redundant at best
    and would introduce subtle numerical errors if inputs ever deviate from
    unit norm (the re-normalization would mask the root cause).

    Similarly, DO NOT compute similarity as  1 - cosine_distance.
    We use cosine SIMILARITY consistently throughout (higher = more similar).
    Range: [-1, 1], where 1 = identical direction, 0 = orthogonal, -1 = opposite.
"""

import numpy as np
import logging
from typing import Dict, List, Tuple

import config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Core similarity primitive
# ---------------------------------------------------------------------------

def cosine_similarity(emb_a: np.ndarray, emb_b: np.ndarray) -> float:
    """
    Compute cosine similarity between two L2-normalized embeddings.

    Parameters
    ----------
    emb_a, emb_b : np.ndarray, shape (512,)
        Unit-norm embeddings from core.embedder.get_embedding().
        MUST be L2-normalized. DO NOT normalize inside this function.

    Returns
    -------
    float in [-1.0, 1.0]
        1.0  → identical direction (same person)
        0.0  → orthogonal
        -1.0 → opposite direction (very different)
    """
    return float(np.dot(emb_a, emb_b))


# ---------------------------------------------------------------------------
# Per-student best-match helper
# ---------------------------------------------------------------------------

def best_match_for_student(
    query_emb: np.ndarray,
    student_embeddings: List[np.ndarray],
) -> float:
    """
    Return the highest cosine similarity between *query_emb* and any of
    *student_embeddings* (a student may have multiple registered photos).

    Parameters
    ----------
    query_emb : np.ndarray, shape (512,)
        Unit-norm embedding of the face being identified.
    student_embeddings : list of np.ndarray
        All registered unit-norm embeddings for one student.

    Returns
    -------
    float
        Best (maximum) cosine similarity score for this student.
    """
    return max(cosine_similarity(query_emb, ref) for ref in student_embeddings)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def recognize_faces(
    query_embeddings: List[np.ndarray],
    registered: Dict[str, List[np.ndarray]],
    threshold: float = None,
) -> List[Tuple[str, float]]:
    """
    Identify each face in *query_embeddings* against *registered* students.

    Parameters
    ----------
    query_embeddings : list of np.ndarray, shape (512,)
        Unit-norm embeddings of detected faces (one per face).
    registered : dict {student_name: [emb1, emb2, ...]}
        All registered student embeddings. Values are lists because a student
        may have multiple enrolled photos.
    threshold : float, optional
        Cosine similarity threshold for positive identification.
        Defaults to config.SIMILARITY_THRESHOLD.

    Returns
    -------
    list of (name, best_similarity) tuples, same length as *query_embeddings*
        name            : student name, or "Unknown" if below threshold
        best_similarity : the winning cosine similarity score (for inspection)

    Notes
    -----
    - The closest match is NEVER forced. If no registered student meets the
      threshold, the result is "Unknown".
    - With an empty *registered* dict every face is "Unknown".
    """
    if threshold is None:
        threshold = config.SIMILARITY_THRESHOLD

    results: List[Tuple[str, float]] = []

    if not registered:
        logger.warning("No registered students found — all faces will be Unknown.")
        return [("Unknown", 0.0)] * len(query_embeddings)

    for idx, query_emb in enumerate(query_embeddings):
        best_name = "Unknown"
        best_sim = -1.0  # cosine similarity range is [-1, 1]

        for student_name, student_embs in registered.items():
            sim = best_match_for_student(query_emb, student_embs)
            if sim > best_sim:
                best_sim = sim
                best_name = student_name

        # Apply threshold — never force a match
        if best_sim < threshold:
            logger.info(
                "Face %d: best match '%s' (sim=%.4f) below threshold %.2f → Unknown",
                idx, best_name, best_sim, threshold,
            )
            results.append(("Unknown", best_sim))
        else:
            logger.info(
                "Face %d: identified as '%s' (sim=%.4f, threshold=%.2f)",
                idx, best_name, best_sim, threshold,
            )
            results.append((best_name, best_sim))

    return results
