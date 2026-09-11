"""
main.py — CLI entry point for the AI Classroom Face Recognition System.

Usage
-----
    # Phase 1: Test face detection independently
    python main.py detect --image data/test_images/classroom.jpg

    # Phase 2 / 3: Register a student (exactly one face required)
    python main.py register --name Student_01 --image data/test_images/student01.jpg

    # Phase 4: Recognize faces in a classroom photo (terminal output)
    python main.py recognize --image data/test_images/classroom.jpg

    # Phase 4 + 6: Recognize and save an annotated output image
    python main.py recognize --image data/test_images/classroom.jpg --save

    # Optional overrides
    python main.py detect    --image path/to/img.jpg --min-face-size 40
    python main.py recognize --image path/to/img.jpg --threshold 0.50
    python main.py recognize --image path/to/img.jpg --verbose

Architecture reminder
---------------------
Classroom Image
  → RetinaFace  (core/detector.py)
  → Detect all faces + filter small faces
  → Face alignment (done by InsightFace internally)
  → ArcFace      (core/embedder.py)
  → 512-D L2-normalized embedding
  → Compare with registered student embeddings (core/recognizer.py)
  → Cosine similarity (dot product of unit vectors)
  → Student name / Unknown
"""

import argparse
import logging
import os
import sys

import cv2

import config
from core.detector     import detect_faces
from core.embedder     import get_embedding
from core.recognizer   import recognize_faces
from core.registration import register_student, load_all_embeddings
from utils.image_utils import draw_results, save_annotated_image


# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.WARNING
    logging.basicConfig(
        level=level,
        format="%(levelname)s  %(name)s: %(message)s",
    )


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------

def cmd_detect(args: argparse.Namespace) -> None:
    """
    Phase 1 — Test face detection independently of recognition.

    Prints each detected face's bounding box and detection confidence.
    Use this to verify that RetinaFace can reliably find faces in your
    images before moving on to registration / recognition.
    """
    _setup_logging(args.verbose)

    print(f"\n[Detect] Image : {args.image}")
    print(f"[Detect] Min face size : {args.min_face_size}px\n")

    try:
        faces = detect_faces(args.image, min_face_size=args.min_face_size)
    except (FileNotFoundError, RuntimeError) as e:
        print(f"[Detect] ❌  {e}")
        sys.exit(1)

    print(f"[Detect] ✅  {len(faces)} face(s) detected:\n")
    print(f"  {'#':<4} {'BBox (x1,y1,x2,y2)':<32} {'Det. Score'}")
    print("  " + "-" * 52)

    for i, face in enumerate(faces):
        x1, y1, x2, y2 = face.bbox.astype(int)
        score = getattr(face, "det_score", float("nan"))
        print(f"  {i:<4} ({x1:>4},{y1:>4},{x2:>4},{y2:>4})          {score:.4f}")

    print()


# ---------------------------------------------------------------------------

def cmd_register(args: argparse.Namespace) -> None:
    """
    Phase 3 — Enrol a student.

    Rules enforced inside core/registration.py:
      - Exactly ONE face must be present in the photo.
      - Duplicate photos (same SHA-256 hash) for the same student are skipped.
      - The pretrained InsightFace model is NOT modified.
      - Existing students' embeddings are NOT touched.
    """
    _setup_logging(args.verbose)

    print(f"\n[Register] Name  : {args.name}")
    print(f"[Register] Image : {args.image}\n")

    try:
        register_student(args.name, args.image)
    except (FileNotFoundError, RuntimeError) as e:
        print(f"[Register] ❌  {e}")
        sys.exit(1)


# ---------------------------------------------------------------------------

def cmd_recognize(args: argparse.Namespace) -> None:
    """
    Phase 4 — Identify students in a classroom image.

    Steps:
      1. Detect all faces (RetinaFace).
      2. Generate ArcFace embeddings for each face.
      3. Load all registered student embeddings from data/embeddings/.
      4. Compare each embedding to all registered students (cosine similarity).
      5. Print results table to terminal.
      6. Optionally save an annotated image (--save).
    """
    _setup_logging(args.verbose)

    print(f"\n[Recognize] Image     : {args.image}")
    print(f"[Recognize] Threshold : {args.threshold}  "
          f"(⚠️  experimental — see config.py before deployment)")
    print(f"[Recognize] Min face  : {args.min_face_size}px\n")

    # Step 1 — Detect
    try:
        faces = detect_faces(args.image, min_face_size=args.min_face_size)
    except (FileNotFoundError, RuntimeError) as e:
        print(f"[Recognize] ❌  Detection failed: {e}")
        sys.exit(1)

    print(f"[Recognize] Detected {len(faces)} face(s). Generating embeddings...\n")

    # Step 2 — Embed
    query_embeddings = []
    for face in faces:
        emb = get_embedding(face)
        query_embeddings.append(emb)

    # Step 3 — Load registered students
    registered = load_all_embeddings()

    if not registered:
        print("[Recognize] ⚠️  No registered students found.")
        print(f"            Register students first with:")
        print(f"            python main.py register --name <name> --image <photo>")
        print()
    else:
        print(f"[Recognize] Registered students : {sorted(registered.keys())}")
        print(f"            Embeddings per student : "
              f"{ {k: len(v) for k, v in registered.items()} }\n")

    # Step 4 — Match
    results = recognize_faces(query_embeddings, registered, threshold=args.threshold)

    # Step 5 — Print results table
    print("=" * 60)
    print(f"  {'Face #':<8} {'Name':<25} {'Best Sim':>10}")
    print("  " + "-" * 56)
    for i, (name, sim) in enumerate(results):
        tag = "✅" if name != "Unknown" else "❓"
        print(f"  {tag} {i:<6} {name:<25} {sim:>10.4f}")
    print("=" * 60)

    known   = sum(1 for name, _ in results if name != "Unknown")
    unknown = len(results) - known
    print(f"\n  Identified : {known}  |  Unknown : {unknown}  |  Total : {len(results)}\n")

    # Step 6 — Optionally save annotated image
    if args.save:
        img = cv2.imread(args.image)
        annotated = draw_results(img, faces, results)
        out_path = save_annotated_image(annotated, args.image)
        print(f"[Recognize] 💾  Annotated image saved → {out_path}\n")


# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="main.py",
        description=(
            "AI Classroom Face Recognition System\n"
            "Uses RetinaFace (detection) + ArcFace (embeddings) + Cosine similarity.\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    sub = parser.add_subparsers(dest="command", required=True)

    # --- detect -----------------------------------------------------------
    p_detect = sub.add_parser(
        "detect",
        help="Detect faces in an image (Phase 1 — test detection independently).",
    )
    p_detect.add_argument("--image", required=True, help="Path to input image.")
    p_detect.add_argument(
        "--min-face-size",
        type=int,
        default=config.MIN_FACE_SIZE,
        dest="min_face_size",
        help=f"Minimum face bounding-box short-side in px (default: {config.MIN_FACE_SIZE}).",
    )
    p_detect.add_argument("--verbose", "-v", action="store_true", help="Enable debug logging.")
    p_detect.set_defaults(func=cmd_detect)

    # --- register ---------------------------------------------------------
    p_reg = sub.add_parser(
        "register",
        help="Enrol a student (Phase 3 — must have exactly one face in photo).",
    )
    p_reg.add_argument("--name",  required=True, help="Student name (used as folder name).")
    p_reg.add_argument("--image", required=True, help="Path to student photo (exactly one face).")
    p_reg.add_argument("--verbose", "-v", action="store_true", help="Enable debug logging.")
    p_reg.set_defaults(func=cmd_register)

    # --- recognize --------------------------------------------------------
    p_rec = sub.add_parser(
        "recognize",
        help="Identify students in a classroom image (Phase 4).",
    )
    p_rec.add_argument("--image", required=True, help="Path to classroom image.")
    p_rec.add_argument(
        "--threshold",
        type=float,
        default=config.SIMILARITY_THRESHOLD,
        help=(
            f"Cosine similarity threshold (default: {config.SIMILARITY_THRESHOLD}). "
            "⚠️  Experimental — tune on your dataset before deployment."
        ),
    )
    p_rec.add_argument(
        "--min-face-size",
        type=int,
        default=config.MIN_FACE_SIZE,
        dest="min_face_size",
        help=f"Minimum face bounding-box short-side in px (default: {config.MIN_FACE_SIZE}).",
    )
    p_rec.add_argument(
        "--save",
        action="store_true",
        help="Save an annotated image with bounding boxes and names to data/output/.",
    )
    p_rec.add_argument("--verbose", "-v", action="store_true", help="Enable debug logging.")
    p_rec.set_defaults(func=cmd_recognize)

    return parser


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    # Ensure data directories exist
    os.makedirs(config.EMBEDDINGS_DIR, exist_ok=True)
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)
    os.makedirs(config.TEST_IMAGES_DIR, exist_ok=True)

    args.func(args)


if __name__ == "__main__":
    main()
