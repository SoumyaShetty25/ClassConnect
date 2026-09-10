# ClassConnect — Academic Intelligence Engine (Project Context)

## 📌 Project Overview
**ClassConnect** is an Academic Intelligence platform combining a Retrieval-Augmented Generation (RAG) backend with a responsive, modern React frontend. It bridges professors and students by turning uploaded course notes into:
1. **An Interactive Socratic Tutor** that uses guided questioning rather than direct answers.
2. **An Emergency Exam Triage Optimizer** that generates 70/20/10 high-yield survival plans for students under time pressure.
3. **A Curriculum & Doubts Dashboard** for teachers to upload syllabi, monitor questions flagged as out-of-syllabus, and broadcast clarifications.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + Vite 6 | Fast HMR, single-page application structure |
| **Frontend Styling** | Vanilla CSS / Inline Design System | Plus Jakarta Sans typography, soft pastel color palette, charcoal pill buttons |
| **Icons** | `lucide-react` | Modern icon set for education widgets |
| **Backend Framework** | FastAPI + Uvicorn | Async Python API running on `http://localhost:8000` with full CORS support |
| **Vector Database** | ChromaDB (`./chroma_db`) | Local persistent vector storage on disk |
| **Embedding Model** | `BAAI/bge-small-en-v1.5` | SentenceTransformers (384 dimensions, cosine distance) |
| **LLM Inference** | Groq Cloud API | Model: `qwen-2.5-32b` for rapid reasoning and JSON-mode triage plans |
| **PDF Extraction** | `pypdf` | Multi-page text extraction with 500c chunks & 50c overlap |
| **Testing** | `test_rag.py` & `cli.py` | Automated test suite and terminal interactive REPL |

---

## 📁 Repository Structure

```
AcademicAI_RAG/
├── main.py                     # FastAPI backend (endpoints: /upload, /ask-socratic, /triage, /)
├── cli.py                      # Interactive Command Prompt / Terminal REPL client
├── test_rag.py                 # Automated end-to-end test suite
├── requirements.txt            # Pinned Python dependencies
├── .env                        # Secrets (GROQ_API_KEY) — gitignored
├── .env.example                # Safe commit template
├── .gitignore                  # Excludes .env, chroma_db/, node_modules/, etc.
├── README.md                   # Full documentation with setup and API guides
├── CONTEXT.md                  # This architecture log and project state tracker
├── chroma_db/                  # Persistent ChromaDB vector database directory
├── notes/                      # Academic PDFs and test materials
└── frontend/                   # Complete React SPA
    ├── index.html              # HTML entry point (Plus Jakarta Sans & Inter)
    ├── package.json            # React 19, Vite 6, lucide-react
    ├── vite.config.js          # Vite configuration
    └── src/
        ├── main.jsx            # React root mount
        ├── index.css           # Global typography, animations, reset
        └── App.jsx             # Single-file SPA with role-based dashboards
```

---

## 🎨 UI Design System & Aesthetics

Inspired by modern, friendly mobile education apps:
- **Palette**:
  - Soft Lavender / Lilac (`#EFE6FA`): Identity, Socratic tutor bubbles, navigation accents
  - Mint Sage (`#DEF1EA`): Curriculum chunks, quick wins, resolution indicators
  - Butter Yellow (`#FEF7DC`): Study time, countdown sliders
  - Soft Rose / Coral (`#FDEAE8`): Out-of-syllabus alerts, high-yield core topics
- **Components**:
  - High-contrast charcoal pill buttons (`#1F1B28`, `border-radius: 9999px`) with adjacent circular arrow buttons (`→`, `↗`)
  - Squircle icon containers with crisp white backgrounds
  - Large rounded cards (`border-radius: 24px`–`28px`) with soft drop shadows
  - Profile card in sidebar with avatar circle, open book icon, and pill progress meter

---

## 👥 Role-Based Workspaces

### 1. Teacher Workspace (Prof. Alex)
- **Top Metrics**:
  - 📖 **Course Syllabus**: Chunks indexed in ChromaDB.
  - 🛡️ **Raised Student Queries**: Pending out-of-syllabus doubts flagged by AI guardrails.
  - 🧠 **AI Autonomous Rate**: Percentage of questions resolved without teacher intervention.
- **Workflow**:
  - Upload syllabus / lecture notes PDF with auto-chunking.
  - Live **Raised Student Doubts Dashboard** directly below upload dropzone:
    - View student inquiries that the AI could not answer from course notes.
    - View student avatars and timestamp.
    - Type an inline clarification and click `[ Send Clarification → ]`.
    - Updates query status to `✓ Clarification Broadcasted` and decreases pending counter.

### 2. Student Workspace (Alex Rivera)
- **Top Metrics**:
  - 📄 **Syllabus Knowledge**: Available vectors for Q&A.
  - ⏱️ **Exam Countdown**: Hours remaining in triage study mode.
  - ✨ **Socratic AI Retrieval**: Precision rate of notes-grounded answers.
- **Workflow**:
  - **Socratic Tutor**: Ask questions via interactive chat with starter prompts; AI asks follow-up intuition questions and cites specific source chunks.
  - **Emergency Exam Triage**: Input subject, hours left, and weak topics; AI generates a 70/20/10 study strategy (High-Yield Core, Quick Wins, Skip For Now).

---

## 🔄 API Specification

| Endpoint | Method | Input | Output / Behavior |
| :--- | :--- | :--- | :--- |
| `GET /` | `GET` | None | Health check & document count in vector store |
| `POST /upload` | `POST` | `multipart/form-data` with `file: PDF` | Chunks text (500c / 50c overlap), embeds with BGE, saves to ChromaDB |
| `POST /ask-socratic` | `POST` | `{"question": string}` | Top-3 chunk retrieval. If cosine distance > 0.7 → `not_in_syllabus` (escalate). Else → Groq Socratic response with source citations. |
| `POST /triage` | `POST` | `{"subject": string, "hours_left": int, "weak_topics": list[string]}` | Groq JSON mode generating `high_yield_core`, `quick_wins`, and `skip_list` |

---

## 📈 Development History & Milestones

- **Phase 1: Backend Foundation ✅**
  - Built FastAPI application with Groq integration and SentenceTransformers embedding model.
- **Phase 2: Persistent Vector Storage ✅**
  - Initialized persistent ChromaDB client on disk (`./chroma_db`), resolving session loss between restarts.
- **Phase 3: Socratic & Triage Logic ✅**
  - Implemented distance threshold guardrail (> 0.7) for out-of-syllabus queries.
  - Created Socratic system prompt enforcing guided questioning.
  - Created Pareto 80/20 triage prompt with JSON schema output.
- **Phase 4: Frontend Development ✅**
  - Scaffolded React 19 + Vite 6 app with `lucide-react`.
  - Implemented responsive single-page architecture connecting to backend at port 8000.
- **Phase 5: Pastel UI Redesign ✅**
  - Shifted from dark corporate theme to user-requested soft pastel aesthetic (lavender, mint, yellow, rose).
  - Adopted Plus Jakarta Sans font and charcoal pill buttons with circular arrow accents.
- **Phase 6: Role Differentiation & Teacher Dashboard ✅**
  - Separated Teacher and Student top metrics.
  - Integrated live **Raised Student Doubts Dashboard** directly into the Teacher view with interactive clarification broadcasting.
  - Connected real-time escalation so out-of-syllabus questions in student sessions appear on the teacher's dashboard.

---

## 🚀 Running the Project

- **Backend**: `python main.py` (running on `http://localhost:8000`)
- **Frontend**: `cd frontend && npm run dev` (running on `http://localhost:5173`)
- **CLI Client**: `python cli.py`
- **Unit Tests**: `python test_rag.py`
