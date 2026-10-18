"""Time rules. Instants are stored timezone-aware (UTC); calendar logic uses Africa/Lagos.

Nothing in this package reads the system clock: callers pass `as_of`.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

LAGOS = ZoneInfo("Africa/Lagos")
UTC = timezone.utc


class NaiveDatetimeError(ValueError):
    """A timezone-naive datetime was supplied where an instant is required."""


def require_aware(ts: datetime, name: str = "timestamp") -> datetime:
    if not isinstance(ts, datetime):
        raise TypeError(f"{name} must be a datetime")
    if ts.tzinfo is None or ts.tzinfo.utcoffset(ts) is None:
        raise NaiveDatetimeError(f"{name} must be timezone-aware")
    return ts


def lagos_date(ts: datetime) -> date:
    """Calendar day (in Lagos) that an instant falls on."""
    return require_aware(ts).astimezone(LAGOS).date()


def to_utc(ts: datetime) -> datetime:
    return require_aware(ts).astimezone(UTC)


def age_hours(then: datetime, as_of: datetime) -> float:
    return (require_aware(as_of, "as_of") - require_aware(then, "then")).total_seconds() / 3600


def lagos_day_start(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, tzinfo=LAGOS)


def days_ago(as_of: datetime, n: int) -> date:
    return lagos_date(as_of) - timedelta(days=n)
