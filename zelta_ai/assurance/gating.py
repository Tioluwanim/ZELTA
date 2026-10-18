"""Step-up: which tool scopes an assurance level unlocks. Unknown or low assurance gets less, never more."""
from __future__ import annotations

from typing import FrozenSet

from .evidence import Assessment, Level

_LEVEL_SCOPES = {
    Level.NONE: frozenset(),
    Level.BASIC: frozenset({"twin:read"}),
    Level.STANDARD: frozenset({"twin:read", "twin:simulate", "opportunities:read"}),
    Level.STRONG: frozenset({"twin:read", "twin:simulate", "opportunities:read"}),
    # STRONG adds nothing yet because no sensitive scope exists. Money movement is deliberately not
    # offered at any level; a future "share data / connect new account" scope would start at STRONG.
}


def permissions_for(assessment: Assessment) -> FrozenSet[str]:
    return _LEVEL_SCOPES[assessment.level]
