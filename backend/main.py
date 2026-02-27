import asyncio
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Load .env before anything else so all child/reload processes see the vars
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

import database

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


# ── Request models ─────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    company: str
    stage: str = "Series A"        # Seed | Series A | Growth
    exit_type: str = ""            # IPO | Strategic Acquisition | ""


class SaveAnalysisRequest(BaseModel):
    company_name: str
    sector: str = ""
    result: dict


class PreferencesRequest(BaseModel):
    memo_preferences: str = ""


# ── Lifespan ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app):
    await database.init_pool()
    yield
    await database.close_pool()


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DealScope AI",
    description="Autonomous VC & M&A Diligence Agent",
    version="1.0.0",
    lifespan=lifespan,
)

# SSE requires credentials=True; origins wildcard is fine for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # Tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    from config import OPENAI_API_KEY, TAVILY_API_KEY, NEO4J_ENABLED
    return {
        "status": "ok",
        "openai_configured": bool(OPENAI_API_KEY),
        "tavily_configured": bool(TAVILY_API_KEY),
        "neo4j_enabled": NEO4J_ENABLED,
    }


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Starts the diligence pipeline and streams progress via Server-Sent Events.
    The client should connect expecting 'text/event-stream'.
    """
    if not req.company.strip():
        raise HTTPException(status_code=400, detail="Company name is required")

    from agents.orchestrator import OrchestratorAgent

    async def event_generator():
        orchestrator = OrchestratorAgent()
        try:
            async for event in orchestrator.run(
                company=req.company.strip(),
                stage=req.stage,
                exit_type=req.exit_type,
            ):
                yield {
                    "event": event["event"],
                    "data": json.dumps(event["data"]),
                }
        except Exception as e:
            logger.exception(f"Pipeline error for '{req.company}': {e}")
            yield {
                "event": "error",
                "data": json.dumps({"message": str(e)}),
            }

    return EventSourceResponse(event_generator())


# ── Analysis history endpoints ─────────────────────────────────────────────────

@app.post("/analyses")
async def create_analysis(req: SaveAnalysisRequest):
    saved = await database.save_analysis(req.company_name, req.sector, req.result)
    if saved is None:
        # DB not configured — return a no-op 200 so the frontend doesn't error
        return {"id": None, "created_at": None}
    return saved


@app.get("/analyses")
async def list_analyses():
    return await database.get_analyses()


@app.get("/analyses/{id}")
async def fetch_analysis(id: int):
    entry = await database.get_analysis(id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return entry


@app.delete("/analyses/{id}")
async def remove_analysis(id: int):
    ok = await database.delete_analysis(id)
    if not ok:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"deleted": True}


# ── Memo preferences (continuous learning) ────────────────────────────────────

@app.get("/preferences")
async def get_preferences():
    return {"memo_preferences": await database.get_preferences()}


@app.post("/preferences")
async def save_preferences(req: PreferencesRequest):
    await database.save_preferences(req.memo_preferences)
    return {"ok": True}


# ── Serve frontend (production) ──────────────────────────────────────────────
# When the frontend has been built (e.g. on Render), serve it as static files.
# This mount must stay LAST — it catches all unmatched paths.
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.is_dir():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
