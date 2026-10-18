"""Access auditing. Entries are redacted before storage; never store raw provider payloads."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, List, Mapping, Optional, Protocol

from domain.clock import require_aware
from .redact import redact


@dataclass(frozen=True)
class AuditEntry:
    at: datetime
    actor: str          # user id or component name
    action: str         # e.g. "fetch_transactions", "consent.withdraw", "tool.run"
    resource: str       # e.g. provider name or tool name
    outcome: str        # "ok" | "denied" | "error:<code>"
    detail: Mapping[str, Any]


class AuditLog(Protocol):
    def record(self, at: datetime, actor: str, action: str, resource: str, outcome: str,
               detail: Optional[Mapping[str, Any]] = None) -> None: ...


class InMemoryAuditLog:
    def __init__(self):
        self.entries: List[AuditEntry] = []

    def record(self, at, actor, action, resource, outcome, detail=None):
        require_aware(at, "at")
        self.entries.append(AuditEntry(at, actor, action, resource, outcome, redact(dict(detail or {}))))
