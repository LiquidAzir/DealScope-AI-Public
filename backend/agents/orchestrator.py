import asyncio
import json
import logging
import time
from typing import AsyncGenerator

from agents.research import ResearchAgent
from agents.extraction import ExtractionAgent
from agents.graph import GraphAgent
from agents.analysis import AnalysisAgent, MemoAgent
from schemas.core import CoreEntities, MarketEntities, SignalEntities
from schemas.outputs import GraphInsights

logger = logging.getLogger(__name__)


def _event(event_type: str, data: dict) -> dict:
    return {"event": event_type, "data": data}


class OrchestratorAgent:
    """
    Central pipeline controller.
    run() is an async generator that yields SSE-ready event dicts.
    """

    def __init__(self):
        self.research = ResearchAgent()
        self.extraction = ExtractionAgent()
        self.graph = GraphAgent()
        self.analysis_agent = AnalysisAgent()
        self.memo_agent = MemoAgent()

    async def run(
        self,
        company: str,
        stage: str,
        exit_type: str = "",
    ) -> AsyncGenerator[dict, None]:

        total_start = time.time()

        # ── Phase 1: Research ─────────────────────────────────────────────────
        yield _event("status", {
            "step": 1, "total": 6,
            "message": f"Researching {company} across the web...",
            "icon": "search",
        })
        t = time.time()
        wave1_results = await self.research.wave_1(company)
        if not wave1_results:
            logger.warning("Wave 1 returned 0 results — Tavily may be rate-limited or out of credits (HTTP 432)")
        yield _event("status", {
            "step": 1, "total": 6,
            "message": f"Wave 1 complete — {len(wave1_results)} sources found" if wave1_results
                       else "Wave 1 returned no results — Tavily search unavailable (check API credits)",
            "elapsed": round(time.time() - t, 1),
            "icon": "check" if wave1_results else "warning",
        })

        # ── Phase 2: Core extraction ──────────────────────────────────────────
        yield _event("status", {
            "step": 2, "total": 6,
            "message": "Extracting company entities with AI...",
            "icon": "brain",
        })
        t = time.time()
        wave1_text = self.research.format_for_extraction(wave1_results)
        core: CoreEntities = await asyncio.get_event_loop().run_in_executor(
            None, self.extraction.extract_core, wave1_text
        )
        yield _event("status", {
            "step": 2, "total": 6,
            "message": f"Extracted: {len(core.competitors)} competitors, {len(core.investors)} investors",
            "elapsed": round(time.time() - t, 1),
            "icon": "check",
        })

        # ── Phase 3: Market + competitor deep-dive ────────────────────────────
        yield _event("status", {
            "step": 3, "total": 6,
            "message": "Deep-diving market landscape and M&A activity...",
            "icon": "search",
        })
        t = time.time()
        competitor_names = [c.name for c in core.competitors[:3]]
        wave2_results = await self.research.wave_2(company, core.company.sector, competitor_names)
        wave2_text = self.research.format_for_extraction(wave2_results)
        market: MarketEntities = await asyncio.get_event_loop().run_in_executor(
            None, self.extraction.extract_market, wave2_text
        )
        yield _event("status", {
            "step": 3, "total": 6,
            "message": f"Found {len(market.acquisitions)} M&A comps, market: {market.market.name or 'TBD'}",
            "elapsed": round(time.time() - t, 1),
            "icon": "check",
        })

        # ── Phase 3b: Risk signals + exit intelligence ────────────────────────
        yield _event("status", {
            "step": 3, "total": 6,
            "message": "Scanning for risk signals and exit indicators...",
            "icon": "search",
        })
        t = time.time()
        top_acquirer_names = [a.acquirer for a in market.acquisitions[:2]]
        wave3_results = await self.research.wave_3(company, core.company.sector, top_acquirer_names)
        wave3_text = self.research.format_for_extraction(wave3_results)
        signals: SignalEntities = await asyncio.get_event_loop().run_in_executor(
            None, self.extraction.extract_signals, wave3_text
        )
        yield _event("status", {
            "step": 3, "total": 6,
            "message": f"Detected {len(signals.risk_signals)} risk signals",
            "elapsed": round(time.time() - t, 1),
            "icon": "check",
        })

        # ── Phase 4: Graph construction ───────────────────────────────────────
        yield _event("status", {
            "step": 4, "total": 6,
            "message": "Building relationship graph in Neo4j...",
            "icon": "graph",
        })
        t = time.time()
        try:
            await self.graph.build_graph(core, market, signals)
            graph_insights: GraphInsights = await self.graph.run_analysis_queries(company)
        except Exception as e:
            logger.warning(f"Graph phase failed ({e}) — continuing without Neo4j")
            graph_insights = GraphInsights(neo4j_available=False)
        yield _event("status", {
            "step": 4, "total": 6,
            "message": f"Graph ready — Neo4j {'connected' if graph_insights.neo4j_available else 'unavailable (local mode)'}",
            "elapsed": round(time.time() - t, 1),
            "icon": "check",
        })
        yield _event("graph_ready", {"neo4j_available": graph_insights.neo4j_available})

        # ── Phase 5: Analysis ─────────────────────────────────────────────────
        yield _event("status", {
            "step": 5, "total": 6,
            "message": "Analyzing M&A comps, red flags, and exit probability...",
            "icon": "chart",
        })
        t = time.time()
        from schemas.outputs import AnalysisOutput
        analysis: AnalysisOutput = await asyncio.get_event_loop().run_in_executor(
            None, self.analysis_agent.analyze, core, market, signals, graph_insights
        )
        yield _event("status", {
            "step": 5, "total": 6,
            "message": f"Analysis complete — {len(analysis.red_flags)} red flags, exit scores generated",
            "elapsed": round(time.time() - t, 1),
            "icon": "check",
        })

        # ── Phase 6: Investment memo ───────────────────────────────────────────
        yield _event("status", {
            "step": 6, "total": 6,
            "message": "Writing investment memo...",
            "icon": "document",
        })
        t = time.time()
        memo: str = await asyncio.get_event_loop().run_in_executor(
            None,
            self.memo_agent.generate,
            company, stage, exit_type,
            core, market, signals, analysis, graph_insights,
        )
        yield _event("status", {
            "step": 6, "total": 6,
            "message": "Investment memo complete",
            "elapsed": round(time.time() - t, 1),
            "icon": "check",
        })

        # ── Done ──────────────────────────────────────────────────────────────
        total_elapsed = round(time.time() - total_start, 1)
        yield _event("complete", {
            "total_elapsed": total_elapsed,
            "memo": memo,
            "comps_table": [c.model_dump() for c in analysis.comps],
            "red_flags": [r.model_dump() for r in analysis.red_flags],
            "exit_scores": analysis.exit_probability.model_dump(),
            "likely_acquirers": [a.model_dump() for a in analysis.ranked_acquirers],
            "competitive_position": analysis.competitive_position,
            "company_info": core.company.model_dump(),
            "market_info": market.market.model_dump(),
            "graph_stats": graph_insights.graph_stats,
            "investor_overlaps": graph_insights.investor_overlaps,
        })

        await self.graph.close()
