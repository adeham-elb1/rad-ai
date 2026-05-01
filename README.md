#  RadAI — AI X-ray Diagnostic System

“A Vite-based frontend + FastAPI + Ollama-based medical education tool for analyzing X-ray images and generating structured reports.

---

##  Quick Start

```bash
# 1. Install frontend dependencies
npm install

# 2. Start frontend
npm run dev
# → http://localhost:3000
```

---

##  Backend Setup (FastAPI)

```bash
# Activate virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run backend
uvicorn main:app --reload --port 8000
```

---

##  AI Model Setup (Ollama)

```bash
# Install Ollama: https://ollama.com

# Run MedGemma model
ollama run medgemma:1.5
```

---

##  Backend Endpoints

| Method | URL              | Description                      |
| ------ | ---------------- | -------------------------------- |
| POST   | /analyze-xray    | Upload X-ray image, get analysis |
| GET    | /download-report | Download generated PDF report    |

---

##  Expected API Response

```json
{
  "diagnosis": "Lung fields appear clear bilaterally. No acute abnormalities detected."
}
```

---

##  Project Structure

```
radai/
├── backend/
│   ├── main.py
│   
│  
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├──node_modules/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── App.css
│
└── README.md
```

---

##  How It Works

1. User uploads X-ray image
2. Frontend sends image to FastAPI backend
3. Backend forwards request to MedGemma (via Ollama)
4. AI generates structured analysis
5. System returns JSON + generates PDF report

---

##  Frontend API Config

Edit in `src/App.jsx`:

```js
const API_BASE = "http://localhost:8000";
```

---

##  SDG Impact (Goal 3: Health & Well-being)

RadAI supports medical education by:

* Helping students understand X-ray interpretation
* Providing AI-assisted learning tools
* Making healthcare knowledge more accessible

---

##  License

MIT License — see `LICENSE` file.

 AI model (MedGemma via Ollama) is subject to its own terms and is not covered by this license.
