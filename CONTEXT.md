# Academic AI — RAG Engine

## Project Overview
A Retrieval-Augmented Generation (RAG) backend engine for academic learning and Q&A. Students upload `.txt` and `.pdf` study materials, lecture slides, and notes. The engine chunks, embeds, and indexes them in a vector database. When a student asks a question, the system retrieves relevant context and generates a clean, grounded answer citing specific files. If notes do not contain sufficient information, the query is escalated to a teacher.

---

## Tech Stack

| Component        | Technology                                                      |
|------------------|-----------------------------------------------------------------|
| Framework        | FastAPI + Uvicorn                                               |
| Vector DB        | ChromaDB (in-memory, cosine distance)                           |
| Embeddings       | `BAAI/bge-small-en-v1.5` (SentenceTransformers, 384 dimensions)  |
| LLM              | Groq API → `qwen/qwen3.8-27b` (low latency, high reasoning)     |
| PDF Processing   | `pypdf` (multi-page text extraction)                            |
| CLI Tool         | `cli.py` (interactive terminal chat & single commands)          |
| Host / Server    | `http://0.0.0.0:8000` (CORS enabled for all origins)            |

---

## File Structure

```
AcademicAI_RAG/
├── main.py                     # FastAPI backend (endpoints: /ingest, /ask, CORS middleware)
├── cli.py                      # Interactive Command Prompt / Terminal client
├── test_rag.py                 # Automated end-to-end test suite
├── requirements.txt            # Pinned dependencies (including pypdf, groq, etc.)
├── .env                        # Secret keys (GROQ_API_KEY) — gitignored
├── .env.example                # Template for required environment variables
├── .gitignore                  # Excludes secrets, cache, venv, and IDE files
├── README.md                   # Full documentation with setup, CLI, and frontend guides
├── CONTEXT.md                  # Project tracker & architecture log
├── sample_notes_biology.txt    # Sample notes for automated validation
├── sample_lecture_quantum.pdf  # Sample PDF for automated validation
└── notes/                      # User academic study materials
    ├── Introduction to Psychology.pdf  # (49 chunks indexed)
    ├── machine_learning_notes.pdf      # (94 chunks indexed)
    ├── sample_lecture_quantum.pdf
    └── sample_notes_biology.txt
```

---

## Progress Tracker

### Phase 1: Backend API ✅
- [x] Install dependencies (FastAPI, Uvicorn, ChromaDB, SentenceTransformers, LangChain)
- [x] Create `main.py` with RAG engine
- [x] Switch LLM provider from Ollama to Groq API (`qwen/qwen3.8-27b`)
- [x] Secure API key in `.env` with `python-dotenv`
- [x] Boot server and verify Swagger UI at `/docs`

### Phase 2: GitHub-Ready Packaging ✅
- [x] Add `requirements.txt` with pinned versions
- [x] Add `.env.example` template (safe to commit)
- [x] Expand `.gitignore` (secrets, Python, IDE, OS)
- [x] Add CORS middleware for external frontend integration
- [x] Create `README.md` with setup, API docs, and frontend integration examples
- [x] Initialize git repo and create commits
- [x] Verify `.env` is safely excluded from git history

### Phase 3: Testing & Validation ✅
- [x] Create sample `.txt` and `.pdf` test files
- [x] Automated test suite (`test_rag.py`) passing 100%
- [x] Verify in-scope question answering with correct citations
- [x] Verify out-of-scope question escalation
- [x] Verify rejection of unsupported file formats (e.g. `.png` -> 400 Bad Request)

### Phase 4: Document Support, CLI & Usability Upgrades ✅
- [x] Full PDF ingestion support with page extraction using `pypdf`
- [x] Microsoft Word document ingestion support using `python-docx` (paragraphs & tables)
- [x] Created `cli.py` supporting both interactive REPL mode and single-command flags
- [x] Fixed Windows Command Prompt `cp1252` character encoding compatibility
- [x] Built two-tier escalation:
  1. *Vector Layer:* Distance threshold > 0.7 triggers automatic escalation
  2. *LLM Layer:* Model detects incomplete/partial context and triggers `ESCALATE:`
- [x] Built `clean_text()` sanitizer to strip raw markdown codes, asterisks (`**`), backticks, and header hashes for clean academic English
- [x] Verified automated tests (`test_rag.py`) for `.txt`, `.pdf`, and `.docx`
- [x] Ingested user's real course notes:
  - `Introduction to Psychology.pdf` (49 chunks)
  - `machine_learning_notes.pdf` (94 chunks)

### Phase 5: Frontend UI Integration 🔲
- [ ] Build a web UI for uploading notes and asking questions
- [ ] Drag-and-drop document uploader with chunk feedback
- [ ] Student chat-style Q&A interface
- [ ] Visual citation cards & teacher escalation notification badges
- [ ] Connect frontend to `http://localhost:8000` via fetch/axios

### Phase 6: Hardening & Production Features 🔲
- [ ] Persistent vector storage (ChromaDB on disk instead of in-memory)
- [ ] Support DOCX / PPTX file uploads
- [ ] Recursive chunking with overlap (e.g. 500 chars + 50 overlap)
- [ ] Multi-document source ranking in answers
- [ ] Docker containerization for one-click deployment

---

## API Endpoints

### `POST /ingest`
Upload a `.txt` or `.pdf` file → extracts text → chunks it (500 chars) → embeds with BGE → stores in ChromaDB.

**Response:**
```json
{
  "status": "success",
  "filename": "Introduction to Psychology.pdf",
  "chunks_loaded": 49
}
```

### `POST /ask`
Send a question → retrieves top-2 context chunks → checks vector distance and context completeness → generates answer via Groq LLM.

**Response (Answered):**
```json
{
  "status": "answered",
  "answer": "According to the provided notes, psychology is defined as the scientific study of mind and behavior.",
  "citations": ["Introduction to Psychology.pdf"]
}
```

**Response (Escalated to Teacher):**
```json
{
  "status": "escalated_to_teacher",
  "reason": "The context does not contain sufficient detail regarding loan default prediction pipelines.",
  "citations": ["machine_learning_notes.pdf"]
}
```

---

## Command Line Usage

```bash
# 1. Interactive terminal mode (recommended)
python cli.py

# 2. Ingest notes directly
python cli.py ingest "notes/machine_learning_notes.pdf"

# 3. Ask a question directly
python cli.py ask "What is the well-posed learning problem definition?"
```
