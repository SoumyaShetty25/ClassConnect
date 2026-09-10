# Academic AI — RAG Engine

## Project Overview
A Retrieval-Augmented Generation (RAG) backend for academic use. Students upload `.txt` notes, which get chunked, embedded, and stored in a vector database. When a question is asked, the system retrieves relevant context and generates an answer using an LLM — or escalates to a teacher if confidence is low.

---

## Tech Stack

| Component        | Technology                        |
|------------------|-----------------------------------|
| Framework        | FastAPI                           |
| Vector DB        | ChromaDB (in-memory)              |
| Embeddings       | `BAAI/bge-small-en-v1.5` (SentenceTransformers) |
| LLM              | Groq API → `llama-3.1-8b-instant` |
| Server           | Uvicorn on `http://0.0.0.0:8000`  |

---

## File Structure

```
AcademicAI_RAG/
├── main.py          # FastAPI backend (ingest + ask endpoints)
├── .env             # GROQ_API_KEY (gitignored)
├── .gitignore       # Excludes .env and __pycache__
└── CONTEXT.md       # This file — project tracker
```

---

## Progress

### Phase 1: Backend API ✅
- [x] Install dependencies (fastapi, uvicorn, chromadb, sentence-transformers, langchain-groq)
- [x] Create `main.py` with RAG engine
- [x] Switch from Ollama to Groq API (user preference)
- [x] Secure API key in `.env` with `python-dotenv`
- [x] Boot server and verify Swagger UI at `/docs`

### Phase 2: Testing & Validation 🔲
- [ ] Create a sample `.txt` notes file for testing
- [ ] Test `/ingest` endpoint — upload and chunk notes
- [ ] Test `/ask` endpoint — query notes and get RAG answers
- [ ] Test escalation flow (no notes / low confidence)
- [ ] Test edge cases (empty file, non-.txt upload, very long file)

### Phase 3: Frontend 🔲
- [ ] Build a web UI for uploading notes and asking questions
- [ ] File upload widget with drag-and-drop
- [ ] Chat-style Q&A interface
- [ ] Display citations and escalation messages
- [ ] Connect frontend to backend API

### Phase 4: Hardening & Features 🔲
- [ ] Persistent vector storage (ChromaDB on disk)
- [ ] Support PDF / DOCX uploads
- [ ] Smarter chunking (overlap, sentence-aware splits)
- [ ] Multi-file source tracking in citations
- [ ] Rate limiting and error handling
- [ ] Deployment (Docker / cloud)

---

## API Endpoints

### `POST /ingest`
Upload a `.txt` file → chunks it (500 chars) → embeds with BGE → stores in ChromaDB.

**Response:**
```json
{ "status": "success", "chunks_loaded": 5 }
```

### `POST /ask`
Send a question → retrieves top-2 context chunks → generates answer via Groq LLM.

**Response (answered):**
```json
{
  "status": "answered",
  "answer": "The mitochondria is the powerhouse of the cell...",
  "citations": ["biology_notes.txt"]
}
```

**Response (escalated):**
```json
{
  "status": "escalated_to_teacher",
  "reason": "Low confidence match."
}
```

---

## Configuration

- **Groq API Key:** Stored in `.env` as `GROQ_API_KEY`
- **Model:** `llama-3.1-8b-instant` (fast, free tier on Groq)
- **Embedding model:** `BAAI/bge-small-en-v1.5` (~33M params, cached locally after first download)
- **Chunk size:** 500 characters (no overlap)
- **Retrieval:** Top 2 results, escalation threshold at distance > 0.7
