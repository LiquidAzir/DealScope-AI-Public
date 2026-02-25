from pydantic import BaseModel, Field
from typing import List, Optional


# ── Company ──────────────────────────────────────────────────────────────────

class CompanyInfo(BaseModel):
    name: str
    sector: str = ""
    sub_sector: str = ""
    founded_year: Optional[int] = None
    hq_location: str = ""
    description: str = ""
    business_model: str = ""
    key_products: List[str] = Field(default_factory=list)


class Founder(BaseModel):
    name: str
    role: str = ""
    background: str = ""
    prior_companies: List[str] = Field(default_factory=list)


class Investor(BaseModel):
    name: str
    type: str = "Unknown"          # VC | PE | Corporate | Angel | Unknown
    rounds_participated: List[str] = Field(default_factory=list)
    is_lead: bool = False


class Funding(BaseModel):
    total_raised: str = ""
    last_round: str = ""
    last_round_amount: str = ""
    last_valuation: str = ""


class Traction(BaseModel):
    estimated_revenue: str = ""
    revenue_model: str = ""
    notable_customers: List[str] = Field(default_factory=list)
    employee_count: str = ""
    growth_signals: List[str] = Field(default_factory=list)


class Competitor(BaseModel):
    name: str
    overlap_type: str = "direct"   # direct | adjacent | emerging
    differentiator: str = ""
    estimated_funding: str = ""


# ── Market / M&A ─────────────────────────────────────────────────────────────

class MarketInfo(BaseModel):
    name: str = ""
    tam: str = ""
    growth_rate: str = ""
    key_trends: List[str] = Field(default_factory=list)
    adjacent_markets: List[str] = Field(default_factory=list)


class Acquisition(BaseModel):
    target: str
    acquirer: str
    year: Optional[int] = None
    deal_size: str = ""
    implied_multiple: str = ""
    strategic_rationale: str = ""


class CompetitorDetail(BaseModel):
    name: str
    total_funding: str = ""
    key_investors: List[str] = Field(default_factory=list)
    estimated_revenue: str = ""


# ── Signals ───────────────────────────────────────────────────────────────────

class RiskSignal(BaseModel):
    signal: str
    severity: str = "medium"       # low | medium | high
    source: str = ""
    detail: str = ""


class Partnership(BaseModel):
    partner: str
    type: str = ""
    significance: str = ""


class ExitSignals(BaseModel):
    ipo_indicators: List[str] = Field(default_factory=list)
    acquisition_indicators: List[str] = Field(default_factory=list)
    sector_exit_activity: str = ""


# ── Aggregate entity bundles (one per extraction wave) ────────────────────────

class CoreEntities(BaseModel):
    company: CompanyInfo = Field(default_factory=CompanyInfo)
    founders: List[Founder] = Field(default_factory=list)
    investors: List[Investor] = Field(default_factory=list)
    funding: Funding = Field(default_factory=Funding)
    traction: Traction = Field(default_factory=Traction)
    competitors: List[Competitor] = Field(default_factory=list)


class MarketEntities(BaseModel):
    market: MarketInfo = Field(default_factory=MarketInfo)
    acquisitions: List[Acquisition] = Field(default_factory=list)
    competitor_details: List[CompetitorDetail] = Field(default_factory=list)


class SignalEntities(BaseModel):
    risk_signals: List[RiskSignal] = Field(default_factory=list)
    partnerships: List[Partnership] = Field(default_factory=list)
    exit_signals: ExitSignals = Field(default_factory=ExitSignals)
