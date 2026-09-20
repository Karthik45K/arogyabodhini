# 🏥 MediAI — AI Healthcare Assistant

> A full-stack AI-powered healthcare assistant that analyzes patient symptoms in real time, predicts possible conditions, and recommends the most suitable specialist doctors.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Directory Structure](#directory-structure)
- [Frontend Components](#frontend-components)
- [Backend API](#backend-api)
- [Data Flow](#data-flow)
- [Environment Variables](#environment-variables)
- [How to Run](#how-to-run)
- [API Reference](#api-reference)
- [Roadmap](#roadmap)

---

## Overview

MediAI is a modern healthcare web application built with **React + Vite** on the frontend and **Node.js/Express** on the backend. Users can describe their symptoms (via text or voice), and the system analyzes them using a keyword-scoring engine to return:

- 🦠 Possible disease predictions
- 👨‍⚕️ Recommended medical specialist
- ⚠️ Severity level & urgency notes
- 🚨 Emergency flag for life-threatening symptoms
- 📅 Available nearby doctors sorted by availability

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI component library |
| Vite 5 | Build tool & dev server (port `3000`) |
| React Router DOM v6 | Client-side routing |
| Web Speech API | Voice input (speech-to-text) |
| Vanilla CSS | Styling (no framework) |

### Backend
| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express 4 | HTTP server & routing |
| CORS | Cross-origin request handling |
| dotenv | Environment variable management |
| nodemon | Hot-reloading in development |

---

## Project Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Port 3000)                     │
│                                                                 │
│   ┌──────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│   │  Navbar  │   │     Hero     │   │    SymptomInput      │   │
│   └──────────┘   └──────────────┘   │  (Text + Voice)      │   │
│                                     └──────────┬───────────┘   │
│   ┌──────────────────────────┐                 │               │
│   │     FeatureCards         │                 │ POST /api/    │
│   └──────────────────────────┘                 │ analyze-      │
│   ┌──────────────────────────┐                 │ symptoms      │
│   │  DoctorCard / Analysis   │ ◄───────────────┘               │
│   │       Result             │                                  │
│   └──────────────────────────┘                                  │
│   ┌──────────┐                                                   │
│   │  Footer  │                                                   │
│   └──────────┘                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │  Vite Proxy  /api → :5000
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express Server (Port 5000)                   │
│                                                                 │
│   ┌─────────────────┐    ┌──────────────────────────────────┐  │
│   │  /health route  │    │       /api router                │  │
│   └─────────────────┘    │  POST /api/analyze-symptoms      │  │
│                          └──────────────┬───────────────────┘  │
│                                         │                       │
│                          ┌──────────────▼───────────────────┐  │
│                          │     symptomsController.js         │  │
│                          │  ┌─────────────────────────────┐ │  │
│                          │  │  analyzeSymptomText()        │ │  │
│                          │  │  (keyword scoring engine)    │ │  │
│                          │  └──────────────┬──────────────┘ │  │
│                          │                 │                 │  │
│                          │  ┌──────────────▼──────────────┐ │  │
│                          │  │  getRecommendedDoctors()     │ │  │
│                          │  └─────────────────────────────┘ │  │
│                          └──────────────────────────────────┘  │
│                                                                 │
│  Data Layer:  mockData.js (SYMPTOM_MAP)  │  doctorsData.js      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
Ai-healthcare-assistant/
│
├── index.html                    # Vite HTML entry point
├── vite.config.js                # Vite config + API proxy to :5000
├── package.json                  # Frontend dependencies & scripts
│
├── public/
│   └── favicon.svg               # App icon
│
├── src/                          # ── FRONTEND ──
│   ├── main.jsx                  # React DOM root render
│   ├── App.jsx                   # Root component, page layout
│   │
│   ├── components/
│   │   ├── Navbar/               # Top navigation bar
│   │   ├── Hero/                 # Landing hero section
│   │   ├── SymptomInput/         # Text + voice symptom entry form
│   │   ├── AnalysisResult/       # Displays AI analysis output
│   │   ├── FeatureCards/         # Feature highlights section
│   │   ├── DoctorCard/           # Recommended doctor cards
│   │   └── Footer/               # Page footer
│   │
│   ├── hooks/
│   │   └── useSpeechRecognition.js   # Custom hook: Web Speech API
│   │
│   ├── services/
│   │   ├── api.js                # Fetch wrapper for backend calls
│   │   └── speechService.js      # Speech-to-text service layer
│   │
│   └── styles/
│       ├── index.css             # Global design system & variables
│       └── App.css               # Root app layout styles
│
└── server/                       # ── BACKEND ──
    ├── package.json              # Backend dependencies & scripts
    ├── .env                      # Environment variables
    │
    └── src/
        ├── server.js             # HTTP server entry point (port 5000)
        ├── app.js                # Express app: CORS, middleware, routes
        │
        ├── routes/
        │   └── symptoms.js       # Route: POST /api/analyze-symptoms
        │
        ├── controllers/
        │   ├── symptomsController.js    # Core AI analysis logic
        │   └── appointmentController.js # Appointment booking (stub)
        │
        ├── middleware/
        │   └── errorHandler.js   # Global Express error handler
        │
        └── data/
            ├── mockData.js       # SYMPTOM_MAP, EMERGENCY_PATTERNS
            └── doctorsData.js    # Mock doctor profiles & availability
```

---

## Frontend Components

| Component | Description |
|---|---|
| `Navbar` | Responsive top navigation with the MediAI brand |
| `Hero` | Full-screen landing section with CTA |
| `SymptomInput` | Text area + voice recording input; sends data to backend |
| `AnalysisResult` | Renders disease predictions, severity badge, urgency notes |
| `FeatureCards` | Highlights key platform features (AI, voice, 24/7, etc.) |
| `DoctorCard` | Displays recommended doctors with availability status |
| `Footer` | Site-wide footer with links |

### Custom Hook — `useSpeechRecognition`
Wraps the browser's **Web Speech API** to provide:
- `isListening` state
- `transcript` (live text output)
- `startListening()` / `stopListening()` controls
- Cross-browser fallback handling

### Services
| File | Responsibility |
|---|---|
| `services/api.js` | Centralised `fetch` wrapper — calls `POST /api/analyze-symptoms` |
| `services/speechService.js` | Initialises `SpeechRecognition`, handles events & errors |

---

## Backend API

### Symptom Analysis Engine (`symptomsController.js`)

The core logic uses a **keyword scoring algorithm**:

1. **Emergency Check** — Scans for high-priority keywords (e.g., chest pain, breathlessness). Sets `emergencyFlag = true` and escalates severity.
2. **Keyword Scoring** — Each entry in `SYMPTOM_MAP` is scored by how many of its keywords appear in the symptom text.
3. **Best Match** — The highest-scoring entry wins.
4. **Confidence Score** — Calculated as `min(95, 40 + (matchedKeywords / totalKeywords) × 55)`.
5. **Doctor Recommendation** — Filters the `DOCTORS` dataset by matching specialist type, sorted by availability (`now → today → tomorrow`).

### Middleware
| Middleware | Purpose |
|---|---|
| `cors` | Allows requests from `localhost:3000` and `localhost:3001` |
| `express.json` | Parses JSON request bodies (limit: 50 KB) |
| Request Logger | Logs `METHOD /path` to console in dev mode |
| `errorHandler` | Catches unhandled errors and returns JSON error responses |
| 404 Handler | Returns structured `NOT_FOUND` JSON for unknown routes |

---

## Data Flow

```
User types/speaks symptoms
        │
        ▼
SymptomInput component
        │  calls analyzeSymptoms() from services/api.js
        ▼
POST /api/analyze-symptoms  (via Vite proxy)
        │
        ▼
Express Router → symptomsController.analyzeSymptoms()
        │
        ├─► analyzeSymptomText(symptoms)
        │       ├─ Emergency pattern scan
        │       ├─ Keyword scoring over SYMPTOM_MAP
        │       └─ Returns: diseases, specialist, severity, confidence
        │
        └─► getRecommendedDoctors(specialist, emergencyFlag)
                └─ Returns: filtered & sorted doctor list
        │
        ▼
JSON Response → React state → AnalysisResult + DoctorCard render
```

---

## Environment Variables

Create `server/.env` (already included):

```env
PORT=5000
NODE_ENV=development
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Port the Express server listens on |
| `NODE_ENV` | `development` | Enables request logging when not `production` |

---

## How to Run

### Prerequisites

Make sure the following are installed on your machine:

- [Node.js](https://nodejs.org/) **v18+**
- npm **v9+** (comes with Node.js)

Verify:
```bash
node -v
npm -v
```

---

### Step 1 — Clone / Open the Project

```bash
cd Ai-healthcare-assistant
```

---

### Step 2 — Start the Backend (Express API)

Open a terminal and run:

```bash
# Navigate into the server folder
cd server

# Install backend dependencies (first time only)
npm install

# Start the backend in development mode (with hot-reload)
npm run dev
```

You should see:

```
  ╔══════════════════════════════════════════╗
  ║        MediAI Backend  —  Phase 2        ║
  ╠══════════════════════════════════════════╣
  ║  Server  : http://localhost:5000          ║
  ║  Health  : http://localhost:5000/health   ║
  ║  API     : http://localhost:5000/api      ║
  ╚══════════════════════════════════════════╝
```

**Verify the backend is healthy:**
```
GET http://localhost:5000/health
```

---

### Step 3 — Start the Frontend (React + Vite)

Open a **new terminal** (keep the backend running) and run:

```bash
# From the project root (Ai-healthcare-assistant/)
npm install      # first time only

npm run dev
```

Vite will start the dev server and open the app automatically:

```
  VITE v5.x  ready in XXX ms

  ➜  Local:   http://localhost:3000/
```

> The Vite dev server proxies all `/api/*` requests to `http://localhost:5000` automatically — no CORS issues in development.

---

### Step 4 — Use the App

1. Open **http://localhost:3000** in your browser
2. Type your symptoms in the text box (e.g., *"I have chest pain and difficulty breathing"*)
3. Or click the **microphone** icon to use voice input
4. Click **Analyze** — the system returns predictions, severity, and recommended doctors

---

### Running Both Servers Together (Optional)

You can use two terminals, or install `concurrently` to run both with one command:

```bash
# From project root
npm install -D concurrently

# Then add to root package.json scripts:
# "dev:all": "concurrently \"cd server && npm run dev\" \"npm run dev\""

npm run dev:all
```

---

### Available Scripts

**Frontend (root)**
| Script | Command | Description |
|---|---|---|
| Dev server | `npm run dev` | Starts Vite on port 3000 |
| Build | `npm run build` | Bundles for production |
| Preview | `npm run preview` | Previews production build |

**Backend (`/server`)**
| Script | Command | Description |
|---|---|---|
| Dev (hot-reload) | `npm run dev` | Starts with nodemon |
| Production | `npm start` | Starts with plain node |

---

## API Reference

### `POST /api/analyze-symptoms`

Analyze a symptom description and return AI predictions.

**Request Body**
```json
{
  "symptoms": "I have a severe headache and fever",
  "language": "en"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `symptoms` | `string` | ✅ | Min 3, max 2000 characters |
| `language` | `string` | ❌ | ISO code (default: `"en"`) |

**Success Response `200`**
```json
{
  "success": true,
  "data": {
    "possibleDiseases": ["Migraine", "Viral Fever", "Meningitis"],
    "recommendedSpecialist": "Neurologist",
    "severity": "Moderate",
    "urgencyNote": "Please consult a doctor within 24 hours.",
    "emergencyFlag": false,
    "confidence": 78,
    "recommendedDoctors": [ ... ],
    "language": "en",
    "analyzedAt": "2026-08-06T12:00:00.000Z"
  }
}
```

**Error Response `400`**
```json
{
  "success": false,
  "error": "INVALID_INPUT",
  "message": "Field \"symptoms\" must be a string of at least 3 characters."
}
```

---

### `GET /health`

Health check endpoint.

```json
{
  "status": "ok",
  "service": "MediAI Backend",
  "version": "2.0.0",
  "env": "development"
}
```

---

## Roadmap

| Phase | Status | Features |
|---|---|---|
| Phase 1 | ✅ Done | React UI, Hero, Navbar, SymptomInput, FeatureCards, DoctorCard |
| Phase 2 | ✅ Done | Express backend, symptom analysis engine, CORS, doctor recommendations |
| Phase 3 | 🔜 Planned | JWT authentication, user profiles, appointment booking API |
| Phase 4 | 🔜 Planned | Real AI/ML model integration, multilingual support, production deployment |

---

## ⚠️ Disclaimer

> MediAI is a **demonstration project** and does **not** provide real medical advice. Always consult a licensed healthcare professional for any medical concerns.

---

*Built with ❤️ — MediAI Team*
