# DealScope AI

An autonomous VC & M&A diligence agent. Enter a company name and get a full investment analysis in ~60 seconds — no manual research required.

![DealScope AI](https://img.shields.io/badge/status-active-brightgreen) ![Python](https://img.shields.io/badge/python-3.11+-blue) ![React](https://img.shields.io/badge/react-18-61dafb)

---

## What It Does

DealScope AI runs a 6-phase autonomous pipeline the moment you submit a company name:

| Phase | What Happens |
|-------|-------------|
| **1. Web Research** | Tavily searches 60+ sources across 3 waves: company profile, funding & M&A history, competitors & market data |
| **2. Entity Extraction** | OpenAI extracts structured entities — founders, investors, funding rounds, traction signals, competitors |
| **3. Market Intelligence** | Extracts TAM, growth rates, comparable M&A transactions, and risk/exit signals |
| **4. Knowledge Graph** | Writes all entities and relationships into Neo4j — companies, investors, founders, acquisitions |
| **5. Investment Analysis** | Identifies red flags (HIGH/MEDIUM/LOW), ranks likely acquirers by strategic fit, scores IPO vs. acquisition probability |
| **6. Investment Memo** | Generates a full VC-style investment memo in markdown with exec summary, competitive landscape, risks, and recommendation |

### Output Tabs

- **Memo** — Full markdown investment memo with all sections
- **Graph** — Interactive Neo4j relationship graph (companies, investors, founders)
- **Comps** — M&A comparable transactions table with deal sizes and multiples
- **Risks** — Red flags ranked by severity with evidence and implications
- **Acquirers** — Ranked list of likely acquirers with fit scores and rationale

---

## Tech Stack

### Backend
| Tool | Purpose |
|------|---------|
| **FastAPI** | REST API + Server-Sent Events (SSE) streaming |
| **OpenAI API** (gpt-5.2) | Entity extraction, analysis, memo generation via Responses API |
| **Tavily** | Real-time web search across 60+ sources |
| **Neo4j Aura** | Cloud graph database for relationship mapping |
| **neo4j** (async driver) | Python async driver for graph writes/queries |
| **Pydantic** | Structured schemas for all extraction outputs |
| **Uvicorn** | ASGI server |

### Frontend
| Tool | Purpose |
|------|---------|
| **React 18** | UI framework |
| **Vite** | Dev server + build tool |
| **Tailwind CSS** | Styling |
| **NeoVis.js** | Interactive graph visualization (vis.js + Neo4j) |
| **react-markdown** | Renders the investment memo |

---

## Architecture

```
User Input (company name)
        │
        ▼
FastAPI POST /analyze  ──────────────────────────────────────┐
        │                                                      │
        ▼                                               SSE stream
OrchestratorAgent                                      (progress events
   │                                                    → frontend)
   ├─ ResearchAgent      → Tavily 3-wave search
   ├─ ExtractionAgent    → OpenAI structured extraction (CoreEntities)
   ├─ ExtractionAgent    → OpenAI structured extraction (MarketEntities + Signals)
   ├─ GraphAgent         → Neo4j Cypher writes + analysis queries
   ├─ AnalysisAgent      → OpenAI: red flags, comps, acquirers, exit scores
   └─ MemoAgent          → OpenAI: full markdown investment memo
        │
        ▼
Final JSON result → React frontend renders tabs
```

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key
- Tavily API key
- Neo4j Aura account (free tier works)

### 1. Clone the repo
```bash
git clone https://github.com/LiquidAzir/DealScope-AI.git
cd DealScope-AI
```

### 2. Backend setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
```

**`backend/.env`**
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
TAVILY_API_KEY=tvly-...
NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
```

### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env
# Fill in your Neo4j credentials (same as backend)
```

**`frontend/.env`**
```
VITE_NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io
VITE_NEO4J_USER=neo4j
VITE_NEO4J_PASSWORD=...
```

### 4. Run

**Option A — start script (Windows)**
```
double-click start.bat
```

**Option B — manual**
```bash
# Terminal 1
cd backend && python main.py

# Terminal 2
cd frontend && npm run dev
```

Then open **http://localhost:5173**

> **Note:** Neo4j is optional. If credentials are missing or the connection fails, the pipeline continues in local mode and the Graph tab shows a fallback view using analysis data.

---

## API

### `POST /analyze`
Streams SSE events for the full pipeline.

**Request body:**
```json
{ "company": "Stripe" }
```

**SSE event types:**
| Event | Payload |
|-------|---------|
| `step` | `{ "step": 1, "title": "Web Research", "status": "running" }` |
| `result` | Full JSON result object |
| `error` | Error message string |

---

## Project Structure

```
DealScope-AI/
├── backend/
│   ├── main.py                  # FastAPI app + SSE endpoint
│   ├── config.py                # Env var loading
│   ├── requirements.txt
│   ├── agents/
│   │   ├── orchestrator.py      # Pipeline controller
│   │   ├── research.py          # Tavily 3-wave search
│   │   ├── extraction.py        # OpenAI structured extraction
│   │   ├── graph.py             # Neo4j construction & queries
│   │   └── analysis.py         # Red flags, comps, acquirers, memo
│   └── schemas/
│       ├── core.py              # Pydantic models for extracted entities
│       └── outputs.py           # Pydantic models for analysis outputs
└── frontend/
    ├── src/
    │   ├── App.jsx              # Main UI with tab layout
    │   ├── hooks/
    │   │   └── useSSE.js        # SSE streaming hook
    │   └── components/
    │       ├── InputForm.jsx    # Company name input
    │       ├── ProgressStream.jsx  # Live pipeline progress
    │       ├── MemoView.jsx     # Investment memo renderer
    │       ├── GraphView.jsx    # Neo4j / fallback graph
    │       ├── CompsTable.jsx   # M&A comparables table
    │       ├── RedFlags.jsx     # Risk flag cards
    │       └── AcquirerRank.jsx # Acquirer ranking
    └── vite.config.js           # Proxy config for SSE
```
