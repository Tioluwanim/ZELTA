"""Opportunity Engine: Earn / Save / Grow. Separate from the Financial Twin; consumes snapshots only."""
from .engine import BaselineOpportunityEngine, OpportunityEngine, RankedOpportunity
from .models import Opportunity

__all__ = ["Opportunity", "OpportunityEngine", "BaselineOpportunityEngine", "RankedOpportunity"]
