# Day 1 audit: what the code does today

Method: read the code and ran the tests. The services were **not** run end to end (no Firebase project, no
Bayse or Gemini keys in this environment), so runtime behaviour is described from source, not observed.

## What exists
| Service | Role | Money maths |
|---|---|---|
| `zelta_backend/` | wallet, profile, simulation, Mono/Squad **simulations**, gig board | `services/*_service.py`, `optimizer.py`; amounts are `float` (`schemas/wallet.py`) |
| `zelta_ai/brain/` | Bayse stress signal, Bayesian/Kelly allocation, NLP scoring, LangGraph agent, Gemini copilot | `brain/agent/student_model.py`, `kelly/`, `bayesian/` (floats, weekly runway) |
| `zelta_ai/` (new, Day 2-4) | provider-independent Financial Twin core | integer kobo, `as_of` always injected |

## Findings
1. **Open door (fixed):** `zelta_backend/routes/dev_auth.py` mints a Firebase custom token for any `uid`, unauthenticated, and was mounted unconditionally. Now mounted only when `APP_ENV=local` (`tests/test_dev_routes_closed.py`).
2. **Open by default (fixed):** `zelta_ai/security.py` and `main.py` defaulted `DEBUG` to `true`, which skips the internal-key check when no key is set and exposes `/docs`. Default is now `false` (`tests/test_security_defaults.py`). Key comparison is constant-time.
3. **Hardcoded key (removed from the file; STILL needs rotation):** `zelta_ai/tests/test_brain.py` contained a literal `INTERNAL_KEY` and a production Cloud Run URL. The test now reads `INTERNAL_API_KEY` and `BRAIN_URL` from the environment, but the old value remains in git history, so the key must be treated as leaked and rotated.
4. **Float money:** all legacy amounts are `float`. Not changed (compatibility); the new core uses `Money` in integer kobo.
5. **Clock reads inside logic:** `datetime.now` / `time.time` appear in `wallet_service.py` (13), `routes/squad.py` (5), `routes/mono.py` (3), `api/routes.py` (3), `vertex/optimizer.py` (3), `brain/pipeline.py` (2) and others. Legacy calculations are therefore not reproducible. Not changed; the new core takes `as_of`.
6. **Two transaction stores:** `wallets/{uid}/transactions` (wallet routes, Mono simulation, seed script) and `users/{uid}/transactions` (`behavioral_service.py`). They can disagree. Not reconciled yet.
7. **Mono is simulated:** `routes/mono.py` generates seeded fake transactions. There is no live Mono call anywhere.
8. **Error leakage:** 38 places return `detail=str(e)` style messages. Not changed.
9. **CORS:** `zelta_ai/main.py` uses `allow_origins=["*"]` with `allow_credentials=True`; `zelta_backend` defaults `ALLOWED_ORIGINS` to `*`. Not changed.
10. **Blocking calls in async routes:** `async def` handlers call the synchronous Firestore client. Not changed.
11. **Legacy tests were already failing before this work:** see `docs/RESEARCH.md` section "Verification".

## Scan findings (Rumpty, run 01a14753...) addressed after the audit
`zelta_backend/requirements.txt` no longer pins vulnerable versions: `python-jose` (unused) and `google-cloud-aiplatform`
(unused) removed; FastAPI/Starlette, `python-multipart`, `requests` raised. A fresh install resolves to Starlette 1.8,
python-multipart 0.0.32, protobuf 7.x and `pip-audit` reports no known vulnerabilities. `zelta_backend/Dockerfile` is now
multi-stage on `python:3.11-slim` (no gcc/kernel headers in the runtime image), runs as a non-root user, and upgrades OS
packages at build. The app was imported and its tests run on that dependency set, but the endpoints were not exercised
against Firebase. `zelta_ai/Dockerfile` and requirements were **not** changed (torch/transformers build not verified here).
