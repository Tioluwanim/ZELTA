"""Opportunity model. Provenance is mandatory so sourced facts, estimates and AI ideas are never confused."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Tuple

from domain.money import Money

CATEGORIES = ("EARN", "SAVE", "GROW")
PROVENANCE = ("sourced", "estimate", "ai_suggestion")
RISKS = ("low", "medium", "high", "unknown")


@dataclass(frozen=True)
class Opportunity:
    id: str
    category: str                      # EARN | SAVE | GROW
    title: str
    provenance: str                    # sourced | estimate | ai_suggestion
    rationale: str                     # why this is relevant to this user
    source: Optional[str] = None       # URL or named source; REQUIRED when provenance == "sourced"
    expected_benefit: Optional[Money] = None
    cost: Optional[Money] = None
    risk: str = "unknown"
    confidence: Optional[float] = None
    expires_at: Optional[datetime] = None
    eligibility: Tuple[str, ...] = ()
    prerequisites: Tuple[str, ...] = ()

    def __post_init__(self):
        if self.category not in CATEGORIES:
            raise ValueError(f"category must be one of {CATEGORIES}")
        if self.provenance not in PROVENANCE:
            raise ValueError(f"provenance must be one of {PROVENANCE}")
        if self.risk not in RISKS:
            raise ValueError(f"risk must be one of {RISKS}")
        if self.provenance == "sourced" and not self.source:
            raise ValueError("a sourced opportunity must name its source")
        if self.provenance == "ai_suggestion" and (self.expected_benefit is not None or self.source):
            raise ValueError("an AI suggestion cannot carry an expected benefit or pose as sourced")
        if self.provenance == "estimate" and self.confidence is None:
            raise ValueError("an estimate must state its confidence")
        if self.confidence is not None and not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be within [0, 1]")
