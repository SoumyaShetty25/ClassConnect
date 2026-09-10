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
| LLM              | Groq API → `qwen/qwen3.8-27b`     |
| Server           | Uvicorn on `http://0.0.0.0:8000`  |

---

## File Structure

```
AcademicAI_RAG/
├── main.py                   # FastAPI backend (ingest + ask endpoints, CORS)
├── test_rag.py               # Automated test suite
├── sample_notes_biology.txt  # Sample academic notes for testing
├── requirements.txt          # Pinned dependencies
├── .env                      # GROQ_API_KEY (gitignored)
├── .env.example              # Template for required env vars
├── .gitignore                # Excludes secrets, caches, IDE files
├── README.md                 # Project & API documentation
└── CONTEXT.md                # Progress tracker
```

---

## Progress

### Phase 1: Backend API ✅
- [x] Install dependencies (fastapi, uvicorn, chromadb, sentence-transformers, langchain-groq)
- [x] Create `main.py` with RAG engine
- [x] Switch from Ollama to Groq API (user preference)
- [x] Secure API key in `.env` with `python-dotenv`
- [x] Boot server and verify Swagger UI at `/docs`

### Phase 2: GitHub-Ready Packaging ✅
- [x] Add `requirements.txt` with pinned versions
- [x] Add `.env.example` template (safe to commit)
- [x] Expand `.gitignore` (secrets, Python, IDE, OS)
- [x] Add CORS middleware for frontend integration
- [x] Create `README.md` with setup, API docs, and frontend integration examples
- [x] Initialize git repo and create initial commit
- [x] Verify `.env` is excluded from tracked files

### Phase 3: Testing & Validation ✅
- [x] Create a sample `.txt` notes file for testing (`sample_notes_biology.txt`)
- [x] Test `/ingest` endpoint — upload and chunk notes (3 chunks loaded)
- [x] Test `/ask` endpoint — query notes and get grounded RAG answers with citations
- [x] Test escalation flow (out-of-scope query successfully escalated with reason "Low confidence match.")
- [x] Test edge cases (non-.txt upload rejected with 400 Bad Request)
- [x] Configured working Groq model `qwen/qwen3.8-27b`

### Phase 4: Frontend 🔲
- [ ] Build a web UI for uploading notes and asking questions
- [ ] File upload widget with drag-and-drop
- [ ] Chat-style Q&A interface
- [ ] Display citations and escalation messages
- [ ] Connect frontend to backend API

### Phase 5: Hardening & Features 🔲
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
