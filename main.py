"""
ClassConnect — Academic Intelligence API
Production-ready FastAPI backend for hackathon deployment.

Endpoints:
  POST /upload        — Ingest PDF course notes into persistent ChromaDB
  POST /ask-socratic  — Socratic tutor Q&A with escalation guard
  POST /triage        — Emergency exam study plan generator
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from sentence_transformers import SentenceTransformer
from groq import Groq
from dotenv import load_dotenv
from pypdf import PdfReader
import uvicorn
import json
import io
import os
import re

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found. Add it to your .env file.")

GROQ_MODEL = "qwen/qwen3.8-27b"        # Fast model on Groq
CHUNK_SIZE = 500                       # ~500 characters per chunk
CHUNK_OVERLAP = 50                     # ~50 character overlap
DISTANCE_THRESHOLD = 0.7              # Escalation threshold

# ---------------------------------------------------------------------------
# App & Middleware
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ClassConnect — Academic Intelligence API",
    description="Socratic tutoring, smart escalation, and emergency exam triage powered by RAG.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------
# Persistent local ChromaDB — survives server restarts
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="classconnect_notes")
pyq_collection = chroma_client.get_or_create_collection(name="classconnect_pyqs")

# Embedding model (downloads ~130 MB on first run, cached after)
embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")

# Groq LLM client
groq_client = Groq(api_key=GROQ_API_KEY)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks of approximately `size` characters."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += size - overlap  # slide forward with overlap
    return chunks


def clean_text(text: str) -> str:
    """Strip markdown formatting artifacts for clean plain-text output."""
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
    text = re.sub(r'_{1,3}(.*?)_{1,3}', r'\1', text)
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'`(.*?)`', r'\1', text)
    text = re.sub(r'^\s*[\*\-]\s+', '- ', text, flags=re.MULTILINE)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_llm_text(raw: str) -> str:
    """Strip <think>...</think> blocks from thinking-model output."""
    raw = re.sub(r'<think>[\s\S]*?</think>', '', raw, flags=re.IGNORECASE)
    return raw.strip()


def call_groq(messages: list[dict], json_mode: bool = False) -> str:
    """Call Groq API and return the assistant's message text, with error handling and fallback."""
    is_placeholder = not GROQ_API_KEY or "placeholder" in GROQ_API_KEY.lower() or "your_groq" in GROQ_API_KEY.lower()
    if not is_placeholder:
        try:
            kwargs = {
                "model": GROQ_MODEL,
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 1200,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = groq_client.chat.completions.create(**kwargs)
            raw = response.choices[0].message.content or ""
            return extract_llm_text(raw)
        except Exception as e:
            print(f"[WARN] Groq API call failed: {e}. Using simulated fallback.")
    else:
        print("[WARN] Groq API key is a placeholder — returning static fallback. Set a real key in .env")

    if json_mode:
        return json.dumps({
            "high_yield_core": ["Core Principles & Foundational Theories", "Key Empirical Mechanisms"],
            "quick_wins": ["Essential Definitions", "Key Terminology & Mnemonics"],
            "skip_list": ["Complex Historical Context", "Low-Yield Edge Cases"]
        })
    else:
        return "Based on the course notes, consider how the key concepts connect to the fundamental principles discussed in lecture. Can you explain the first step of this process in your own words?"


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class SocraticRequest(BaseModel):
    question: str

class TriageRequest(BaseModel):
    subject: str
    hours_left: int
    weak_topics: list[str]

# ---------------------------------------------------------------------------
# Endpoint 1: POST /upload — Ingest PDF course notes
# ---------------------------------------------------------------------------

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file. Extracts text, chunks with overlap, embeds, and stores in ChromaDB."""

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

    # Chunk with overlap
    chunks = chunk_text(text)

    # Embed and store
    embeddings = embedder.encode(chunks).tolist()
    ids = [f"{file.filename}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": file.filename, "chunk_index": i} for i in range(len(chunks))]

    collection.upsert(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)

    return {
        "status": "success",
        "message": f"Uploaded and indexed {len(chunks)} chunks from '{file.filename}'.",
        "filename": file.filename,
        "chunks_stored": len(chunks),
    }


# ---------------------------------------------------------------------------
# Endpoint 2: POST /ask-socratic — Socratic tutor with escalation guard
# ---------------------------------------------------------------------------

@app.post("/ask-socratic")
async def ask_socratic(payload: SocraticRequest):
    """
    Socratic Q&A endpoint.
    - Checks if the question is covered in uploaded notes.
    - If distance > 0.7: returns ESCALATE immediately (no Groq call).
    - Otherwise: Groq generates a Socratic hint with a follow-up question.
    """

    # Embed the question and query ChromaDB for top 3 chunks
    query_embedding = embedder.encode([payload.question]).tolist()
    results = collection.query(query_embeddings=query_embedding, n_results=3)

    # Guard: no documents uploaded yet
    if not results["documents"][0]:
        return {
            "answer": "ESCALATE",
            "status": "not_in_syllabus",
            "reason": "No course notes have been uploaded yet. Please upload PDF notes first.",
        }

    # Distance check — closest chunk
    best_distance = results["distances"][0][0]

    if best_distance > DISTANCE_THRESHOLD:
        return {
            "answer": "ESCALATE",
            "status": "not_in_syllabus",
        }

    # Build context from retrieved chunks
    context_chunks = results["documents"][0]
    context = "\n---\n".join(context_chunks)

    # Socratic tutor prompt (exact spec)
    messages = [
        {
            "role": "system",
            "content": (
                "You are a strict Socratic tutor. Using ONLY the provided context from "
                "the professor's notes, help the student. "
                "Rule 1: NEVER give the final answer. "
                "Rule 2: Give a small hint based on the context. "
                "Rule 3: End with a question asking the student to explain the next step."
            ),
        },
        {
            "role": "user",
            "content": f"Context from course notes:\n{context}\n\nStudent's question: {payload.question}",
        },
    ]

    answer = call_groq(messages)

    if not answer:
        return {
            "answer": "ESCALATE",
            "status": "not_in_syllabus",
            "reason": "The AI model returned an empty response.",
        }

    # Build source excerpts (first 120 chars of each chunk for brevity)
    sources = [chunk[:120] + "..." if len(chunk) > 120 else chunk for chunk in context_chunks]

    return {
        "answer": clean_text(answer),
        "status": "success",
        "sources": sources,
    }


# ---------------------------------------------------------------------------
# Endpoint 3: POST /triage — Emergency exam study plan
# ---------------------------------------------------------------------------

@app.post("/triage")
async def triage(payload: TriageRequest):
    """
    Emergency Academic Triage.
    - Queries ChromaDB notes collection for syllabus context.
    - Queries ChromaDB PYQ collection for past exam patterns.
    - Calls Groq in JSON mode to generate a PYQ-informed study plan.
    """

    if not payload.weak_topics:
        raise HTTPException(status_code=400, detail="Please provide at least one weak topic.")

    # Query course notes for each weak topic
    all_chunks = []
    seen_ids = set()

    for topic in payload.weak_topics:
        topic_embedding = embedder.encode([topic]).tolist()
        results = collection.query(query_embeddings=topic_embedding, n_results=3)

        if results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                chunk_id = results["ids"][0][i] if results["ids"][0] else f"{topic}_{i}"
                if chunk_id not in seen_ids:
                    seen_ids.add(chunk_id)
                    all_chunks.append(doc)

    # Query PYQ collection for past exam question patterns
    pyq_chunks = []
    pyq_seen = set()

    for topic in payload.weak_topics:
        topic_embedding = embedder.encode([topic]).tolist()
        try:
            pyq_results = pyq_collection.query(query_embeddings=topic_embedding, n_results=3)
            if pyq_results["documents"][0]:
                for i, doc in enumerate(pyq_results["documents"][0]):
                    chunk_id = pyq_results["ids"][0][i] if pyq_results["ids"][0] else f"pyq_{topic}_{i}"
                    if chunk_id not in pyq_seen:
                        pyq_seen.add(chunk_id)
                        pyq_chunks.append(doc)
        except Exception:
            pass  # PYQ collection may be empty

    if not all_chunks and not pyq_chunks:
        return {
            "status": "error",
            "message": "No course notes or PYQs found. Please upload PDF notes first.",
        }

    notes_context = "\n---\n".join(all_chunks) if all_chunks else "No course notes available."
    pyq_context = "\n---\n".join(pyq_chunks) if pyq_chunks else ""

    # Build PYQ-enhanced triage prompt
    system_prompt = (
        f"You are an Emergency Academic Triage AI. The student has an exam in "
        f"{payload.hours_left} hours for {payload.subject}. "
    )

    if pyq_context:
        system_prompt += (
            f"You have access to both course notes AND previous year exam questions (PYQs). "
            f"Use the PYQ patterns to identify which topics are MOST LIKELY to appear on the exam. "
            f"Prioritize topics that appeared in past exams as HIGH YIELD. "
            f"Output a JSON object with exactly 4 keys: "
            f"'high_yield_core' (topics to spend 70% of time on — prioritize PYQ-frequent topics, list of strings), "
            f"'quick_wins' (easy marks from definitions/formulas that appeared in PYQs, list of strings), "
            f"'skip_list' (low priority topics not seen in PYQs, list of strings), "
            f"'pyq_insights' (2-4 observations about exam patterns from PYQs, list of strings)."
        )
    else:
        system_prompt += (
            f"Based ONLY on the provided course notes context, generate a Minimum Viable Study Plan. "
            f"Output a JSON object with exactly 3 keys: "
            f"'high_yield_core' (topics to spend 70% of time on, list of strings), "
            f"'quick_wins' (easy definitions, list of strings), "
            f"'skip_list' (low priority, list of strings)."
        )

    user_content = f"Course notes context:\n{notes_context}\n\n"
    if pyq_context:
        user_content += f"Previous Year Exam Questions (PYQs):\n{pyq_context}\n\n"
    user_content += f"Weak topics the student identified: {', '.join(payload.weak_topics)}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    raw_json = call_groq(messages, json_mode=True)

    if not raw_json:
        raise HTTPException(status_code=502, detail="Triage model returned empty response.")

    # Parse the JSON response
    try:
        study_plan = json.loads(raw_json)
    except json.JSONDecodeError:
        return {
            "status": "success",
            "study_plan": raw_json,
            "warning": "Response was not valid JSON. Returning raw text.",
        }

    return {
        "status": "success",
        "subject": payload.subject,
        "hours_left": payload.hours_left,
        "study_plan": study_plan,
        "has_pyq_data": len(pyq_chunks) > 0,
    }


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    """Health check endpoint."""
    doc_count = collection.count()
    return {
        "service": "ClassConnect — Academic Intelligence API",
        "status": "online",
        "documents_indexed": doc_count,
    }


# ---------------------------------------------------------------------------
# Attendance Module — routers + MongoDB lifecycle
# ---------------------------------------------------------------------------
from contextlib import asynccontextmanager

from attendance.database import connect_db, close_db
from attendance.router_auth import router as auth_router
from attendance.router_admin import router as admin_router
from attendance.router_registration import router as registration_router
from attendance.router_attendance import router as attendance_router
from attendance.router_notes import router as notes_router, init_notes_router

# Initialize notes router with shared resources
init_notes_router(embedder, collection, pyq_collection)

# Register routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(registration_router)
app.include_router(attendance_router)
app.include_router(notes_router)


# MongoDB lifecycle events
@app.on_event("startup")
async def startup_db():
    await connect_db()


@app.on_event("shutdown")
async def shutdown_db():
    await close_db()


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
