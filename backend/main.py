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

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


# ── Request model ─────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    company: str
    stage: str = "Series A"        # Seed | Series A | Growth
    exit_type: str = ""            # IPO | Strategic Acquisition | ""


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DealScope AI",
    description="Autonomous VC & M&A Diligence Agent",
    version="1.0.0",
)

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


# ── Serve frontend (production) ──────────────────────────────────────────────
# When the frontend has been built (e.g. on Render), serve it as static files.
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.is_dir():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
