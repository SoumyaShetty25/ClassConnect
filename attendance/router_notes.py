"""
attendance/router_notes.py — Course Notes & PYQ (Previous Year Questions) management.

Routes:
  POST   /notes/upload              — Upload a PDF (notes or PYQ)
  GET    /notes                     — List all uploaded documents (filterable)
  GET    /notes/{noteId}/download   — Download original PDF
  DELETE /notes/{noteId}            — Delete a note/PYQ and its ChromaDB chunks
"""

import io
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import Response
from bson import ObjectId
from pypdf import PdfReader

from attendance.database import get_db
from attendance.auth import get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notes", tags=["notes"])

# These will be injected from main.py at startup
_embedder = None
_notes_collection = None  # ChromaDB collection for course notes
_pyq_collection = None    # ChromaDB collection for PYQs

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


def init_notes_router(embedder, notes_collection, pyq_collection):
    """Called from main.py to inject shared resources."""
    global _embedder, _notes_collection, _pyq_collection
    _embedder = embedder
    _notes_collection = notes_collection
    _pyq_collection = pyq_collection


def _chunk_text(text: str) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append(text[start:end])
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


# ---------------------------------------------------------------------------
# POST /notes/upload
# ---------------------------------------------------------------------------

@router.post("/upload")
async def upload_note(
    file: UploadFile = File(...),
    title: str = Form(None),
    classId: str = Form(None),
    type: str = Form("notes"),  # "notes" or "pyq"
    user: dict = Depends(require_role("teacher", "admin")),
):
    """
    Upload a PDF file as course notes or PYQ.
    - Extracts text, chunks with overlap, embeds into ChromaDB.
    - Stores original PDF binary + metadata in MongoDB.
    """
    if type not in ("notes", "pyq"):
        raise HTTPException(status_code=400, detail="type must be 'notes' or 'pyq'")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    content = await file.read()

    # Extract text from PDF
    try:
        reader = PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")

    if not text:
        raise HTTPException(status_code=400, detail="PDF contains no readable text.")

    # Chunk and embed
    chunks = _chunk_text(text)
    embeddings = _embedder.encode(chunks).tolist()

    note_id = str(uuid.uuid4())
    ids = [f"{note_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {"source": file.filename, "noteId": note_id, "type": type, "chunk_index": i}
        for i in range(len(chunks))
    ]

    # Store in the correct ChromaDB collection
    target_collection = _pyq_collection if type == "pyq" else _notes_collection
    target_collection.upsert(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)

    # Also upsert into the main notes collection for Socratic access (notes only)
    # PYQs go to their own collection exclusively

    # Look up user profile for uploader name
    db = get_db()
    user_id = str(user["_id"])
    uploader_name = "Unknown"
    profile = await db.teacherProfiles.find_one({"userId": user_id})
    if profile:
        uploader_name = profile.get("name", "Unknown")
    else:
        profile = await db.studentProfiles.find_one({"userId": user_id})
        if profile:
            uploader_name = profile.get("name", "Unknown")
        elif user.get("email") == "admin@classconnect.edu":
            uploader_name = "Admin"

    # Look up class name if classId provided
    class_name = None
    if classId:
        cls = await db.classes.find_one({"_id": ObjectId(classId)})
        if cls:
            class_name = cls.get("name")

    auto_title = title or file.filename.replace(".pdf", "").replace("_", " ").title()

    # Store in MongoDB
    doc = {
        "noteId": note_id,
        "title": auto_title,
        "type": type,
        "filename": file.filename,
        "classId": classId,
        "className": class_name,
        "uploaderId": user_id,
        "uploaderName": uploader_name,
        "fileSizeBytes": len(content),
        "chunkCount": len(chunks),
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
        "pdfBinary": content,
    }
    await db.courseNotes.insert_one(doc)

    logger.info("Uploaded %s '%s' (%d chunks) by %s", type, auto_title, len(chunks), uploader_name)

    return {
        "noteId": note_id,
        "title": auto_title,
        "type": type,
        "filename": file.filename,
        "chunkCount": len(chunks),
        "fileSizeBytes": len(content),
        "message": f"Uploaded and indexed {len(chunks)} chunks from '{auto_title}'.",
    }


# ---------------------------------------------------------------------------
# GET /notes
# ---------------------------------------------------------------------------

@router.get("")
async def list_notes(
    type: str = Query(None, description="Filter by 'notes' or 'pyq'"),
    classId: str = Query(None),
    search: str = Query(None),
    user: dict = Depends(get_current_user),
):
    """List uploaded notes/PYQs with optional filters."""
    db = get_db()

    query = {}
    if type:
        query["type"] = type
    if classId:
        query["classId"] = classId

    if search:
        query["title"] = {"$regex": search, "$options": "i"}

    notes = []
    async for doc in db.courseNotes.find(query, {"pdfBinary": 0}).sort("uploadedAt", -1):
        notes.append({
            "noteId": doc["noteId"],
            "title": doc.get("title", "Untitled"),
            "type": doc.get("type", "notes"),
            "filename": doc.get("filename", ""),
            "classId": doc.get("classId"),
            "className": doc.get("className"),
            "uploaderId": doc.get("uploaderId"),
            "uploaderName": doc.get("uploaderName", "Unknown"),
            "fileSizeBytes": doc.get("fileSizeBytes", 0),
            "chunkCount": doc.get("chunkCount", 0),
            "uploadedAt": doc.get("uploadedAt", ""),
        })

    return notes


# ---------------------------------------------------------------------------
# GET /notes/{noteId}/download
# ---------------------------------------------------------------------------

@router.get("/{noteId}/download")
async def download_note(
    noteId: str,
    user: dict = Depends(get_current_user),
):
    """Download the original PDF file."""
    db = get_db()
    doc = await db.courseNotes.find_one({"noteId": noteId})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found")

    return Response(
        content=doc["pdfBinary"],
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{doc.get("filename", "download.pdf")}"'},
    )


# ---------------------------------------------------------------------------
# DELETE /notes/{noteId}
# ---------------------------------------------------------------------------

@router.delete("/{noteId}")
async def delete_note(
    noteId: str,
    user: dict = Depends(require_role("teacher", "admin")),
):
    """Delete a note/PYQ and remove its chunks from ChromaDB."""
    db = get_db()
    doc = await db.courseNotes.find_one({"noteId": noteId})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found")

    # Remove from ChromaDB
    chunk_count = doc.get("chunkCount", 0)
    chunk_ids = [f"{noteId}_chunk_{i}" for i in range(chunk_count)]
    doc_type = doc.get("type", "notes")

    try:
        target = _pyq_collection if doc_type == "pyq" else _notes_collection
        target.delete(ids=chunk_ids)
    except Exception as e:
        logger.warning("Failed to delete ChromaDB chunks for %s: %s", noteId, e)

    # Remove from MongoDB
    await db.courseNotes.delete_one({"noteId": noteId})

    logger.info("Deleted %s '%s'", doc_type, doc.get("title", noteId))
    return {"status": "deleted", "noteId": noteId}
