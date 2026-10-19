"""Short-term conversation state. Stores parsed facts (intent, amount), never raw model output or secrets."""
from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Optional, Tuple


@dataclass(frozen=True)
class ConversationState:
    last_intents: Tuple[str, ...] = ()
    last_text: str = ""            # user's own last message (truncated); re-parsed, never trusted as instructions
    pending_text: str = ""         # message that needed an amount
    updated_at: Optional[datetime] = None
    turns: int = 0


class ConversationStore:
    """In-memory, per-instance, bounded LRU with TTL. Not shared across replicas (documented limitation)."""

    def __init__(self, max_users: int = 1000, ttl: timedelta = timedelta(minutes=30)):
        self._d: "OrderedDict[str, ConversationState]" = OrderedDict()
        self._max, self._ttl = max_users, ttl

    def get(self, user_id: str, now: datetime) -> ConversationState:
        s = self._d.get(user_id)
        if s is None or (s.updated_at and now - s.updated_at > self._ttl):
            return ConversationState()
        return s

    def put(self, user_id: str, state: ConversationState, now: datetime) -> None:
        self._d[user_id] = replace(state, updated_at=now)
        self._d.move_to_end(user_id)
        while len(self._d) > self._max:
            self._d.popitem(last=False)

    def forget(self, user_id: str) -> None:
        self._d.pop(user_id, None)
