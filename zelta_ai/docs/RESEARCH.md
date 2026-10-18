# Research record

Status: a technical baseline, not a solved problem. "Established" means supported by a source or by a test
in this repo; everything else is provisional.

## Findings carried over (from the earlier research and experiments)
| Finding | Basis | Strength |
|---|---|---|
| Explicit income timing beats spectral methods for regular income; rolling/robust baselines win for irregular income and regime change | my synthetic experiments (`ZELTA_Engineering_Lab_source.zip`, lab/) | **weak**: synthetic data, one seed, my own generator |
| Ungated Lomb-Scargle falls into a harmonic trap; a wavelet level forecast never beat the rolling baseline | same | weak (same caveat) |
| The rolling bootstrap 80% interval under-covers (51-64%) | same | weak |
| Moving averages hide moderate shocks; median/MAD catches more | same | weak |
| Renewal models have a censoring bias on short windows | same | moderate (known statistical issue) |
| Mono: shared-secret webhook header; per-account rate limit on real-time refresh; separate reauth flow | Mono docs pages read earlier | moderate; sandbox, pending/posted states, idempotency **not documented on pages read** |
| Rumpty: no automatic DB backups; rollback redeploys previous image only | Rumpty docs read earlier | moderate |

## Design decisions (and why)
1. **Integer minor units and injected `as_of`** (ADR-1/3): removes float drift and hidden clock reads. Sound by construction.
2. **Provider rows are normalised once** (`ledger/normalise.py`): dedupe by idempotency key, pending replaced by posted, reversals, own-account transfers. The original payload hash is retained.
3. **Evidence thresholds**: burn needs at least 7 covered days, else "insufficient" (not zero). Unknown balances/stability are never treated as zero or as stable (cushion assumes least stable).
4. **Observed / inferred / context / simulated are separate objects** (`financial_twin/twin.py`).
5. **The LLM explains; it never calculates.** Its text is dropped if it contains figures absent from tool facts.
6. **Opportunity engine generates nothing**; it ranks supplied, provenance-tagged items. GROW is hidden until the cushion is covered.

## PROPOSED constants (not validated on real data)
Burn blend 0.7/0.3; coverage thresholds 7/14/28 days; stale 24 h / exclude 72 h; stability weights 0.45/0.35/0.20 and
CV scale 0.35; cushion = essentials x 7 days x (1 + 0.5(1-S)) rounded up to the next 500 naira; scenario
multipliers 1.10/1.00/0.92 and income hit-rate gates 0.85/0.60/0.40; transfer pairing window 48 h; safe-flexible
horizon 14 days. **Basis points** were mentioned in earlier discussion but no trace of a basis-point rule exists in the repo
or research files; none is used. The earlier "Guardian" purchase-score weights were not ported.

## Mocked or scaffolded
Mono (mapping + errors only, never live); `MockProvider`; the opportunity catalogue (empty by default); the LLM
interface (no vendor wired); consent/audit stores (in-memory); webhook verification (no route).

## Open questions needing experiments
- Real-data accuracy of the 28/7 blend and of the stability score; calibration of forecast intervals.
- Whether pending-vs-posted matching needs a heuristic when Mono gives no pending state.
- How Mono signals reauthorisation and how often balances really refresh.
- Which external signals (e.g. Bayse stress, inflation, academic calendar) actually improve decisions; none feed the maths today.
- Category quality for "essential" spending (the twin currently takes essential categories as a caller-supplied list).

## Replaceable components
`engines/burn.py` (alternative baselines), `engines/runway.py::forecast` (alternative uncertainty models),
`opportunities/engine.py` (ranking), `providers/*` (any provider behind `FinancialProvider`),
`agents/llm.py` (any model behind `LLMClient`), `agents/orchestrator.py::route` (router).

## Verification (actual runs, see README for commands)
Baseline before this work, legacy `zelta_ai/tests` with `PYTHONPATH=.:brain`: 4 collection errors
(`test_nlp_scorer`, `test_nlp_scraper`, `test_rest`, `test_stress_index`), then 7 passed / 4 failed / 7 errors in the rest
(live-URL tests, an `async` test without a plugin, and `ZeltaBayesianEngine` signature drift). They were failing before
and were not modified.
