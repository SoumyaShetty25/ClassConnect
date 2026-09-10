# ClassConnect — Academic Intelligence API

A Retrieval-Augmented Generation (RAG) backend that transforms course PDFs into an intelligent Socratic tutor and emergency exam triage system. Built for hackathons, powered by Groq.

---

## Features

- 📚 **PDF Ingestion** — Upload lecture slides, syllabi, or course notes. Text is extracted, chunked with overlap, embedded, and stored persistently.
- 👩‍🏫 **Socratic Tutoring** — Guides students step-by-step instead of giving away answers. Ends every response with a follow-up question.
- 🛡️ **Smart Escalation** — If the question is not covered in the uploaded notes (distance > 0.7), the system immediately returns `ESCALATE` without calling the LLM.
- 🚑 **Emergency Triage** — Generates a structured JSON study plan with `high_yield_core`, `quick_wins`, and `skip_list` based on uploaded course content.
- 💾 **Persistent Storage** — ChromaDB saves to disk (`./chroma_db`). Notes survive server restarts.
- ⚡ **Fast & Free** — Uses Groq API for near-zero latency inference.

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/<your-org>/ClassConnect.git
cd ClassConnect
pip install -r requirements.txt
```

### 2. Set Up Environment

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

> **Note:** First run downloads the `BAAI/bge-small-en-v1.5` embedding model (~130 MB). Cached after.

- **API:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`
- **Health Check:** `GET /` → returns service status and document count

---

## API Reference

### `POST /upload` — Upload PDF Course Notes

Upload a PDF file. Text is extracted, split into ~500 character chunks with ~50 character overlap, embedded, and stored in ChromaDB.

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@machine_learning_notes.pdf"
```

**Response:**
```json
{
  "status": "success",
  "message": "Uploaded and indexed 94 chunks from 'machine_learning_notes.pdf'.",
  "filename": "machine_learning_notes.pdf",
  "chunks_stored": 94
}
```

---

### `POST /ask-socratic` — Socratic Tutor Q&A

Send a student's question. The system retrieves the top 3 relevant chunks and generates a Socratic hint — never the final answer.

```bash
curl -X POST http://localhost:8000/ask-socratic \
  -H "Content-Type: application/json" \
  -d '{"question": "What is supervised learning?"}'
```

**Response (Success):**
```json
{
  "answer": "That's a great question! The notes mention that in this type of learning, the algorithm is given labeled examples. Think about what 'labeled' means here — can you describe what the algorithm is trying to learn from those labels?",
  "status": "success",
  "sources": ["In supervised learning, the algorithm is trained on a labeled dataset..."]
}
```

**Response (Escalated — not in syllabus):**
```json
{
  "answer": "ESCALATE",
  "status": "not_in_syllabus"
}
```

---

### `POST /triage` — Emergency Exam Study Plan

Generate a minimum viable study plan when the student is running out of time before an exam.

```bash
curl -X POST http://localhost:8000/triage \
  -H "Content-Type: application/json" \
  -d '{"subject": "Machine Learning", "hours_left": 4, "weak_topics": ["SVM", "decision trees", "overfitting"]}'
```

**Response:**
```json
{
  "status": "success",
  "subject": "Machine Learning",
  "hours_left": 4,
  "study_plan": {
    "high_yield_core": ["Bias-Variance Tradeoff", "Overfitting and Regularization"],
    "quick_wins": ["Decision Tree terminology: root, leaf, depth", "SVM margin definition"],
    "skip_list": ["Kernel trick derivation", "Ensemble methods deep dive"]
  }
}
```

---

## Architecture

```
Upload Pipeline:
  [PDF] ──> pypdf text extraction ──> overlapping chunking (500c / 50c overlap)
        ──> BGE embeddings ──> ChromaDB persistent storage (./chroma_db)

Socratic Pipeline:
  [Question] ──> embed query ──> top-3 retrieval from ChromaDB
             ──> Distance > 0.7? ──> YES: Return ESCALATE (no LLM call)
             ──> NO: Groq Socratic prompt ──> hint + follow-up question

Triage Pipeline:
  [Weak Topics] ──> embed each topic ──> retrieve relevant chunks
                ──> Groq JSON mode ──> structured study plan
```

| Component       | Technology                                                       |
|-----------------|------------------------------------------------------------------|
| Framework       | FastAPI + Uvicorn                                                |
| Vector Database | ChromaDB (persistent, cosine distance)                           |
| Embedding Model | `BAAI/bge-small-en-v1.5` (SentenceTransformers, 384 dimensions) |
| LLM Provider    | Groq API → `qwen-2.5-32b`                                       |
| Document Parser | `pypdf` (multi-page PDF text extraction)                         |
| Cross-Origin    | CORS enabled for all origins (`*`)                               |

---

## Frontend Integration

The backend exposes a CORS-ready REST API on port `8000`. Connect from React, Next.js, Vue, or any frontend:

```javascript
// Upload PDF
const formData = new FormData();
formData.append('file', fileInput.files[0]);
const res = await fetch('http://localhost:8000/upload', {
  method: 'POST',
  body: formData,
});

// Socratic Q&A
const askRes = await fetch('http://localhost:8000/ask-socratic', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'What is gradient descent?' }),
});
const result = await askRes.json();
if (result.status === 'success') {
  console.log('Hint:', result.answer);
} else {
  console.warn('Not in syllabus — escalated.');
}

// Triage
const triageRes = await fetch('http://localhost:8000/triage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subject: 'Psychology',
    hours_left: 3,
    weak_topics: ['memory', 'conditioning'],
  }),
});
```

---

## Project Structure

```
ClassConnect/
├── main.py              # Complete FastAPI backend (3 endpoints + health check)
├── requirements.txt     # Pinned dependencies
├── .env                 # GROQ_API_KEY (gitignored)
├── .env.example         # Template for required env vars
├── .gitignore           # Excludes .env, chroma_db/, __pycache__/
├── README.md            # This file
├── chroma_db/           # Persistent vector storage (auto-created, gitignored)
└── notes/               # Academic PDFs for upload
```

---

## License

MIT
