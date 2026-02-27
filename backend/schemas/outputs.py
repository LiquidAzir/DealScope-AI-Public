# Analysis and graph output schemas — produced by AnalysisAgent and GraphAgent
from pydantic import BaseModel, Field
from typing import List, Optional


class RedFlag(BaseModel):
    signal: str
    severity: str          # HIGH | MEDIUM | LOW
    evidence: str = ""
    implication: str = ""


class CompTransaction(BaseModel):
    target: str
    acquirer: str
    year: Optional[int] = None
    deal_size: str = ""
    implied_multiple: str = ""
    strategic_rationale: str = ""


class PotentialAcquirer(BaseModel):
    name: str
    fit_score: int = 0            # 1-10
    rationale: str = ""
    prior_acquisitions: int = 0
    acquisition_history: List[str] = Field(default_factory=list)


class ExitProbability(BaseModel):
    ipo_score: int = 0            # 1-10
    ipo_reasoning: str = ""
    acquisition_score: int = 0   # 1-10
    acquisition_reasoning: str = ""
    timeline: str = ""           # Near-term | Medium | Long


class AnalysisOutput(BaseModel):
    red_flags: List[RedFlag] = Field(default_factory=list)
    comps: List[CompTransaction] = Field(default_factory=list)
    exit_probability: ExitProbability = Field(default_factory=ExitProbability)
    ranked_acquirers: List[PotentialAcquirer] = Field(default_factory=list)
    competitive_position: str = ""     # Strong | Moderate | Weak


class GraphInsights(BaseModel):
    investor_overlaps: List[dict] = Field(default_factory=list)
    top_acquirers: List[dict] = Field(default_factory=list)
    competitive_density: dict = Field(default_factory=dict)
    graph_stats: dict = Field(default_factory=dict)
    neo4j_available: bool = False
