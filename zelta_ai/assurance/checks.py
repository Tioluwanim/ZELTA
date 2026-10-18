"""Evidence producers. Each compares a claim against something that already exists elsewhere.

They return Evidence with a short machine `code`; they never put names, emails or ID numbers in the result.
An authoritative online check (e.g. an identity registry) is an interface (RegistryChecker), not an
implementation: no live registry is connected, and none is claimed.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timedelta
from typing import Iterable, Optional, Protocol, Sequence

from domain.clock import lagos_date
from domain.events import Event, EventStatus
from .evidence import Evidence, Family, Status

_TITLES = {"mr", "mrs", "ms", "miss", "dr", "prof", "engr", "chief", "alhaji", "alhaja", "pastor", "rev"}


def _tokens(name: str) -> set:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return {t for t in re.split(r"[^a-z]+", s) if t and t not in _TITLES}


def check_name_match(declared: Optional[str], bank_name: Optional[str], as_of: datetime,
                     source: str = "provider_account_name") -> Evidence:
    """Compare the claimed name with the name the bank holds. Order-insensitive; initials allowed.

    VERIFIED: every token of the shorter name appears in the longer one (a lone initial matches a name
    that starts with it) and at least 2 tokens matched. CONTRADICTED: no token overlaps at all.
    Anything in between is INCONCLUSIVE: a partial match is not evidence either way.
    """
    if not declared or not bank_name:
        return Evidence(Family.ACCOUNT_OWNERSHIP, source, Status.UNAVAILABLE, as_of, code="name_missing")
    a, b = _tokens(declared), _tokens(bank_name)
    if not a or not b:
        return Evidence(Family.ACCOUNT_OWNERSHIP, source, Status.UNAVAILABLE, as_of, code="name_unusable")
    short, long_ = (a, b) if len(a) <= len(b) else (b, a)

    def matches(t: str) -> bool:
        return t in long_ or (len(t) == 1 and any(x.startswith(t) for x in long_))
    matched = [t for t in short if matches(t)]
    if len(matched) == len(short) and len(matched) >= 2:
        return Evidence(Family.ACCOUNT_OWNERSHIP, source, Status.VERIFIED, as_of, code="name_match")
    if not matched:
        return Evidence(Family.ACCOUNT_OWNERSHIP, source, Status.CONTRADICTED, as_of, code="name_mismatch")
    return Evidence(Family.ACCOUNT_OWNERSHIP, source, Status.INCONCLUSIVE, as_of, code="name_partial")


def check_contact(email_verified: bool, as_of: datetime, source: str = "firebase_auth") -> Evidence:
    return Evidence(Family.CONTACT, source, Status.VERIFIED if email_verified else Status.UNAVAILABLE, as_of,
                    code="email_verified" if email_verified else "email_unverified")


def check_institution_email(email: Optional[str], email_verified: bool, allowed_domains: Iterable[str],
                            as_of: datetime, source: str = "institution_email") -> Evidence:
    """Verified mailbox on an allow-listed institution domain (exact domain or a subdomain of it)."""
    if not email or "@" not in email or not email_verified:
        return Evidence(Family.INSTITUTION, source, Status.UNAVAILABLE, as_of, code="no_verified_institution_email")
    domain = email.rsplit("@", 1)[1].lower()
    ok = any(domain == d.lower() or domain.endswith("." + d.lower()) for d in allowed_domains)
    return Evidence(Family.INSTITUTION, source, Status.VERIFIED if ok else Status.INCONCLUSIVE, as_of,
                    code="institution_domain" if ok else "domain_not_listed")


def check_behaviour(events: Sequence[Event], as_of: datetime, min_days: int = 56, min_events: int = 20,
                    min_active_weeks: int = 4, source: str = "ledger_history") -> Evidence:
    """'Lived-in' account: enough history, enough posted activity, spread over several weeks.

    Weak evidence by itself (history can be bought or faked); it only counts as one stacked family.
    Thresholds are PROPOSED. Never CONTRADICTED: a new account is unknown, not suspicious.
    """
    posted = [e for e in events if e.status is EventStatus.POSTED]
    if not posted:
        return Evidence(Family.BEHAVIOUR, source, Status.UNAVAILABLE, as_of, code="no_history")
    days = (lagos_date(as_of) - min(lagos_date(e.occurred_at) for e in posted)).days
    weeks = len({lagos_date(e.occurred_at).isocalendar()[:2] for e in posted})
    ok = days >= min_days and len(posted) >= min_events and weeks >= min_active_weeks
    return Evidence(Family.BEHAVIOUR, source, Status.VERIFIED if ok else Status.INCONCLUSIVE, as_of,
                    fresh_for=timedelta(days=30), code="history_depth_ok" if ok else "history_too_thin")


class RegistryChecker(Protocol):
    """Online check against an authoritative registry. Implementations must return only the verdict.

    No implementation exists. Before building one, get legal advice: identity numbers (BVN, NIN) are
    high-risk personal data under the NDPA; do not store them, keep only the verdict and a timestamp.
    """
    def verify(self, subject_ref: str, as_of: datetime) -> Evidence: ...
