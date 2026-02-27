# DealScope AI

An autonomous VC & M&A diligence agent. Enter a company name and receive a full investment analysis in ~60–90 seconds — no manual research required.

![Python](https://img.shields.io/badge/python-3.11+-blue) ![React](https://img.shields.io/badge/react-18-61dafb) ![FastAPI](https://img.shields.io/badge/fastapi-0.110+-009688) ![License](https://img.shields.io/badge/license-MIT-green)

---

## What It Does

DealScope AI runs a 6-phase autonomous pipeline the moment you submit a company name, streaming live progress to the UI via Server-Sent Events.

| Phase | Agent | What Happens |
|-------|-------|-------------|
| **1. Web Research** | `ResearchAgent` | 4 parallel Tavily searches — company profile, funding history, competitors, traction signals |
| **2. Entity Extraction** | `ExtractionAgent` | OpenAI extracts structured entities: founders, investors, funding rounds, competitors |
| **3. Market Intelligence** | `ResearchAgent` + `ExtractionAgent` | Two more search waves: M&A comps, market TAM/growth, risk signals, exit indicators |
| **4. Knowledge Graph** | `GraphAgent` | Writes all entities and relationships into Neo4j Aura; runs analysis queries |
| **5. Investment Analysis** | `AnalysisAgent` | Identifies red flags (HIGH/MEDIUM/LOW), ranks likely acquirers by fit score, scores IPO vs. acquisition probability |
| **6. Investment Memo** | `MemoAgent` | Generates a full VC-style markdown memo — exec summary, competitive landscape, M&A comps, risks, recommendation |

### Result Tabs

| Tab | Content |
|-----|---------|
| **Memo** | Full investment memo rendered as markdown |
| **Graph** | SVG relationship diagram — acquirers, competitors, investor overlaps |
| **Comps** | M&A comparable transactions with deal sizes and revenue multiples |
| **Risks** | Red flags ranked by severity (HIGH → LOW) with evidence and implications |
| **Acquirers** | Likely acquirers ranked by strategic fit score with acquisition history |

### Continuous Learning

The **Agent Memory** panel lets you save analyst preferences (e.g. "always lead with the IPO case", "flag regulatory risk first"). These are persisted to the database and injected into the memo prompt on every subsequent run.

---

## Tech Stack

### Backend
| Tool | Purpose |
|------|---------|
| **FastAPI** | REST API + SSE streaming endpoint |
| **OpenAI API** | Structured entity extraction, analysis, memo generation (Responses API + Chat Completions fallback) |
| **Tavily** | Real-time web search across news, funding databases, and market sources |
| **Neo4j Aura** | Cloud graph database for entity relationships (optional — degrades gracefully) |
| **asyncpg + PostgreSQL** | Analysis history and analyst preferences persistence |
| **Pydantic** | Typed schemas for all extraction and analysis outputs |
| **Uvicorn** | ASGI server |

### Frontend
| Tool | Purpose |
|------|---------|
| **React 18** | UI framework |
| **Vite** | Dev server and build tool |
| **Tailwind CSS v3** | Styling |
| **react-markdown** | Investment memo renderer |

---

## Architecture

```
User Input (company name)
        │
        ▼
FastAPI POST /analyze ─────────────────────────────────────────┐
        │                                                        │
        ▼                                                  SSE stream
OrchestratorAgent                                         (status events
   │                                                       → frontend)
   ├─ ResearchAgent (wave 1)   → 4 parallel Tavily searches
   ├─ ExtractionAgent          → OpenAI → CoreEntities
   ├─ ResearchAgent (wave 2+3) → Market + risk searches
   ├─ ExtractionAgent          → OpenAI → MarketEntities + SignalEntities
   ├─ GraphAgent               → Neo4j writes + analysis queries
   ├─ AnalysisAgent            → OpenAI → red flags, comps, acquirers, exit scores
   └─ MemoAgent                → OpenAI → markdown investment memo
        │
        ▼
complete event → React renders 5 result tabs
```

All OpenAI calls attempt the **Responses API** first and fall back to **Chat Completions** automatically.

Neo4j is fully optional — if the connection fails, the pipeline continues and the Graph tab renders a local SVG diagram built from the analysis data.

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key
- Tavily API key
- Neo4j Aura account (free tier works — or omit to run in local mode)
- PostgreSQL database (optional — enables history and preferences persistence)

### 1. Clone

```bash
git clone https://github.com/LiquidAzir/DealScope-AI-Public.git
cd DealScope-AI-Public
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
```

**`backend/.env`**
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
TAVILY_API_KEY=tvly-...

# Optional — Neo4j graph database
NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=...

# Optional — PostgreSQL for history and preferences
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

**`frontend/.env`** (only needed if you want the frontend to connect directly to Neo4j)
```
VITE_NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io
VITE_NEO4J_USER=neo4j
VITE_NEO4J_PASSWORD=...
```

### 4. Run

**Windows — double-click `start.bat`** (starts both backend and frontend)

**Or manually:**
```bash
# Terminal 1 — backend
cd backend && python main.py
# → http://localhost:8000

# Terminal 2 — frontend
cd frontend && npm run dev
# → http://localhost:5173
```

---

## Deployment (Render)

The app is designed to run as a single Render **Web Service** (Python). The frontend is built at deploy time and served as static files by FastAPI.

**Build command:**
```
pip install -r backend/requirements.txt && cd frontend && npm install && npm run build
```

**Start command:**
```
cd backend && python main.py
```

**Environment variables to set in Render:**

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | Yes | |
| `OPENAI_MODEL` | Yes | e.g. `gpt-4o` |
| `TAVILY_API_KEY` | Yes | |
| `NEO4J_URI` | No | Omit to skip graph |
| `NEO4J_USER` | No | |
| `NEO4J_PASSWORD` | No | |
| `DATABASE_URL` | No | Render PostgreSQL add-on URL |

---

## API Reference

### `POST /analyze`
Starts the diligence pipeline and streams progress as Server-Sent Events.

**Request:**
```json
{ "company": "Stripe", "stage": "Series A", "exit_type": "" }
```

**SSE event stream:**
| Event | Payload |
|-------|---------|
| `status` | `{ step, total, message, icon, elapsed? }` |
| `graph_ready` | `{ neo4j_available: bool }` |
| `complete` | Full result JSON (memo, comps, red_flags, exit_scores, likely_acquirers, …) |
| `error` | `{ message: string }` |

### `GET /health`
Returns API key and Neo4j configuration status.

### `GET /analyses` / `POST /analyses` / `DELETE /analyses/{id}`
CRUD for saved analysis history (requires `DATABASE_URL`).

### `GET /preferences` / `POST /preferences`
Read/write analyst memo preferences.

---

## Project Structure

```
DealScope-AI-Public/
├── backend/
│   ├── main.py                  # FastAPI app, /analyze SSE endpoint, history + preferences routes
│   ├── config.py                # Environment variable loading
│   ├── database.py              # asyncpg pool, analyses + preferences tables
│   ├── requirements.txt
│   ├── agents/
│   │   ├── orchestrator.py      # 6-phase pipeline controller (async generator)
│   │   ├── research.py          # Tavily 3-wave parallel search
│   │   ├── extraction.py        # OpenAI structured JSON extraction
│   │   ├── graph.py             # Neo4j Cypher writes + analysis queries
│   │   └── analysis.py          # Red flags, comps, acquirer ranking, memo generation
│   └── schemas/
│       ├── core.py              # Pydantic models: CoreEntities, MarketEntities, SignalEntities
│       └── outputs.py           # Pydantic models: AnalysisOutput, GraphInsights
└── frontend/
    ├── index.html
    ├── src/
    │   ├── App.jsx              # Main layout, tab routing, history, preferences
    │   ├── index.css
    │   ├── hooks/
    │   │   └── useSSE.js        # SSE streaming hook — do not modify
    │   ├── components/
    │   │   ├── InputForm.jsx    # Company name + options input
    │   │   ├── ProgressStream.jsx  # 6-step live pipeline progress timeline
    │   │   ├── MemoView.jsx     # Investment memo markdown renderer + PDF export
    │   │   ├── GraphView.jsx    # SVG relationship diagram
    │   │   ├── CompsTable.jsx   # M&A comparables table
    │   │   ├── RedFlags.jsx     # Risk flag cards
    │   │   ├── AcquirerRank.jsx # Acquirer ranking with fit scores
    │   │   ├── HistoryPanel.jsx # Saved analysis history
    │   │   └── FeedbackPanel.jsx   # Agent memory / analyst preferences
    │   └── utils/
    │       └── exportPDF.js     # PDF export utility
    ├── vite.config.js           # Dev proxy → backend :8000
    └── tailwind.config.js
```

---

## License

MIT
