"""Evidence and stacking. Deliberately rule-based, not a probability: every level is explainable.

Stacking rules (PROPOSED, not validated against real fraud data):
  * only fresh, VERIFIED evidence counts, and each family counts once (the latest item);
  * one CONTRADICTED item caps the level at BASIC and is reported: a mismatch outweighs agreement;
  * BASIC    = contact control verified
  * STANDARD = 2+ independent families, including contact control or account ownership
  * STRONG   = 3+ families, including account ownership AND (institution OR external registry)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum, IntEnum
from typing import Dict, List, Sequence, Tuple

from domain.clock import require_aware


class Family(str, Enum):
    CONTACT = "contact"                    # control of an email/phone
    INSTITUTION = "institution"            # tied to a school/organisation (e.g. student email domain)
    ACCOUNT_OWNERSHIP = "account_ownership"  # name on the bank account matches the claimed name
    BEHAVIOUR = "behaviour"                # the account looks lived-in (history depth)
    EXTERNAL_REGISTRY = "external_registry"  # an online check against an authoritative source


class Status(str, Enum):
    VERIFIED = "verified"
    CONTRADICTED = "contradicted"          # evidence disagrees with the claim
    INCONCLUSIVE = "inconclusive"          # partial / ambiguous
    UNAVAILABLE = "unavailable"            # not checked, source down or no data


class Level(IntEnum):
    NONE = 0
    BASIC = 1
    STANDARD = 2
    STRONG = 3


@dataclass(frozen=True)
class Evidence:
    family: Family
    source: str                            # e.g. "firebase_auth", "mono_account_name"
    status: Status
    observed_at: datetime
    fresh_for: timedelta = timedelta(days=90)
    code: str = ""                         # short machine reason; NEVER personal data (no names, BVN, NIN)

    def __post_init__(self):
        require_aware(self.observed_at, "observed_at")

    def is_fresh(self, as_of: datetime) -> bool:
        return self.observed_at <= as_of and as_of - self.observed_at <= self.fresh_for


@dataclass(frozen=True)
class Assessment:
    level: Level
    families_used: Tuple[Family, ...]
    contradictions: Tuple[Family, ...]
    missing: Tuple[Family, ...]            # families with no usable evidence (what to ask for to step up)
    reasons: Tuple[str, ...] = field(default_factory=tuple)


def assess(evidence: Sequence[Evidence], as_of: datetime) -> Assessment:
    require_aware(as_of, "as_of")
    latest: Dict[Family, Evidence] = {}
    for e in sorted((x for x in evidence if x.is_fresh(as_of)), key=lambda x: x.observed_at):
        latest[e.family] = e
    verified = {f for f, e in latest.items() if e.status is Status.VERIFIED}
    contradicted = tuple(sorted((f for f, e in latest.items() if e.status is Status.CONTRADICTED),
                                key=lambda f: f.value))
    reasons: List[str] = []
    if Family.CONTACT in verified:
        level = Level.BASIC
        if len(verified) >= 2 and (Family.CONTACT in verified or Family.ACCOUNT_OWNERSHIP in verified):
            level = Level.STANDARD
        if (len(verified) >= 3 and Family.ACCOUNT_OWNERSHIP in verified
                and verified & {Family.INSTITUTION, Family.EXTERNAL_REGISTRY}):
            level = Level.STRONG
    elif Family.ACCOUNT_OWNERSHIP in verified and len(verified) >= 2:
        level = Level.STANDARD
    else:
        level = Level.NONE
    if contradicted and level > Level.BASIC:
        level = Level.BASIC
        reasons.append("capped at BASIC: evidence contradicts the claim in " + ", ".join(f.value for f in contradicted))
    elif contradicted:
        reasons.append("contradicting evidence: " + ", ".join(f.value for f in contradicted))
    missing = tuple(f for f in Family if f not in verified)
    return Assessment(level, tuple(sorted(verified, key=lambda f: f.value)), contradicted, missing, tuple(reasons))
