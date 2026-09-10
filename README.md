# Academic AI — RAG Backend

A Retrieval-Augmented Generation (RAG) backend designed for academic learning, course notes, and lecture slide Q&A. Students can upload `.txt`, `.pdf`, and `.docx` documents, then query them in natural language. The engine retrieves relevant excerpts and generates clean, grounded answers with file citations — or automatically escalates to a teacher when notes do not contain sufficient detail.

---

## Features

- 📄 **Multi-Format Ingestion**: Upload plain text (`.txt`) notes, multi-page slide decks and papers (`.pdf`), or Microsoft Word documents (`.docx`).
- ⚡ **Lightning Fast & Free**: Powered by `qwen/qwen3.8-27b` on Groq API with near-zero latency.
- 🎯 **Two-Tier Escalation**:
  1. *Vector Search Threshold*: Escalates queries that have low semantic similarity (`distance > 0.7`).
  2. *LLM Context Completeness*: Model detects partial or missing context and explicitly flags `ESCALATE` with reasons rather than guessing.
- 🧼 **Clean Plain-Text Answers**: Strips distracting markdown formatting, asterisks (`**`), code backticks, and header hashes for human-readable academic English.
- 💻 **Interactive Terminal CLI**: Chat directly with your documents from Command Prompt or PowerShell (`cli.py`).
- 🌐 **CORS-Enabled REST API**: Ready to connect with React, Next.js, Vue, or any web frontend.

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/<your-org>/AcademicAI_RAG.git
cd AcademicAI_RAG
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your [Groq API key](https://console.groq.com):

```env
GROQ_API_KEY=gsk_your_key_here
```

### 3. Run the Server

```bash
python main.py
```

> **Note:** The first run downloads the `BAAI/bge-small-en-v1.5` embedding model (~130 MB). Subsequent starts load from local cache instantly.

- **API Endpoint:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

---

## Command Line Interface (CLI)

You can interact with the engine directly in your Command Prompt / terminal without a browser:

```bash
# 1. Interactive terminal chat mode (recommended)
python cli.py

# 2. Ingest notes directly
python cli.py ingest "notes/machine_learning_notes.pdf"

# 3. Ask a question directly
python cli.py ask "What is the well-posed learning problem definition?"
```

---

## API Reference

### `POST /ingest` — Upload Notes (.txt, .pdf, or .docx)

Upload a `.txt`, `.pdf`, or `.docx` file to extract text, chunk (500 chars), embed, and store in ChromaDB.

```bash
# Upload plain text notes
curl -X POST http://localhost:8000/ingest \
  -F "file=@biology_notes.txt"

# Upload PDF slides or lecture notes
curl -X POST http://localhost:8000/ingest \
  -F "file=@machine_learning_notes.pdf"

# Upload Word documents
curl -X POST http://localhost:8000/ingest \
  -F "file=@study_guide.docx"
```

**Response:**
```json
{
  "status": "success",
  "filename": "machine_learning_notes.pdf",
  "chunks_loaded": 94
}
```

### `POST /ask` — Ask a Question

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "What is machine learning?"}'
```

**Response (Answered):**
```json
{
  "status": "answered",
  "answer": "Machine learning is defined by the concept of a well-posed learning problem: a computer program is said to learn from experience E with respect to some class of tasks T and performance measure P, if its performance at tasks in T, as measured by P, improves with experience E.",
  "citations": ["machine_learning_notes.pdf"]
}
```

**Response (Escalated to Teacher):**
```json
{
  "status": "escalated_to_teacher",
  "reason": "The context does not contain information on data preparation or loan default prediction pipelines.",
  "citations": ["machine_learning_notes.pdf"]
}
```

---

## Architecture & Pipeline

```
Ingestion Pipeline:
  [.txt / .pdf] ──> text extraction (pypdf) ──> chunking (500 chars)
                ──> BGE embeddings ──> ChromaDB vector storage

Query Pipeline:
  [Question]    ──> query embedding ──> top-2 vector retrieval
                ──> Distance > 0.7? ──> YES: Escalate to Teacher
                ──> NO: Prompt Qwen (Groq) with context
                ──> Model detects incomplete context? ──> YES: Escalate to Teacher
                ──> NO: Sanitize output & return answer with citations
```

| Component       | Technology                                                      |
|-----------------|-----------------------------------------------------------------|
| Framework       | FastAPI + Uvicorn                                               |
| Vector Database | ChromaDB (in-memory, cosine distance)                           |
| Embedding Model | `BAAI/bge-small-en-v1.5` (SentenceTransformers, 384 dimensions)  |
| LLM Provider    | Groq API → `qwen/qwen3.8-27b`                                   |
| Document Parser | `pypdf` (multi-page PDF support)                                |
| CLI Client      | `cli.py` (Windows cp1252-compatible terminal client)           |
| Cross-Origin    | CORS enabled for all origins (`*`)                              |

---

## Frontend Integration

The backend exposes a CORS-ready REST API on port `8000`. Connect from any frontend:

```javascript
// Upload document
const formData = new FormData();
formData.append('file', fileInput.files[0]);
const uploadRes = await fetch('http://localhost:8000/ingest', {
  method: 'POST',
  body: formData,
});
const uploadData = await uploadRes.json();
console.log(`Loaded ${uploadData.chunks_loaded} chunks!`);

// Query notes
const askRes = await fetch('http://localhost:8000/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'What is photosynthesis?' }),
});
const result = await askRes.json();

if (result.status === 'answered') {
  console.log('Answer:', result.answer);
  console.log('Citations:', result.citations);
} else if (result.status === 'escalated_to_teacher') {
  console.warn('Escalated:', result.reason);
}
```

---

## Project Structure

```
AcademicAI_RAG/
├── main.py                     # FastAPI backend (ingest, ask, clean_text, CORS)
├── cli.py                      # Terminal client (interactive chat & quick commands)
├── test_rag.py                 # Automated end-to-end test suite
├── requirements.txt            # Pinned dependencies
├── .env                        # Secret API keys (gitignored)
├── .env.example                # Template for required environment variables
├── .gitignore                  # Excludes secrets, cache, venv, and IDE files
├── README.md                   # Project documentation
├── CONTEXT.md                  # Development progress log
└── notes/                      # Academic documents and lecture materials
    ├── Introduction to Psychology.pdf
    └── machine_learning_notes.pdf
```

---

## License

MIT
