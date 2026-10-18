"""Tool registry: explicit schemas, permission scopes, validation, predictable failure, audit trail.

Arguments arrive as untrusted data (they may originate from user text or a model). They are validated
against a strict pydantic model (unknown fields forbidden) and checked against the caller's permission
scopes before any handler runs. Handlers receive read-only context and return plain dicts.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, FrozenSet, List, Mapping, Optional, Type

from pydantic import BaseModel, ValidationError

from financial_twin.twin import TwinSnapshot
from openbanking.audit import AuditLog
from openbanking.redact import redact, safe_error


@dataclass(frozen=True)
class ToolContext:
    user_id: str
    as_of: datetime
    permissions: FrozenSet[str]
    snapshot: Optional[TwinSnapshot] = None
    opportunity_engine: Any = None
    audit: Optional[AuditLog] = None


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    input_model: Type[BaseModel]
    handler: Callable[[ToolContext, BaseModel], Dict[str, Any]]
    scope: str                    # permission the caller must hold, e.g. "twin:read"
    mutating: bool = False        # no mutating tool exists yet; money movement is deliberately out of scope


@dataclass(frozen=True)
class ToolResult:
    tool: str
    ok: bool
    data: Mapping[str, Any] = field(default_factory=dict)
    error: Optional[str] = None   # stable code: unknown_tool | permission_denied | invalid_arguments | tool_error | no_data
    detail: Optional[str] = None  # redacted, short


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        if tool.name in self._tools:
            raise ValueError(f"duplicate tool {tool.name}")
        self._tools[tool.name] = tool

    def names(self) -> List[str]:
        return sorted(self._tools)

    def describe(self) -> List[Dict[str, Any]]:
        return [{"name": t.name, "description": t.description, "scope": t.scope,
                 "schema": t.input_model.model_json_schema()} for t in self._tools.values()]

    def call(self, name: str, raw_args: Mapping[str, Any], ctx: ToolContext) -> ToolResult:
        tool = self._tools.get(name)
        if tool is None:
            return self._done(ctx, ToolResult(name, False, error="unknown_tool"), raw_args)
        if tool.scope not in ctx.permissions:
            return self._done(ctx, ToolResult(name, False, error="permission_denied"), raw_args)
        try:
            args = tool.input_model.model_validate(dict(raw_args))
        except ValidationError as exc:
            return self._done(ctx, ToolResult(name, False, error="invalid_arguments",
                                              detail="; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}"
                                                               for e in exc.errors())[:300]), raw_args)
        try:
            return self._done(ctx, ToolResult(name, True, tool.handler(ctx, args)), raw_args)
        except LookupError as exc:       # handler signals "no data available"
            return self._done(ctx, ToolResult(name, False, error="no_data", detail=safe_error(exc)), raw_args)
        except Exception as exc:         # never leak internals or stack traces to the caller
            return self._done(ctx, ToolResult(name, False, error="tool_error", detail=safe_error(exc)), raw_args)

    @staticmethod
    def _done(ctx: ToolContext, res: ToolResult, raw_args: Mapping[str, Any]) -> ToolResult:
        if ctx.audit is not None:
            ctx.audit.record(ctx.as_of, ctx.user_id, "tool.run", res.tool,
                             "ok" if res.ok else f"error:{res.error}", {"args": redact(dict(raw_args))})
        return res
