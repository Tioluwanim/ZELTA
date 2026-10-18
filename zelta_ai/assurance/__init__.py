"""Layered identity assurance ("proportionate KYC" for a read-only product).

NOT regulated KYC: ZELTA does not hold or move money, and nothing here makes it KYC-compliant.
It answers a smaller question: how much do we trust that this account is this person, and which
features does that trust unlock? Several independent evidence families are checked and then stacked.
"""
from .checks import check_behaviour, check_contact, check_institution_email, check_name_match
from .evidence import Assessment, Evidence, Family, Level, Status, assess
from .gating import permissions_for

__all__ = ["Evidence", "Family", "Status", "Level", "Assessment", "assess", "check_name_match",
           "check_institution_email", "check_behaviour", "check_contact", "permissions_for"]
