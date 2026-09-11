# ============================================================
# config.py — Central configuration for the AI Face Recognition System
# ============================================================

import os

# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

# InsightFace model pack. "buffalo_l" includes:
#   - RetinaFace (face detection + 5-point landmark alignment)
#   - ArcFace R100 (512-D face embeddings)
# On first run the model weights (~300 MB) are downloaded automatically.
MODEL_NAME = "buffalo_l"

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EMBEDDINGS_DIR = os.path.join(BASE_DIR, "data", "embeddings")
OUTPUT_DIR     = os.path.join(BASE_DIR, "data", "output")
TEST_IMAGES_DIR = os.path.join(BASE_DIR, "data", "test_images")

# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

# Minimum bounding-box short-side in pixels.
# Faces smaller than this are logged as skipped and excluded from embedding.
# Back-row or distant faces tend to produce unreliable embeddings; raising
# this threshold filters them out early.
MIN_FACE_SIZE = 60  # pixels — tune based on your camera / room size

# ---------------------------------------------------------------------------
# Recognition
# ---------------------------------------------------------------------------

# Cosine similarity threshold for positive identification.
#
# ⚠️  IMPORTANT — EXPERIMENTAL VALUE
#     0.45 is a reasonable starting point based on common ArcFace benchmarks,
#     but it has NOT been scientifically validated on your specific dataset
#     (camera, lighting, student diversity, etc.).
#
#     You MUST tune this value empirically:
#       - Too high → legitimate students marked as Unknown (false negatives)
#       - Too low  → different people confused for each other (false positives)
#
#     Suggested tuning approach:
#       1. Register all students with several photos each.
#       2. Run recognition on known images and inspect per-face similarities.
#       3. Adjust threshold to balance false accept / false reject rates.
#
SIMILARITY_THRESHOLD = 0.45
