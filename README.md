# Academic AI — RAG Backend

A Retrieval-Augmented Generation (RAG) backend for academic Q&A. Upload `.txt` or `.pdf` study notes and lecture slides, then ask questions — the engine retrieves relevant context and generates grounded answers using an LLM. Low-confidence queries are escalated to a teacher.

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/<your-org>/AcademicAI_RAG.git
cd AcademicAI_RAG
pip install -r requirements.txt
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env` and add your [Groq API key](https://console.groq.com):

```
GROQ_API_KEY=gsk_your_key_here
```

### 3. Run the server

```bash
python main.py
```

> First launch downloads the `BAAI/bge-small-en-v1.5` embedding model (~130 MB). Subsequent starts are instant.

The API will be available at **http://localhost:8000**  
Interactive docs at **http://localhost:8000/docs**

---

## API Reference

### `POST /ingest` — Upload notes (.txt or .pdf)

Upload a `.txt` or `.pdf` file to extract text, chunk, embed, and store.

```bash
# Upload plain text notes
curl -X POST http://localhost:8000/ingest \
  -F "file=@biology_notes.txt"

# Upload PDF slides or papers
curl -X POST http://localhost:8000/ingest \
  -F "file=@lecture_slides.pdf"
```

**Response:**
```json
{
  "status": "success",
  "filename": "lecture_slides.pdf",
  "chunks_loaded": 8
}
```

### `POST /ask` — Ask a question

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "What is photosynthesis?"}'
```

**Response (answered):**
```json
{
  "status": "answered",
  "answer": "Photosynthesis is the process by which plants convert sunlight...",
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

## Architecture

```
Request flow:

  [Upload .txt] → chunk (500 chars) → embed (BGE) → store (ChromaDB)

  [Ask question] → embed query → vector search → top-2 context
                 → LLM generates answer (Groq) → return with citations
                 → OR escalate if distance > 0.7
```

| Component   | Technology                              |
|-------------|-----------------------------------------|
| Framework   | FastAPI + Uvicorn                       |
| Vector DB   | ChromaDB (in-memory)                    |
| Embeddings  | `BAAI/bge-small-en-v1.5` (SentenceTransformers) |
| LLM         | Groq API → `qwen/qwen3.8-27b`           |
| CORS        | Enabled for frontend integration        |

---

## Frontend Integration

The backend exposes a CORS-enabled REST API on port `8000`. To connect from a frontend:

```javascript
// Upload notes
const formData = new FormData();
formData.append('file', fileInput.files[0]);
const res = await fetch('http://localhost:8000/ingest', {
  method: 'POST',
  body: formData,
});

// Ask a question
const res = await fetch('http://localhost:8000/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'What is mitosis?' }),
});
```

---

## Project Structure

```
AcademicAI_RAG/
├── main.py            # FastAPI backend (ingest + ask endpoints)
├── requirements.txt   # Pinned Python dependencies
├── .env               # API keys (gitignored)
├── .env.example       # Template for required env vars
├── .gitignore         # Excludes secrets, caches, IDE files
├── CONTEXT.md         # Project progress tracker
└── README.md          # This file
```

---

## License

MIT
