import json
import logging
from typing import List
from openai import OpenAI
from config import OPENAI_API_KEY, OPENAI_MODEL
from schemas.core import CoreEntities, MarketEntities, SignalEntities
from schemas.outputs import AnalysisOutput, GraphInsights, RedFlag, CompTransaction, PotentialAcquirer, ExitProbability

logger = logging.getLogger(__name__)
client = OpenAI(api_key=OPENAI_API_KEY)

# ── Structured schemas for analysis outputs ───────────────────────────────────

ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["red_flags", "comps", "exit_probability", "ranked_acquirers", "competitive_position"],
    "properties": {
        "red_flags": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["signal", "severity", "evidence", "implication"],
                "properties": {
                    "signal": {"type": "string"},
                    "severity": {"type": "string", "enum": ["HIGH", "MEDIUM", "LOW"]},
                    "evidence": {"type": "string"},
                    "implication": {"type": "string"},
                },
            },
        },
        "comps": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["target", "acquirer", "year", "deal_size", "implied_multiple", "strategic_rationale"],
                "properties": {
                    "target": {"type": "string"},
                    "acquirer": {"type": "string"},
                    "year": {"type": ["integer", "null"]},
                    "deal_size": {"type": "string"},
                    "implied_multiple": {"type": "string"},
                    "strategic_rationale": {"type": "string"},
                },
            },
        },
        "exit_probability": {
            "type": "object",
            "additionalProperties": False,
            "required": ["ipo_score", "ipo_reasoning", "acquisition_score", "acquisition_reasoning", "timeline"],
            "properties": {
                "ipo_score": {"type": "integer"},
                "ipo_reasoning": {"type": "string"},
                "acquisition_score": {"type": "integer"},
                "acquisition_reasoning": {"type": "string"},
                "timeline": {"type": "string"},
            },
        },
        "ranked_acquirers": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "fit_score", "rationale", "prior_acquisitions", "acquisition_history"],
                "properties": {
                    "name": {"type": "string"},
                    "fit_score": {"type": "integer"},
                    "rationale": {"type": "string"},
                    "prior_acquisitions": {"type": "integer"},
                    "acquisition_history": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "competitive_position": {
            "type": "string",
            "enum": ["Strong", "Moderate", "Weak"],
        },
    },
}

ANALYSIS_INSTRUCTIONS = """You are an elite VC and M&A analyst.

Given structured data about a company — including its entity profile, market data,
M&A comparable transactions, relationship graph insights, and risk signals — produce
a comprehensive investment analysis.

Your job:
1. Identify and rate red flags (HIGH/MEDIUM/LOW severity)
2. Compile the best M&A comparable transactions with deal sizes and multiples
3. Score exit probability (IPO: 1-10, Acquisition: 1-10)
4. Rank the top potential acquirers by strategic fit (score 1-10 each)
5. Assess the company's competitive position (Strong / Moderate / Weak)

Common red flag patterns to check:
- Customer concentration risk
- Overcrowded / well-funded competitive market
- First-time founders or key departures
- Capital inefficiency (raised a lot, limited traction shown)
- Market timing (too early or too late)
- Regulatory exposure
- Technology defensibility

For acquirer ranking, consider:
- Product adjacency
- Prior acquisition history in the sector
- Strategic rationale (distribution, technology, talent, customers)

Be opinionated and data-driven. Every claim must tie to the evidence provided.
"""

MEMO_INSTRUCTIONS = """You are a senior venture capital partner at a top-tier fund writing an internal investment memo that will be circulated to the full investment committee.

CRITICAL WRITING STANDARDS — these are non-negotiable:
- Every section must be substantive. No bullet point or paragraph under two sentences.
- Be specific: name actual people, companies, dollar amounts, dates, and metrics wherever the data provides them. Never substitute vague language ("a major investor", "significant funding") when a specific name or number is available.
- Be opinionated: take clear stances. Avoid weak hedging ("may", "could potentially", "might") when evidence supports a direct claim.
- No generic filler. Phrases like "large and growing market", "experienced team", "significant opportunity" are banned unless followed immediately by specific evidence.
- Every claim must be grounded in the data provided. Do not speculate beyond the evidence.

---

## Executive Summary
Write 4–6 sentences covering: what the company does (be precise about the product/service), the specific problem it solves and for whom, what makes it defensible or differentiated, and a one-sentence investment thesis. End with your recommended action (INVEST / PASS / WATCH) and the single most important reason driving it.

## Company Overview
Cover all of the following in prose: exact founding year and HQ location, the specific business model (how money flows — who pays, how much, on what terms), the core product or platform and its key features, the target customer segment, and the stage of the company. Identify whether this is primarily a technology, distribution, or network-effects story.

## Market Opportunity
Name the precise market category (not just "SaaS" or "fintech" — be specific). State the TAM with a source or sizing methodology if available. Give the market growth rate. Explain in 3–5 sentences WHY now: what structural shifts (regulatory, technological, behavioral) are creating this window? Name 2–3 specific macro tailwinds. Identify adjacent markets that represent expansion optionality.

## Competitive Landscape
Name every identified competitor. For each: their funding level, their primary differentiation, and whether they are a direct, adjacent, or emerging threat. Then assess this company's moat — is it technical depth, proprietary data, network effects, distribution leverage, switching costs, or brand? Be explicit about where the moat is weak. Conclude with a competitive position rating: **Strong / Moderate / Weak** and a 2-sentence justification.

## Traction & Financial Signals
Cite every available data point: estimated ARR or revenue range (even approximate), revenue model details (subscription, usage, transaction), named enterprise customers or notable logos, employee headcount and trajectory, and any quantified growth signals (e.g. round size relative to valuation, hiring pace, customer expansion signals). If data is thin, say so explicitly and explain the implication for diligence confidence.

## M&A Comparable Transactions
Present all identified comparable transactions as a markdown table:

| Target | Acquirer | Year | Deal Size | Revenue Multiple | Strategic Rationale |
|--------|----------|------|-----------|-----------------|---------------------|

After the table, write 2–3 sentences interpreting what these comps imply for this company: implied valuation range at exit, what multiple range is realistic given traction, and whether the comp set is tight or sparse.

## Likely Acquirers (Ranked by Strategic Fit)
For each acquirer provide: their fit score (X/10), their specific acquisition history in this space (name prior deals if known), and a concrete reason WHY they would acquire this target — tied to their stated strategy, product gaps, or competitive pressure, not generic rationale. Cover at least 3 acquirers. For the top-ranked acquirer, write a full paragraph on the strategic case.

## Risk Assessment
Flag every material risk using this format for each:

**[HIGH/MEDIUM/LOW]** *Risk name:* specific evidence from the data → implication for the investment and what would need to be true to mitigate it.

Include at minimum 4 risks. Do not list risks without actionable implications.

## Exit Probability Assessment
- **IPO Probability: X/10** — 2–3 sentences of reasoning tied to revenue scale, market conditions, and relevant IPO comparables.
- **Strategic Acquisition Probability: X/10** — 2–3 sentences tied to acquirer interest, deal activity in the sector, and the company's strategic value.
- **Estimated Timeline:** Near-term (1–2yr) / Medium (3–5yr) / Long (5+yr) — with a one-sentence rationale.

## Investment Recommendation
State **INVEST / PASS / WATCH** in bold. Then write 4–6 sentences covering: your conviction level and why, the single biggest risk to the thesis, what would need to be true (a specific milestone or condition) for the recommendation to change, and — if recommending investment — any suggested terms, conditions, or diligence priorities before closing.
"""


def _call_structured(instructions: str, content: str, schema: dict, name: str) -> dict:
    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            instructions=instructions,
            input=content,
            text={"format": {"type": "json_schema", "name": name, "schema": schema, "strict": True}},
        )
        return json.loads(response.output_text)
    except Exception as e:
        logger.warning(f"Responses API failed ({e}), falling back")

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": instructions},
            {"role": "user", "content": content},
        ],
        response_format={"type": "json_schema", "json_schema": {"name": name, "schema": schema, "strict": True}},
    )
    return json.loads(response.choices[0].message.content)


def _call_freeform(instructions: str, content: str) -> str:
    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            instructions=instructions,
            input=content,
        )
        return response.output_text
    except Exception as e:
        logger.warning(f"Responses API (freeform) failed ({e}), falling back")

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": instructions},
            {"role": "user", "content": content},
        ],
    )
    return response.choices[0].message.content


class AnalysisAgent:
    """Generates structured analysis: red flags, comps, acquirers, exit scores."""

    def analyze(
        self,
        core: CoreEntities,
        market: MarketEntities,
        signals: SignalEntities,
        graph_insights: GraphInsights,
    ) -> AnalysisOutput:
        content = self._build_analysis_prompt(core, market, signals, graph_insights)
        try:
            data = _call_structured(ANALYSIS_INSTRUCTIONS, content, ANALYSIS_SCHEMA, "investment_analysis")
            return AnalysisOutput(**data)
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return AnalysisOutput()

    def _build_analysis_prompt(
        self,
        core: CoreEntities,
        market: MarketEntities,
        signals: SignalEntities,
        graph_insights: GraphInsights,
    ) -> str:
        parts = []

        parts.append(f"## Company\n{core.company.model_dump_json(indent=2)}")
        parts.append(f"## Funding\n{core.funding.model_dump_json(indent=2)}")
        parts.append(f"## Traction\n{core.traction.model_dump_json(indent=2)}")
        parts.append(f"## Founders\n{json.dumps([f.model_dump() for f in core.founders], indent=2)}")
        parts.append(f"## Investors\n{json.dumps([i.model_dump() for i in core.investors], indent=2)}")
        parts.append(f"## Competitors\n{json.dumps([c.model_dump() for c in core.competitors], indent=2)}")
        parts.append(f"## Market\n{market.market.model_dump_json(indent=2)}")
        parts.append(f"## M&A Transactions (raw)\n{json.dumps([a.model_dump() for a in market.acquisitions], indent=2)}")
        parts.append(f"## Risk Signals (raw)\n{json.dumps([r.model_dump() for r in signals.risk_signals], indent=2)}")
        parts.append(f"## Exit Signals\n{signals.exit_signals.model_dump_json(indent=2)}")

        if graph_insights.neo4j_available:
            parts.append(f"## Graph Insights\n{json.dumps(graph_insights.model_dump(), indent=2)}")

        return "\n\n".join(parts)


class MemoAgent:
    """Generates the full investment memo in markdown."""

    def generate(
        self,
        company: str,
        stage: str,
        exit_type: str,
        core: CoreEntities,
        market: MarketEntities,
        signals: SignalEntities,
        analysis: AnalysisOutput,
        graph_insights: GraphInsights,
        preferences: str = "",
    ) -> str:
        content = self._build_memo_prompt(company, stage, exit_type, core, market, signals, analysis, graph_insights)
        instructions = MEMO_INSTRUCTIONS
        if preferences and preferences.strip():
            instructions += (
                "\n\n---\n"
                "ANALYST PREFERENCES — apply these adjustments to this memo:\n"
                f"{preferences.strip()}\n"
                "Honour these preferences while maintaining the required structure above."
            )
        try:
            return _call_freeform(instructions, content)
        except Exception as e:
            logger.error(f"Memo generation failed: {e}")
            return f"# Investment Memo — {company}\n\n*Memo generation encountered an error: {e}*"

    def _build_memo_prompt(
        self,
        company: str,
        stage: str,
        exit_type: str,
        core: CoreEntities,
        market: MarketEntities,
        signals: SignalEntities,
        analysis: AnalysisOutput,
        graph_insights: GraphInsights,
    ) -> str:
        parts = [
            f"Company: {company}\nLast funding round (infer stage from this): {core.funding.last_round or 'Unknown'}\nTotal raised: {core.funding.total_raised or 'Unknown'}\nNote: Determine the most appropriate stage classification (Seed/Series A/B/C/Growth/Public) and most likely exit path (IPO vs Strategic Acquisition) from the data — do not ask the user.\n",
            f"## Company Profile\n{core.company.model_dump_json(indent=2)}",
            f"## Funding\n{core.funding.model_dump_json(indent=2)}",
            f"## Traction\n{core.traction.model_dump_json(indent=2)}",
            f"## Founders\n{json.dumps([f.model_dump() for f in core.founders], indent=2)}",
            f"## Investors\n{json.dumps([i.model_dump() for i in core.investors], indent=2)}",
            f"## Market\n{market.market.model_dump_json(indent=2)}",
            f"## Competitors\n{json.dumps([c.model_dump() for c in core.competitors], indent=2)}",
            f"## M&A Comps\n{json.dumps([c.model_dump() for c in analysis.comps], indent=2)}",
            f"## Red Flags\n{json.dumps([r.model_dump() for r in analysis.red_flags], indent=2)}",
            f"## Exit Probability\n{analysis.exit_probability.model_dump_json(indent=2)}",
            f"## Ranked Acquirers\n{json.dumps([a.model_dump() for a in analysis.ranked_acquirers], indent=2)}",
            f"## Competitive Position: {analysis.competitive_position}",
        ]
        if graph_insights.neo4j_available:
            parts.append(f"## Graph Insights\n{json.dumps(graph_insights.model_dump(), indent=2)}")
        return "\n\n".join(parts)
