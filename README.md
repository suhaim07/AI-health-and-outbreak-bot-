# PulseGuard AI — Community Health & Outbreak Alert Bot

An AI-powered health assistant built to help village users, elderly people, and first-time smartphone users get quick, simple health guidance. It provides symptom-based precautions, location-aware seasonal outbreak alerts, and a map of nearby clinics and hospitals — all available in multiple Indian languages.

This README summarizes what has been built in this project and how to run it.

---

## What This Project Does

- **AI Health Chatbot** — Users describe their symptoms in plain language (with spelling mistakes handled) and receive short, simple, real-world precautions plus advice on when to see a doctor.
- **Emergency / High-Alert Detection** — Detects serious symptoms (chest pain, breathing trouble, bleeding, unconsciousness, heart attack, severe fever, etc.) and gives immediate life-support steps (call 108/112, CPR guidance, recovery position).
- **Outbreak Alerts** — Uses the user's location and current season to show a risk level (high / medium / low) for mosquito-borne and respiratory illnesses.
- **Nearby Facilities Map** — Finds hospitals and clinics within 10 km using OpenStreetMap data and provides directions, call buttons, and emergency numbers.
- **Nearby Doctor Finder in Chat** — If the user asks for a doctor/clinic "near me", the bot infers the right specialist from the symptoms (e.g. Cardiologist for heart/chest, Pulmonologist for cough/breathing) and finds the closest mapped facility.
- **Multilingual UI** — Full interface available in **English, Hindi, Kannada, Tamil, and Urdu**.

---

## Tech Stack

**Frontend**
- React 19 + Vite
- Tailwind CSS v4
- Axios
- Lucide React (icons)
- Framer Motion, Recharts, React Router (installed dependencies)
- OpenStreetMap embeds + Overpass API for facilities

**Backend**
- Python + Flask + Flask-CORS
- `python-dotenv` for environment configuration
- Pluggable AI provider: **Groq**, **OpenRouter**, **OpenAI**, or any OpenAI-compatible endpoint
- Built-in safety guidance fallback when no AI key is configured or the API fails

---

## Project Structure

```
AI-health-and-outbreak-bot-/
├── index.js                     # placeholder at project root
├── backend/
│   ├── app.py                   # Flask API + AI logic + safety rules
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # sample environment variables
│   ├── test.py                  # backend test/scratch script
│   └── logs (.log files)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx              # main app shell, tabs, language selector
        ├── config.js            # API base URL
        ├── components/
        │   ├── Chatbot.jsx      # chat UI, nearby doctor finder
        │   ├── MapSection.jsx   # nearby hospitals/clinics map
        │   ├── Dashboard.jsx
        │   ├── DashboardCards.jsx
        │   ├── HeroSection.jsx
        │   ├── Navbar.jsx
        │   ├── NearbyClinics.jsx
        │   ├── OutbreakAlert.jsx
        │   └── ChatbotPanel.jsx
        ├── data/mockData.js
        ├── utils/translations.js
        └── styles/global.css
```

---

## Getting Started

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a `.env` file (copy from `.env.example`) and add **one** API key:

```env
# Any one of these works; provider is auto-detected from the key prefix.
AI_API_KEY=your_key_here
# GROQ_API_KEY=...
# OPENROUTER_API_KEY=...
# OPENAI_API_KEY=...

# Optional (defaults to openai/gpt-oss-120b)
AI_MODEL=openai/gpt-oss-120b
```

Run the server:

```powershell
python app.py
```

The API runs at `http://127.0.0.1:5000`.

> No API key? The backend still works and returns built-in safety guidance instead of AI-generated text.

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

The app runs on the Vite dev server (default `http://localhost:5173`).

Optional: point the frontend at a different backend by creating `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

---

## API Endpoints

| Method | Endpoint          | Purpose |
|--------|-------------------|---------|
| GET    | `/health`         | Returns server status, whether AI is configured, provider and model |
| POST   | `/chat`           | Accepts `{ message, language }` and returns `{ reply }` |
| POST   | `/outbreak-alert` | Accepts `{ lat, lon, language }` and returns seasonal local risk with `level`, `title`, `message`, `precautions` |

### Example

```bash
curl -X POST http://127.0.0.1:5000/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"I have high fever and body pain\",\"language\":\"English\"}"
```

---

## Safety & AI Behavior (Backend)

- **Symptom knowledge base** covering malaria, typhoid, jaundice, dengue, flu/COVID, asthma, heart attack, UTI, chickenpox, fever, cough, headache, stomach issues, body pain, skin, and dental problems.
- **Spelling normalization** for common mistakes (e.g. `dengu → dengue`, `maleriya → malaria`).
- **High-alert keyword detection** triggers urgent clinic/emergency advice.
- **Emergency life-support replies** for death, no breathing, no pulse, unconsciousness, and heart attack scenarios.
- **Multilingual outbreak copy** for English, Hindi, Kannada, Tamil, and Urdu.
- **Graceful fallback** to built-in guidance if the AI provider is unavailable.

---

## Notes / Limitations

- Outbreak alerts are **seasonal and location-based estimates, not real-time epidemiological data**.
- Facility data comes from OpenStreetMap/Overpass and may be incomplete in rural areas.
- The app is **not a substitute for professional medical diagnosis** — it gives precautions and guidance on when to seek care.
- The root `index.js` is currently empty/unused.

---

## Credits

Built as an AI health and outbreak alert project focused on accessible healthcare for underserved communities.
