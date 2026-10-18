"""Baseline Opportunity Engine.

Honest baseline: it generates nothing. It filters and orders opportunities that a caller supplies
(from a verified catalogue, an adapter, or a model clearly labelled ai_suggestion), using transparent rules.
No ranking algorithm is claimed to be validated; replace `rank` when research justifies one.
GROW items are shown only when the twin says the emergency cushion is covered.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import List, Protocol, Sequence, Tuple

from financial_twin.twin import TwinSnapshot
from .models import Opportunity

_RISK_ORDER = {"low": 0, "medium": 1, "high": 2, "unknown": 3}
_PROV_ORDER = {"sourced": 0, "estimate": 1, "ai_suggestion": 2}


@dataclass(frozen=True)
class RankedOpportunity:
    opportunity: Opportunity
    rank: int
    reasons: Tuple[str, ...]


class OpportunityEngine(Protocol):
    def find(self, snapshot: TwinSnapshot, as_of: datetime) -> List[RankedOpportunity]: ...


class BaselineOpportunityEngine:
    def __init__(self, catalogue: Sequence[Opportunity]):
        self._cat = list(catalogue)

    def find(self, snapshot: TwinSnapshot, as_of: datetime) -> List[RankedOpportunity]:
        cushion_ok = self._cushion_covered(snapshot)
        pressed = self._under_pressure(snapshot)
        kept = []
        for o in self._cat:
            if o.expires_at is not None and o.expires_at <= as_of:
                continue
            if o.category == "GROW" and not cushion_ok:
                continue
            kept.append(o)

        def key(o: Opportunity):
            cat_pref = {"EARN": 0, "SAVE": 1, "GROW": 2} if pressed else {"SAVE": 0, "EARN": 1, "GROW": 2}
            benefit = -(o.expected_benefit.minor if o.expected_benefit else 0)
            return (cat_pref[o.category], _PROV_ORDER[o.provenance], _RISK_ORDER[o.risk], benefit, o.id)

        out = []
        for i, o in enumerate(sorted(kept, key=key), 1):
            reasons = [f"provenance: {o.provenance}", f"risk: {o.risk}"]
            if pressed and o.category in ("EARN", "SAVE"):
                reasons.append("runway is short or unknown, so earning and saving come first")
            out.append(RankedOpportunity(o, i, tuple(reasons)))
        return out

    @staticmethod
    def _cushion_covered(s: TwinSnapshot) -> bool:
        c, t = s.inferred.cushion, s.total
        return c is not None and t is not None and t >= c

    @staticmethod
    def _under_pressure(s: TwinSnapshot) -> bool:
        d = s.inferred.runway.days
        return d is None or d < 21
