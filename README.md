# ClassConnect — Academic Intelligence Engine

A full-stack Academic Intelligence platform that transforms course materials into an interactive **Socratic Tutor**, an **Emergency Exam Triage** optimizer, and an automated **Curriculum & Doubts Dashboard** for teachers.

Built with a high-performance **FastAPI + ChromaDB + Groq** backend and a modern **React + Vite** frontend styled in an aesthetic pastel design language.

---

## 🌟 Core Highlights

### 👨‍🏫 Teacher Experience
- 📄 **Curriculum Ingestion** — Drag & drop syllabus, lecture slides, and notes (PDF). Automatically chunked (~500 chars with 50-char overlap), embedded using `BAAI/bge-small-en-v1.5`, and stored in persistent ChromaDB.
- 🛡️ **Live Raised Doubts Dashboard** — Whenever a student asks a question not covered by the uploaded materials, the query is automatically flagged as out-of-syllabus and escalated directly to the professor's dashboard.
- 💬 **Inline Clarification Broadcast** — Review student questions, type a quick clarification, and broadcast it back to students with live status updates (`Resolved · Sent`).
- 📊 **Teacher Metrics** — Track indexed chunks, pending doubts, and autonomous resolution rate in real-time.

### 👨‍🎓 Student Experience
- 🧠 **Interactive Socratic Tutor** — Never spoils answers. Guides students step-by-step using progressive questioning and intuition prompts, strictly grounded in the professor's notes with exact source citations.
- ⚡ **Emergency Exam Triage** — Facing an upcoming exam deadline? Input your subject, remaining hours, and weak topics to generate an optimized **Pareto 80/20 Survival Plan**:
  - 🔥 **High-Yield Core** (Spend 70% of time here)
  - ⚡ **Quick Wins** (Definitions, formulas, key terminology)
  - ⏭️ **Skip For Now** (Low ROI topics to skip given time constraints)
- 📊 **Study Time & Triage Metrics** — Track available syllabus vectors, triage countdown hours, and Socratic retrieval precision.

---

## 🎨 Design Aesthetics & UI System

ClassConnect features an educational design system inspired by modern mobile learning interfaces:
- **Soft Pastel Color Palette**: Lilac/Lavender (`#EFE6FA`), Mint Sage (`#DEF1EA`), Butter Yellow (`#FEF7DC`), and Soft Blush/Rose (`#FDEAE8`).
- **High-Contrast Charcoal Pill Controls**: Ergonomic `#1F1B28` action buttons with circular directional arrow badges (`→`, `↗`).
- **Role-Tailored KPI Widgets**: Differentiated highlight cards for Teachers (curriculum & escalations) vs. Students (exam countdown & tutor precision).
- **Responsive Layout**: Fluid workspace switching between Teacher and Student profiles.

---

## 🏗️ Architecture & Tech Stack

```
                               ┌────────────────────────┐
                               │  ClassConnect Frontend │
                               │  (React 19 + Vite 6)   │
                               └───────────┬────────────┘
                                           │ HTTP / JSON
                                           ▼
                               ┌────────────────────────┐
                               │    FastAPI Backend     │
                               │   (http://localhost:   │
                               │         8000)          │
                               └───────────┬────────────┘
                                           │
             ┌─────────────────────────────┼─────────────────────────────┐
             ▼                             ▼                             ▼
   ┌───────────────────┐         ┌───────────────────┐         ┌───────────────────┐
   │    PDF Parser     │         │ Vector Store (RAG)│         │ Groq Cloud Engine │
   │      (pypdf)      │         │     (ChromaDB)    │         │  (qwen-2.5-32b)   │
   │ 500c/50c overlap  │         │ BAAI/bge-small-en │         │ Socratic & Triage │
   └───────────────────┘         └───────────────────┘         └───────────────────┘
```

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 6, Tailwind CSS, Lucide Icons | Responsive single-page app with role-based dashboards |
| **Backend** | FastAPI, Uvicorn, Python 3.10+ | Async REST API with CORS support |
| **Vector DB** | ChromaDB (`./chroma_db`) | Persistent local vector store on disk |
| **Embeddings** | `BAAI/bge-small-en-v1.5` (SentenceTransformers) | 384-dimensional dense semantic embeddings |
| **LLM Provider** | Groq Cloud API (`qwen-2.5-32b`) | High-speed, low-latency reasoning inference |
| **Document Parser**| `pypdf` | Multi-page text extraction and preprocessing |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ and npm
- A free [Groq API Key](https://console.groq.com)

---

### 1. Backend Setup

```bash
# From repository root
pip install -r requirements.txt
```

Create a `.env` file in the root directory:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

Start the FastAPI server:
```bash
python main.py
```
- Server URL: `http://localhost:8000`
- Interactive API Docs (Swagger): `http://localhost:8000/docs`
- Health check: `GET http://localhost:8000/`

---

### 2. Frontend Setup

In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
- Open your browser to: **`http://localhost:5173/`**

---

## 📡 REST API Reference

### 1. `POST /upload`
Upload a PDF course notes file. Text is extracted, split into ~500-char chunks with 50-char overlap, embedded, and stored in the persistent ChromaDB collection (`orbit_notes`).

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@notes/Introduction to Psychology.pdf"
```

**Response:**
```json
{
  "status": "success",
  "message": "Uploaded and indexed 49 chunks from 'Introduction to Psychology.pdf'.",
  "filename": "Introduction to Psychology.pdf",
  "chunks_stored": 49
}
```

---

### 2. `POST /ask-socratic`
Submits a student's inquiry. If the question is outside the course syllabus (cosine distance > 0.7), it triggers a guardrail and returns `not_in_syllabus` without consuming LLM tokens. If within syllabus, it generates a guiding Socratic prompt with sources.

```bash
curl -X POST http://localhost:8000/ask-socratic \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the three levels of explanation in psychology?"}'
```

**Response (Grounded in Notes):**
```json
{
  "answer": "The notes describe levels spanning from lower biological mechanisms up to individual and cultural influences. Think about the physical body — what biological components might form the lower foundation?",
  "status": "success",
  "sources": [
    "Introduction to Psychology.pdf: Psychology spans many different topics at different levels of explanation..."
  ]
}
```

**Response (Out of Syllabus — Escalated):**
```json
{
  "answer": "ESCALATE",
  "status": "not_in_syllabus"
}
```

---

### 3. `POST /triage`
Generates a structured pre-exam survival study plan using Groq JSON mode.

```bash
curl -X POST http://localhost:8000/triage \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Cognitive Psychology",
    "hours_left": 3,
    "weak_topics": ["working memory", "operant conditioning"]
  }'
```

**Response:**
```json
{
  "status": "success",
  "subject": "Cognitive Psychology",
  "hours_left": 3,
  "study_plan": {
    "high_yield_core": [
      "Baddeley's Model of Working Memory (Phonological Loop, Visuospatial Sketchpad)",
      "Reinforcement schedules in Operant Conditioning"
    ],
    "quick_wins": [
      "Working memory capacity (7 +/- 2 items rule)",
      "Positive vs Negative reinforcement definitions"
    ],
    "skip_list": [
      "Historical psychoanalytic debates",
      "Nuanced statistical methodologies"
    ]
  }
}
```

---

## 📁 Repository Structure

```
AcademicAI_RAG/
├── main.py                     # FastAPI backend (endpoints, RAG logic, Groq integration)
├── cli.py                      # Interactive CLI terminal client for testing
├── test_rag.py                 # Automated end-to-end test suite
├── requirements.txt            # Python dependencies
├── .env                        # Secret Groq API key (gitignored)
├── .env.example                # Example template for required environment variables
├── .gitignore                  # Git ignore rules
├── README.md                   # Complete documentation
├── CONTEXT.md                  # Project architecture & development log
├── chroma_db/                  # Persistent ChromaDB vector database files (auto-generated)
├── notes/                      # Academic PDFs and test materials
└── frontend/                   # React + Vite application
    ├── index.html              # HTML entry point with Plus Jakarta Sans
    ├── package.json            # Node.js dependencies
    ├── vite.config.js          # Vite configuration
    └── src/
        ├── main.jsx            # React root mount
        ├── index.css           # Global typography, animations, and reset
        └── App.jsx             # Complete ClassConnect SPA (Teacher/Student views)
```

---

## 🧪 Testing & Verification

Run the automated backend test suite:
```bash
python test_rag.py
```

Run the interactive terminal client:
```bash
python cli.py
```

---

## 📄 License
MIT License
