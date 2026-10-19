# LLM adapter: replacing third-party models with ZELTA's own

Nothing outside `llm/` knows which model is in use. The agent depends only on `LLMProvider.generate(LLMRequest)`
(or the older `complete(system, user)`). The maths never depends on a model: with no provider configured every
answer comes from deterministic templates.

## Plug in any model
Wrap it in a function and register it by name. No vendor SDK is imported by this repo.

```python
from llm import CallableProvider, ProviderRegistry, build_stack
reg = ProviderRegistry()
reg.register("vendor_x", lambda: CallableProvider(lambda req: my_vendor_call(req.system, req.user),
                                                  name="vendor_x", model="...", timeout_s=20))
reg.register("zelta_own", lambda: CallableProvider(lambda req: my_model.generate(req.system, req.user),
                                                   name="zelta_own", model="zelta-v1"))
stack = build_stack(reg)            # reads LLM_PROVIDERS / LLM_SHADOW
orchestrator = Orchestrator(registry, llm=stack.provider)
```

## Configuration
| Variable | Meaning |
|---|---|
| `LLM_PROVIDERS` | comma list in fallback order; empty = no model (default) |
| `LLM_SHADOW` | candidate to shadow-test (never answers users) |

The stack is: Guard (scrub secrets, strip control chars, cap sizes) → Instrumentation (metadata only, no prompts)
→ [Shadow] → Fallback chain with per-provider circuit breaker → Retry (retryable errors only) → provider.

## Retiring third-party models
1. Register your own model and set `LLM_SHADOW=zelta_own` while a third party stays primary.
2. `stack.shadow_log.stats()` reports success rate, agreement on figures, and number-safety (does the candidate
   only use figures present in the engine facts).
3. `ready_to_promote()` is true only with enough samples, high success and 100% number-safety. These thresholds are
   PROPOSED defaults, not validated. Add human review of sampled outputs before promoting.
4. Switch `LLM_PROVIDERS=zelta_own` and delete the third-party registration. No other code changes.

## Safety properties (tested)
- Model output is accepted only if its figures appear in the tool facts; otherwise the template is used.
- A model can never choose tools outside a fixed whitelist or supply tool arguments (`LLMPlanner`).
- Vendor exception text is never propagated (it can contain prompts or keys); call logs hold no prompt text.
- Prompts pass through the redactor before leaving the process.

## Limits
- No real vendor wrapper is shipped or tested; the snippets above are the integration point.
- Breakers and conversation state are in-process, per instance.
- Shadow comparison is figure-level, not a quality judgement of wording.
