# ClassConnect — Academic Intelligence & Smart Campus Platform

ClassConnect is a full-stack educational operations and learning platform that unites **Retrieval-Augmented Academic Intelligence** with **Automated AI Face-Recognition Attendance** and **Role-Based Campus Administration**.

Built with a high-performance **FastAPI + Motor (MongoDB) + ChromaDB + Groq + InsightFace** backend and an aesthetic **React 19 + Vite 6** frontend styled in an educational pastel design system.

---

## 📑 Table of Contents

- [Core Capabilities](#-core-capabilities)
  - [1. Academic Intelligence (RAG Engine)](#1-academic-intelligence-rag-engine)
  - [2. Smart Attendance & Face Recognition](#2-smart-attendance--face-recognition)
  - [3. Role-Based Access Control & Onboarding](#3-role-based-access-control--onboarding)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Quick Start](#-installation--quick-start)
  - [Step 1: Database Setup (MongoDB)](#step-1-database-setup-mongodb)
  - [Step 2: Environment Configuration](#step-2-environment-configuration)
  - [Step 3: Backend Setup & Dependencies](#step-3-backend-setup--dependencies)
  - [Step 4: Seed Initial Admin Account](#step-4-seed-initial-admin-account)
  - [Step 5: Run FastAPI Backend](#step-5-run-fastapi-backend)
  - [Step 6: Frontend Setup & Launch](#step-6-frontend-setup--launch)
- [User Roles & Workflows](#-user-roles--workflows)
  - [🛡️ Administrator Workflow](#️-administrator-workflow)
  - [👨‍🏫 Teacher Workflow](#-teacher-workflow)
  - [👨‍🎓 Student Workflow & Onboarding](#-student-workflow--onboarding)
- [REST API Reference](#-rest-api-reference)
  - [Authentication & Onboarding](#authentication--onboarding)
  - [Administration](#administration)
  - [Face Registration & Attendance](#face-registration--attendance)
  - [Academic Intelligence (RAG)](#academic-intelligence-rag)
- [Developer Utilities & Testing](#-developer-utilities--testing)
- [Project Directory Structure](#-project-directory-structure)
- [License](#-license)

---

## 🌟 Core Capabilities

### 1. Academic Intelligence (RAG Engine)
- 📄 **Curriculum Ingestion** — Upload course syllabi, lecture slides, and notes (PDF). Documents are automatically split into ~500-character chunks with 50-character overlap, vectorized using `BAAI/bge-small-en-v1.5` dense embeddings (384 dimensions), and stored in persistent ChromaDB (`./chroma_db`).
- 🧠 **Interactive Socratic Tutor** — Never spoils answers. Guides students step-by-step using progressive questioning and intuition prompts, strictly grounded in the professor's notes with exact source citations.
- 🛡️ **Out-of-Syllabus Guardrail & Escalation** — If a student's inquiry is outside the course scope (cosine distance > 0.7 against indexed syllabus chunks), the AI safely refuses to answer and automatically escalates the query directly to the professor's live dashboard without consuming LLM tokens.
- 💬 **Live Teacher Doubts Broadcast** — Teachers review student questions that exceeded syllabus bounds, type inline clarifications, and broadcast them back to students with live resolution statuses.
- ⚡ **Emergency Exam Triage** — Facing an upcoming exam deadline? Input the subject, remaining preparation hours, and weak topics to generate an optimized **Pareto 70/20/10 Survival Plan** via Groq JSON mode:
  - 🔥 **High-Yield Core** (Spend 70% of study time here)
  - ⚡ **Quick Wins** (Definitions, formulas, key terminology)
  - ⏭️ **Skip For Now** (Low ROI topics to skip given time constraints)

### 2. Smart Attendance & Face Recognition
- 👁️ **Deep Metric Face Embeddings** — Integrated with **InsightFace** (`buffalo_l` model pack: RetinaFace for 5-point landmark detection + ArcFace R100 for 512-dimensional face embeddings).
- 📸 **Interactive 20-Pose Student Enrollment** — Guides students through a 20-step pose calibration (looking straight, tilting left/right, smiling, looking up/down). Rejects images with multiple faces or no faces, requiring a minimum of **15 verified embeddings** before student registration is finalized.
- 🏫 **One-Shot Classroom Photo Attendance** — Teachers take or upload a single photo of the classroom. The system detects all faces, extracts 512-D embeddings, and computes cosine similarities against registered students enrolled in that class.
- 🎯 **Configurable Similarity Threshold** — Faces matching above `SIMILARITY_THRESHOLD = 0.45` are recorded as **Present** with matched confidence; unrecognized faces are cataloged as **Unknown**.
- 📊 **Attendance History & Audits** — Teachers can inspect attendance history per class session. Students have access to personal logs showing attendance history per course.

### 3. Role-Based Access Control & Onboarding
- 🔐 **JWT-Based Authentication** — Stateless 24-hour JSON Web Tokens with encrypted bcrypt password hashing.
- 🚦 **Mandatory Multi-Step Onboarding Enforcement**:
  1. **Account Creation**: Admin creates user accounts with auto-generated college emails (`name@classconnect.edu`) and temporary passwords.
  2. **First Login**: User logs in with temporary credentials.
  3. **Forced Password Change**: Access to all application features is blocked by backend middleware until the user updates their password (`POST /auth/change-password`).
  4. **Biometric Registration**: Students are automatically routed to the guided 20-pose camera enrollment before reaching their dashboard.
  5. **Role Dashboard**: Directs users to their respective workspace: Admin, Teacher, or Student.

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────┐
                                  │  ClassConnect Frontend │
                                  │  (React 19 + Vite 6)   │
                                  │ http://localhost:5173  │
                                  └───────────┬────────────┘
                                              │ HTTP / JSON / Multipart
                                              ▼
                                  ┌────────────────────────┐
                                  │    FastAPI Backend     │
                                  │ http://localhost:8000  │
                                  └───────────┬────────────┘
                                              │
         ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
         ▼                  ▼                 ▼                 ▼                  ▼
┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│  MongoDB (Motor)│ │  ChromaDB    │ │   InsightFace   │ │SentenceTrans-│ │  Groq Cloud  │
│ users, classes, │ │ Vector Store │ │ RetinaFace +    │ │   formers    │ │  API Engine  │
│ studentProfiles,│ │ Academic RAG │ │  ArcFace R100   │ │ BAAI/bge-    │ │ qwen3.8-27b  │
│ faceEmbeddings, │ │ course notes │ │ (512-D vectors) │ │ small-en     │ │ Socratic &   │
│ attendanceRecs  │ │              │ │                 │ │ (384-D)      │ │ Exam Triage  │
└─────────────────┘ └──────────────┘ └─────────────────┘ └──────────────┘ └──────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 6, React Router 7 | Responsive Single-Page Application (SPA) |
| **Styling** | Tailwind CSS v4, Lucide React, Pastel Design Tokens | Aesthetic educational UI (Lavender, Mint, Yellow, Rose) |
| **Backend Framework**| FastAPI, Uvicorn (ASGI) | Asynchronous RESTful API server |
| **Primary Database** | MongoDB (via Motor async driver) | Users, classes, profiles, attendance records, face embeddings |
| **Vector Database** | ChromaDB (`./chroma_db`) | Local persistent vector store for course syllabus chunks |
| **Text Embeddings** | `BAAI/bge-small-en-v1.5` (SentenceTransformers) | 384-dimensional dense semantic text vectors |
| **Computer Vision** | InsightFace (`buffalo_l`), ONNX Runtime, OpenCV | RetinaFace face detection & ArcFace R100 512-D face embeddings |
| **LLM Provider** | Groq Cloud API (`qwen/qwen3.8-27b`) | Low-latency Socratic reasoning and JSON-mode exam triage |
| **Auth & Security** | `bcrypt`, `python-jose` | Salted password hashing, JWT generation & verification |
| **PDF Extraction** | `pypdf` | Multi-page text extraction from academic documents |

---

## 📋 Prerequisites

Before running ClassConnect, ensure you have installed:

- **Python 3.10 to 3.12** (Python 3.10+ recommended)
- **Node.js 18+** and **npm**
- **MongoDB** (running locally on `mongodb://localhost:27017` or a MongoDB Atlas URI)
- A free **Groq Cloud API Key** (from [console.groq.com](https://console.groq.com))
- A functional **Webcam** (for student face registration)

---

## 🚀 Installation & Quick Start

### Step 1: Database Setup (MongoDB)

Make sure MongoDB is running locally:
```bash
# Verify MongoDB service status (Windows PowerShell)
Get-Service MongoDB

# Or start MongoDB service if stopped
net start MongoDB
```
*(If using MongoDB Atlas or a custom port, set the connection string in your `.env` file.)*

---

### Step 2: Environment Configuration

Create a `.env` file in the root directory of the project (you can copy `.env.example`):

```bash
# In project root
cp .env.example .env
```

Populate `.env` with your settings:
```env
# Groq API Key (required for Socratic Tutor & Exam Triage)
GROQ_API_KEY=gsk_your_actual_groq_api_key_here

# MongoDB Connection URI
MONGODB_URI=mongodb://localhost:27017

# JWT Secret for Signing Tokens (change in production)
JWT_SECRET=classconnect-dev-secret-change-in-production
```

---

### Step 3: Backend Setup & Dependencies

Set up a Python virtual environment and install dependencies:

```bash
# From repository root
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
# source venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

> [!NOTE]
> On the first run, the system will automatically download:
> - The `BAAI/bge-small-en-v1.5` text embedding model (~130 MB, cached locally).
> - The InsightFace `buffalo_l` vision models (~300 MB, cached under `~/.insightface/models/`).

---

### Step 4: Seed Initial Admin Account

To quickly bootstrap an administrator account without manual API calls, run the included `seed.py` script:

```bash
python seed.py
```

This creates the default administrator credentials:
- **Email:** `admin@classconnect.edu`
- **Password:** `admin123`

You can also specify custom credentials:
```bash
python seed.py --email myadmin@classconnect.edu --password MySecurePassword123
```

---

### Step 5: Run FastAPI Backend

Start the FastAPI application with Uvicorn:

```bash
python main.py
```

- **Backend API:** `http://localhost:8000`
- **Interactive Swagger Documentation:** `http://localhost:8000/docs`
- **Alternative ReDoc Documentation:** `http://localhost:8000/redoc`
- **Health Check Endpoint:** `GET http://localhost:8000/`

---

### Step 6: Frontend Setup & Launch

In a new terminal window, navigate to the `frontend` folder and start Vite:

```bash
cd frontend
npm install
npm run dev
```

- **Web Application URL:** **`http://localhost:5173/`**
- Log in using your seeded admin credentials (`admin@classconnect.edu` / `admin123`).

---

## 👥 User Roles & Workflows

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      ADMIN      │       │     TEACHER     │       │     STUDENT     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ • Create Classes│       │ • Upload Notes  │       │ • Password Reset│
│ • Create Users  │──────►│ • Mark Attend.  │       │ • 20-Pose Face  │
│ • Track Progress│       │ • Resolve Doubts│◄─────►│   Registration  │
│                 │       │                 │       │ • Socratic Tutor│
│                 │       │                 │       │ • Exam Triage   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### 🛡️ Administrator Workflow
1. Log in at `http://localhost:5173/login` using `admin@classconnect.edu`.
2. Under the **Classes** tab, click **Create Class** (e.g., `CS-101 Introduction to CS`).
3. Under the **Students** tab, click **Create Account**:
   - Provide the user's full name, role (`student` or `teacher`), and assign a class.
   - The system automatically generates a college email (e.g., `john.doe@classconnect.edu`) and a secure temporary password.
4. Distribute the temporary credentials to the user.
5. Track real-time onboarding progression (`passwordChanged`, `faceRegistrationStatus: pending | partial | completed`).

---

### 👨‍🏫 Teacher Workflow
1. Log in with teacher credentials.
2. **Attendance Management**:
   - Select your assigned class from the dropdown.
   - Take or upload a classroom photo (`.jpg`, `.png`, or `.webp`).
   - Click **Upload & Mark**: the system identifies all students present, counts unknown attendees, and stores the lecture record.
   - Review the lecture attendance ledger and attendance statistics.
3. **Curriculum & Academic Intelligence**:
   - Navigate to the **RAG Tutor** (`/app`) via the top-right button.
   - Upload course lecture notes / syllabus PDF.
   - Monitor the **Live Raised Doubts** panel: inspect queries that students asked that fell outside the syllabus.
   - Type an inline clarification and click **Send Clarification** to broadcast the answer to enrolled students.

---

### 👨‍🎓 Student Workflow & Onboarding
1. **First-Time Sign In**:
   - Enter your `@classconnect.edu` email and temporary password provided by the administrator.
2. **Mandatory Step 1 — Change Password**:
   - You will be automatically redirected to `/change-password`.
   - Set a new private password.
3. **Mandatory Step 2 — Guided Biometric Registration**:
   - You will be guided to `/face-registration`.
   - Allow camera access. Follow the on-screen 20-pose guide (neutral, tilt left, tilt right, smile, etc.).
   - The system processes each frame:
     - 0 faces → Rejected (`No face detected`)
     - >1 faces → Rejected (`Multiple faces detected`)
     - 1 face → Accepted (Embedding extracted)
   - Once at least 15 valid embeddings are registered, status marks **Completed**.
4. **Student Dashboard & Learning**:
   - Access **My Attendance Records** to view verified lecture attendance.
   - Switch to the **RAG Tutor Workspace** (`/app`):
     - **Interactive Socratic Tutor**: Ask questions on course topics. Receive hints and guided queries with source citations.
     - **Emergency Exam Triage**: Enter remaining hours and weak topics to receive a high-yield study plan.

---

## 📡 REST API Reference

Interactive OpenAPI documentation is available live at `http://localhost:8000/docs`.

### Authentication & Onboarding

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/bootstrap-admin` | Creates initial admin if `users` collection is empty | No |
| `POST` | `/auth/login` | Authenticates email + password, returns 24h JWT | No |
| `POST` | `/auth/change-password` | Updates password and clears temporary password flag | Bearer Token |
| `GET` | `/me/next-step` | Returns required onboarding step (`password_change`, `face_registration`, `dashboard`) | Bearer Token |

#### `POST /auth/login` Request Body:
```json
{
  "email": "admin@classconnect.edu",
  "password": "admin123"
}
```

---

### Administration

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/admin/create-account` | Creates student/teacher, generates email & temp password | Admin |
| `GET` | `/admin/students` | Lists all students with onboarding & face status | Admin |
| `POST` | `/admin/create-class` | Creates a new academic class | Admin |
| `GET` | `/admin/classes` | Lists all classes with student and teacher counts | Admin / Teacher |

#### `POST /admin/create-account` Request Body:
```json
{
  "name": "Jane Smith",
  "role": "student",
  "classId": "65f1234abcd56789ef012345"
}
```

---

### Face Registration & Attendance

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/face/register` | Uploads up to 20 images to register face embeddings | Student |
| `POST` | `/attendance/mark` | Marks attendance from classroom photo via multipart form | Teacher / Admin |
| `GET` | `/attendance/records` | Returns attendance records for a given `classId` | Teacher / Admin |
| `GET` | `/attendance/my-records` | Returns authenticated student's attendance records | Student |

#### `POST /attendance/mark` Form Parameters:
- `classId`: MongoDB ObjectId of the target class
- `file`: Classroom image (`multipart/form-data`)

**Sample Response:**
```json
{
  "lectureId": "8f3d1b82-411a-4ab7-b8db-8c7042a1b183",
  "classId": "65f1234abcd56789ef012345",
  "date": "2026-09-11",
  "totalFacesDetected": 24,
  "presentCount": 22,
  "unknownCount": 2,
  "results": [
    {
      "studentId": "65f1234...",
      "studentName": "Jane Smith",
      "similarity": 0.78,
      "matched": true
    }
  ]
}
```

---

### Academic Intelligence (RAG)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/upload` | Upload PDF notes; chunks and embeds into ChromaDB | Public / Teacher |
| `POST` | `/ask-socratic` | Socratic tutor Q&A with syllabus distance guardrail | Public / Student |
| `POST` | `/triage` | Generates 70/20/10 exam survival study plan | Public / Student |
| `GET` | `/` | Health check & ChromaDB document index count | Public |

#### `POST /ask-socratic` Example:
```bash
curl -X POST http://localhost:8000/ask-socratic \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the function of the hippocampus in memory consolidation?"}'
```

**Response (Grounded in Course Notes):**
```json
{
  "answer": "The course materials highlight the medial temporal lobe's role in converting short-term experiences into lasting structural changes. What brain region receives these stabilized memories for long-term storage?",
  "status": "success",
  "sources": [
    "Cognitive_Neuroscience.pdf: The hippocampus coordinates memory consolidation by gradually training neocortical networks..."
  ]
}
```

**Response (Out of Syllabus — Escalated to Teacher):**
```json
{
  "answer": "ESCALATE",
  "status": "not_in_syllabus"
}
```

---

## 🧪 Developer Utilities & Testing

The repository includes standalone scripts to expedite testing and inspection:

### 1. Reset / Seed Admin Credentials (`seed.py`)
Directly manipulates MongoDB to guarantee a known administrative login:
```bash
python seed.py --email admin@classconnect.edu --password admin123
```

### 2. Inspect Registered Users (`check_users.py`)
Quickly prints all users, their roles, and ObjectIDs stored in MongoDB:
```bash
python check_users.py
```

### 3. Automated RAG Test Suite (`test_rag.py`)
Tests document uploading, Socratic questioning, distance threshold guards, and triage logic:
```bash
python test_rag.py
```

### 4. Interactive Terminal REPL (`cli.py`)
Test the Socratic tutor and exam triage engine directly from your terminal:
```bash
python cli.py
```

---

## 📁 Project Directory Structure

```
ClassConnect/
├── main.py                     # FastAPI application (RAG routes + attendance routers)
├── seed.py                     # Admin account bootstrapping & credential reset
├── check_users.py              # MongoDB user inspection tool
├── cli.py                      # Interactive terminal client for RAG Q&A
├── test_rag.py                 # Automated RAG end-to-end test suite
├── requirements.txt            # Pinned backend dependencies
├── .env.example                # Template for environment variables
├── .env                        # Local secrets (API keys, MongoDB URI) - gitignored
├── README.md                   # Comprehensive documentation
├── CONTEXT.md                  # Development log and architecture context
├── chroma_db/                  # Local persistent ChromaDB vector store
├── notes/                      # Course PDF files for testing
│
├── attendance/                 # Smart Attendance & Identity Package
│   ├── __init__.py
│   ├── auth.py                 # JWT token creation, password hashing, route guards
│   ├── database.py             # Motor async MongoDB client & index initialization
│   ├── models.py               # Pydantic schemas (Auth, Admin, Face, Attendance)
│   ├── face_adapter.py         # Sys.path bridge & byte-level image processing
│   ├── router_auth.py          # /auth/login, /auth/change-password, /me/next-step
│   ├── router_admin.py         # /admin/create-account, /admin/classes, etc.
│   ├── router_registration.py  # /face/register (20-pose validation)
│   └── router_attendance.py    # /attendance/mark, /attendance/records
│
├── Face_recognition/           # Computer Vision & Recognition Core
│   ├── config.py               # InsightFace model pack & similarity threshold (0.45)
│   ├── requirements.txt        # Vision-specific dependencies
│   └── core/
│       ├── detector.py         # RetinaFace face detection & alignment
│       ├── embedder.py         # ArcFace R100 512-D embedding extraction
│       ├── recognizer.py       # Cosine similarity matching logic
│       └── registration.py     # Multi-image enrollment routines
│
└── frontend/                   # React 19 + Vite 6 Application
    ├── index.html              # HTML entry point (Plus Jakarta Sans font)
    ├── package.json            # Frontend dependencies
    ├── vite.config.js          # Vite configuration
    └── src/
        ├── main.jsx            # React root mount (BrowserRouter + AuthProvider)
        ├── index.css           # Global pastel theme tokens & animations
        ├── App.jsx             # Main routing & Socratic RAG interface (/app)
        ├── components/
        │   └── ProtectedRoute.jsx  # Route guard checking JWT authentication
        ├── hooks/
        │   └── useAuth.jsx     # Auth context, token storage & next-step routing
        └── pages/
            ├── LoginPage.jsx            # Login form with auto-redirect
            ├── ChangePasswordPage.jsx   # Forced password change on onboarding
            ├── FaceRegistrationPage.jsx # 20-pose interactive webcam enrollment
            └── DashboardPage.jsx        # Admin, Teacher, and Student dashboards
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
