# PulseGuard AI — Community Health & Outbreak Alert Bot

An AI-powered health assistant and surveillance system designed to provide accessible, immediate, and simple healthcare guidance. Built specifically with underserved communities, village users, elderly citizens, and first-time smartphone users in mind.

It delivers conversational symptom triage, life-saving emergency detection, location-aware seasonal outbreak alerts, and real-time mapping of nearby healthcare facilities — in **English, Hindi, Kannada, Tamil, and Urdu**.

---

## 🏗️ Architecture & How It Was Built

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND (React 19 + Vite)                         |
|  - Multilingual UI (EN, HI, KN, TA, UR)  - Chatbot Interface & Quick Symptoms     |
|  - Seasonal Outbreak Risk Cards          - OpenStreetMap Hospital & Doctor Finder |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST (Port 5000)
                                           v
+-----------------------------------------------------------------------------------+
|                             BACKEND API (FastAPI / Flask)                         |
|                                                                                   |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  |  FastAPI (main.py) |  | Triage & Safety Core |  | Location & Outbreak Logic |  |
|  |  - Auto Docs /docs |  | - High Alert Scanner |  | - Season & Region Checker |  |
|  |  - Async Execution |  | - Spell Normalizer   |  | - 5-Language Copy Table   |  |
|  |  - CORS Enabled    |  | - Life-Support Rules |  +---------------------------+  |
|  +--------------------+  +----------+-----------+                                 |
|                                     |                                             |
|                                     v                                             |
|                     +-------------------------------+                             |
|                     | Multi-Provider AI Connector   |                             |
|                     | (Groq / OpenRouter / OpenAI)  |                             |
|                     +---------------+---------------+                             |
|                                     | (Fall back safely if offline)               |
|                                     v                                             |
|                     +-------------------------------+                             |
|                     | Built-in Clinical Fallback KB |                             |
|                     +-------------------------------+                             |
+-----------------------------------------------------------------------------------+
```

### 1. Frontend Engineering
- **React 19 & Vite**: Ultra-fast component rendering and hot-module replacement.
- **Tailwind CSS v4 & Framer Motion**: Responsive, accessible mobile-first interface designed for clarity and high contrast.
- **Geolocation & Overpass API**:
  - Automatically requests browser GPS coordinates.
  - Queries OpenStreetMap via the Overpass API within a 10 km radius for clinics, physicians, and hospitals.
  - Infers doctor specialties (e.g., Cardiologist for chest pain, Pulmonologist for cough) directly from chat history.
- **Zero-Barrier Multilingual Support**: Instant switching across 5 languages without reloading.

### 2. Backend API Engineering (FastAPI + Flask)
- **FastAPI (`backend/main.py`)**: High-performance, modern async API with automated interactive documentation (`/docs` via Swagger UI and `/redoc`).
- **Flask (`backend/app.py`)**: Lightweight WSGI alternative.
- **Pydantic Validation**: Strong typing and structured schema generation.
- **Pluggable AI Integration**:
  - Auto-detects keys for **Groq** (`gsk_...`), **OpenRouter** (`sk-or-...`), or **OpenAI** (`sk-...`).
  - Auto-normalizes common phonetic misspellings (e.g., *dengu* -> *dengue*, *maleriya* -> *malaria*).
  - Enforces strict safety rules (2-sentence structured responses, emergency life-support protocols for collapse/unconsciousness/heart attacks).
- **Fail-Safe Clinical Fallback Engine**: If the AI provider is offline or rate-limited, the system **never leaves the user hanging**; it immediately serves built-in clinical triage guidance.

---

## 🚀 Quick Start Guide

### 1. Setup Backend (FastAPI)

```powershell
cd backend

# Create and activate virtual environment (optional)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies (includes FastAPI, Uvicorn, and Flask)
pip install -r requirements.txt
```

#### Configure Environment Variables (`backend/.env`):
Create or edit `.env` with your API key:
```env
# Groq (recommended free tier) or OpenRouter / OpenAI
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

#### Run the FastAPI Backend:
```powershell
# Option A: Run directly with Python
python main.py

# Option B: Run via Uvicorn
uvicorn main:app --host 127.0.0.1 --port 5000 --reload
```

* 📖 **Interactive Swagger UI**: Visit [http://127.0.0.1:5000/docs](http://127.0.0.1:5000/docs)
* 📑 **ReDoc Documentation**: Visit [http://127.0.0.1:5000/redoc](http://127.0.0.1:5000/redoc)

*(Note: You can also run the legacy Flask backend anytime with `python app.py` on the same port).*

---

### 2. Setup Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status, metadata, and quick links |
| `GET` | `/health` | Backend status, active AI provider, and model |
| `POST` | `/chat` | Chatbot symptom triage and emergency assessment |
| `POST` | `/outbreak-alert` | Location-based seasonal outbreak risk calculation |
| `GET` | `/symptoms` | List of mapped symptom clinical rules |
| `GET` | `/languages` | Supported regional languages |
| `GET` | `/docs` | Interactive Swagger API documentation |

### Example API Request (`/chat`)

```bash
curl -X POST http://127.0.0.1:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I have fever and body pain", "language": "English"}'
```

**Response:**
```json
{
  "reply": "Fever with body pain may happen in viral fever, dengue, or malaria; drink ORS or water, rest, and avoid mosquito bites. Visit a clinic today if fever is high, pain is severe, or weakness is increasing."
}
```

---

## 🛡️ Safety & Triage Protocols

1. **Life Support Triggers**:
   - Immediate recognition of cardiac events, unconsciousness, severe respiratory distress, or cessation of breathing.
   - Bypasses standard advice to supply immediate emergency numbers (**108 / 112**) and actionable CPR/recovery position steps.
2. **Deterministic Fallback**:
   - Zero-downtime health guidance guaranteed even without an internet connection to external AI APIs.
3. **Location Privacy**:
   - GPS coordinates are processed transiently in the client browser and memory for distance calculation; no patient location data is stored.

---

## 🧪 Testing the API

Run the automated test suite against the backend:

```powershell
cd backend
python test.py
```

Expected output:
```
[PASS] health: HTTP 200
[PASS] outbreak-alert: HTTP 200
[PASS] outbreak-alert-missing-location: HTTP 400
[PASS] chat: HTTP 200
[PASS] chat-empty: HTTP 400
```
