import json
import logging
from typing import Any, Dict, List
from openai import OpenAI
from config import OPENAI_API_KEY, OPENAI_MODEL
from schemas.core import CoreEntities, MarketEntities, SignalEntities

logger = logging.getLogger(__name__)

client = OpenAI(api_key=OPENAI_API_KEY)

# ── JSON Schemas for structured extraction ────────────────────────────────────

CORE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["company", "founders", "investors", "funding", "traction", "competitors"],
    "properties": {
        "company": {
            "type": "object",
            "additionalProperties": False,
            "required": ["name", "sector", "sub_sector", "founded_year", "hq_location", "description", "business_model", "key_products"],
            "properties": {
                "name": {"type": "string"},
                "sector": {"type": "string"},
                "sub_sector": {"type": "string"},
                "founded_year": {"type": ["integer", "null"]},
                "hq_location": {"type": "string"},
                "description": {"type": "string"},
                "business_model": {"type": "string"},
                "key_products": {"type": "array", "items": {"type": "string"}},
            },
        },
        "founders": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "role", "background", "prior_companies"],
                "properties": {
                    "name": {"type": "string"},
                    "role": {"type": "string"},
                    "background": {"type": "string"},
                    "prior_companies": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "investors": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "type", "rounds_participated", "is_lead"],
                "properties": {
                    "name": {"type": "string"},
                    "type": {"type": "string", "enum": ["VC", "PE", "Corporate", "Angel", "Unknown"]},
                    "rounds_participated": {"type": "array", "items": {"type": "string"}},
                    "is_lead": {"type": "boolean"},
                },
            },
        },
        "funding": {
            "type": "object",
            "additionalProperties": False,
            "required": ["total_raised", "last_round", "last_round_amount", "last_valuation"],
            "properties": {
                "total_raised": {"type": "string"},
                "last_round": {"type": "string"},
                "last_round_amount": {"type": "string"},
                "last_valuation": {"type": "string"},
            },
        },
        "traction": {
            "type": "object",
            "additionalProperties": False,
            "required": ["estimated_revenue", "revenue_model", "notable_customers", "employee_count", "growth_signals"],
            "properties": {
                "estimated_revenue": {"type": "string"},
                "revenue_model": {"type": "string"},
                "notable_customers": {"type": "array", "items": {"type": "string"}},
                "employee_count": {"type": "string"},
                "growth_signals": {"type": "array", "items": {"type": "string"}},
            },
        },
        "competitors": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "overlap_type", "differentiator", "estimated_funding"],
                "properties": {
                    "name": {"type": "string"},
                    "overlap_type": {"type": "string", "enum": ["direct", "adjacent", "emerging"]},
                    "differentiator": {"type": "string"},
                    "estimated_funding": {"type": "string"},
                },
            },
        },
    },
}

MARKET_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["market", "acquisitions", "competitor_details"],
    "properties": {
        "market": {
            "type": "object",
            "additionalProperties": False,
            "required": ["name", "tam", "growth_rate", "key_trends", "adjacent_markets"],
            "properties": {
                "name": {"type": "string"},
                "tam": {"type": "string"},
                "growth_rate": {"type": "string"},
                "key_trends": {"type": "array", "items": {"type": "string"}},
                "adjacent_markets": {"type": "array", "items": {"type": "string"}},
            },
        },
        "acquisitions": {
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
        "competitor_details": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "total_funding", "key_investors", "estimated_revenue"],
                "properties": {
                    "name": {"type": "string"},
                    "total_funding": {"type": "string"},
                    "key_investors": {"type": "array", "items": {"type": "string"}},
                    "estimated_revenue": {"type": "string"},
                },
            },
        },
    },
}

SIGNAL_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["risk_signals", "partnerships", "exit_signals"],
    "properties": {
        "risk_signals": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["signal", "severity", "source", "detail"],
                "properties": {
                    "signal": {"type": "string"},
                    "severity": {"type": "string", "enum": ["low", "medium", "high"]},
                    "source": {"type": "string"},
                    "detail": {"type": "string"},
                },
            },
        },
        "partnerships": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["partner", "type", "significance"],
                "properties": {
                    "partner": {"type": "string"},
                    "type": {"type": "string"},
                    "significance": {"type": "string"},
                },
            },
        },
        "exit_signals": {
            "type": "object",
            "additionalProperties": False,
            "required": ["ipo_indicators", "acquisition_indicators", "sector_exit_activity"],
            "properties": {
                "ipo_indicators": {"type": "array", "items": {"type": "string"}},
                "acquisition_indicators": {"type": "array", "items": {"type": "string"}},
                "sector_exit_activity": {"type": "string"},
            },
        },
    },
}


# ── API helpers ───────────────────────────────────────────────────────────────

def _call_structured(instructions: str, content: str, schema: dict, schema_name: str) -> dict:
    """
    Call OpenAI and return parsed JSON.
    Tries the Responses API first (for reasoning models); falls back to
    Chat Completions with response_format if the model doesn't support it.
    """
    # Try Responses API (reasoning models like o1, gpt-5.2)
    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            instructions=instructions,
            input=content,
            reasoning={"effort": "medium"},
            text={
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
                    "schema": schema,
                    "strict": True,
                }
            },
        )
        return json.loads(response.output_text)
    except Exception as e:
        logger.warning(f"Responses API failed ({e}), falling back to Chat Completions")

    # Fallback: Chat Completions with JSON schema response format
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": instructions},
            {"role": "user", "content": content},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": schema_name,
                "schema": schema,
                "strict": True,
            },
        },
    )
    return json.loads(response.choices[0].message.content)


def _call_freeform(instructions: str, content: str, effort: str = "high") -> str:
    """
    Call OpenAI for free-form text output (investment memo).
    Tries Responses API first, then falls back to Chat Completions.
    """
    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            instructions=instructions,
            input=content,
            reasoning={"effort": effort},
        )
        return response.output_text
    except Exception as e:
        logger.warning(f"Responses API (freeform) failed ({e}), falling back to Chat Completions")

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": instructions},
            {"role": "user", "content": content},
        ],
    )
    return response.choices[0].message.content


# ── ExtractionAgent ───────────────────────────────────────────────────────────

class ExtractionAgent:
    """Converts raw research text into structured entity objects."""

    def extract_core(self, raw_text: str) -> CoreEntities:
        instructions = (
            "You are a precise VC research assistant. Extract all available information "
            "about the company from the research text below. If a field is unknown, use "
            "an empty string or empty list — never hallucinate. Be conservative and "
            "evidence-based."
        )
        try:
            data = _call_structured(instructions, raw_text, CORE_SCHEMA, "core_extraction")
            return CoreEntities(**data)
        except Exception as e:
            logger.error(f"Core extraction failed: {e}")
            return CoreEntities()

    def extract_market(self, raw_text: str) -> MarketEntities:
        instructions = (
            "You are a VC research assistant specializing in market intelligence and M&A. "
            "Extract market data, M&A comparable transactions, and competitor funding details "
            "from the research text. Include every acquisition mentioned with deal size if available."
        )
        try:
            data = _call_structured(instructions, raw_text, MARKET_SCHEMA, "market_extraction")
            return MarketEntities(**data)
        except Exception as e:
            logger.error(f"Market extraction failed: {e}")
            return MarketEntities()

    def extract_signals(self, raw_text: str) -> dict:
        from schemas.core import SignalEntities
        instructions = (
            "You are a risk analyst. Extract risk signals, strategic partnerships, and exit "
            "indicators from the research text. Be thorough — include subtle signals like "
            "leadership changes, burn rate concerns, and market timing risks."
        )
        try:
            data = _call_structured(instructions, raw_text, SIGNAL_SCHEMA, "signal_extraction")
            return SignalEntities(**data)
        except Exception as e:
            logger.error(f"Signal extraction failed: {e}")
            from schemas.core import SignalEntities
            return SignalEntities()
