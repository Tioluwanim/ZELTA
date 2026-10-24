# Open Banking security: implemented vs outstanding

Nothing here makes ZELTA production-secure, regulator-approved, or compliant with any regulation. These are
engineering controls at the boundary; compliance is a separate process.

## Implemented (code + tests in `tests/twin/test_providers_security.py`)
| Control | Where | Status |
|---|---|---|
| Consent lifecycle (pending, active, reauth-required, withdrawn, revoked, expired); terminal states cannot be revived | `openbanking/consent.py` | implemented, in-memory store only |
| Least privilege: scope check (`accounts`, `balances`, `transactions`, `identity`) before data access; twin refuses without consent when a store is supplied | `consent.require_consent`, `financial_twin/twin.py` | implemented |
| Withdraw = mark WITHDRAWN first (fail closed), then ask provider to revoke | `consent.withdraw` | implemented |
| Secrets wrapped so they never appear in `repr`/`str`/f-strings; env loading returns `None` for absent | `openbanking/secrets.py` | implemented |
| Redaction of secrets, long digit runs (account numbers), bearer tokens and financial payload fields in logs, errors, audit and agent traces | `openbanking/redact.py` | implemented, heuristic |
| Webhook authentication: constant-time shared-secret check (Mono's documented scheme) and HMAC-SHA256 helper; fails closed with no secret | `openbanking/webhook.py` | implemented, not wired to a route |
| Provider response validation and normalised errors (auth, rate limit, unavailable, invalid response, not configured) | `providers/base.py`, `providers/mono.py` | implemented for the mapping layer |
| Access audit with redacted detail | `openbanking/audit.py` | implemented, in-memory only |
| Agent tool permissions, strict argument validation, no money-moving tool exists | `agent_tools/registry.py` | implemented |
| Layered identity assurance with step-up gating of tool scopes (stacked evidence, contradiction cap) | `assurance/` | implemented as pure logic; not wired to real signals; no online registry connected |
| `/api/stress` and `/api/markets` require the internal key; per-caller rate limit (in-process, per instance); error text no longer leaked from `/api/markets`; CORS default is closed (`ALLOWED_ORIGINS` allow-list, no wildcard, no credentials) | `api/routes.py`, `ratelimit.py`, `config/cors.py` | implemented; the zelta_backend service already sends the key on these calls |
| Internal-key check is constant-time and secure-by-default | `security.py` | implemented (Day 1) |
| `/dev` token routes closed unless `APP_ENV=local` | `zelta_backend/main.py` | implemented (Day 1) |

## Not implemented / outstanding before real users' bank data
- **Live Mono integration** (no sandbox credentials were available; endpoint paths and field semantics are unverified).
- Persistent, encrypted consent and token storage; key rotation; secret manager integration.
- Webhook replay protection and a real webhook route; idempotent webhook processing.
- Edge/gateway rate limiting (the in-process limiter is per instance), request signing between backend and AI service beyond the shared key, mTLS or service identity.
- Tamper-evident audit storage and retention policy.
- Encryption of stored financial data, data-retention and deletion workflows.
- Legacy issues in `docs/AUDIT_DAY1.md` (float money, `detail=str(e)`, wildcard CORS, hardcoded test key).
- Regulatory work: CBN open-banking framework and guidelines, NDPA 2023 and its implementing directions, CBN
  cybersecurity expectations, and the relevant API-security and OAuth standards (OWASP API Top 10, RFC 9700,
  FAPI 2.0). The earlier research reached these through secondary sources; **the CBN and NDPC primary texts were
  not read**. Have them reviewed by someone qualified before collecting real bank data.


## Bank-link lifecycle (Day 14) status

`openbanking/link.py` implements start, complete, sync, webhook and withdraw with consent gating, redacted audit, fail-closed webhook auth and event-id idempotency, tested with fakes. Not done and not claimed: any live Mono call; the real event names and payload shapes (marked UNVERIFIED in code); the code-exchange endpoint (no exchanger is wired, so completing a link raises NotConfigured); persistent consent and audit stores (in-memory only); webhook timestamp-based replay protection; the consent lifetime (90 days is a proposal).

## Error text (fixed)

Backend routes no longer put exception text in 500 responses (wallet, profile, intelligence, portfolio, squad, mono, gig, behavioral, simulation, dev auth); the detail is logged and the client gets a generic message. User-facing 400/404 messages written by the services are unchanged. `zelta_backend/tests/test_error_hygiene.py` guards this.
