import json

import pytest

from llm import (CallableProvider, CircuitBreaker, FallbackProvider, GuardedProvider, LLMBadResponse,
                 LLMNotConfigured, LLMProvider, LLMRateLimited, LLMRequest, LLMResponse, LLMUnavailable,
                 NullProvider, ProviderRegistry, RetryProvider, ScriptedProvider, ShadowProvider, build_stack,
                 InstrumentedProvider, CallLog)

REQ = LLMRequest.simple("sys", "user text")


def test_null_provider_raises_typed_error_and_complete_compat():
    with pytest.raises(LLMNotConfigured):
        NullProvider().generate(REQ)
    assert ScriptedProvider(["hi"]).complete("s", "u") == "hi"


def test_callable_provider_wraps_any_function_and_hides_vendor_errors():
    p = CallableProvider(lambda r: "ok " + r.user, name="mine", model="m1")
    assert p.generate(REQ).text == "ok user text" and p.generate(REQ).provider == "mine"

    def boom(r):
        raise RuntimeError("secret sk-123 in prompt")
    with pytest.raises(LLMUnavailable) as e:
        CallableProvider(boom).generate(REQ)
    assert "sk-123" not in str(e.value) and "RuntimeError" in str(e.value)
    with pytest.raises(LLMBadResponse):
        CallableProvider(lambda r: "  ").generate(REQ)


def test_retry_only_retries_retryable_errors():
    sleeps = []
    p = RetryProvider(ScriptedProvider([LLMRateLimited(), "fine"]), attempts=2, sleep=sleeps.append)
    assert p.generate(REQ).text == "fine" and len(sleeps) == 1
    q = RetryProvider(ScriptedProvider([LLMBadResponse(), "never"]), attempts=3, sleep=sleeps.append)
    with pytest.raises(LLMBadResponse):
        q.generate(REQ)


def test_circuit_breaker_opens_and_half_opens():
    t = [0.0]
    b = CircuitBreaker(2, 30, clock=lambda: t[0])
    b.failure()
    assert not b.is_open
    b.failure()
    assert b.is_open
    t[0] = 31
    assert not b.is_open
    b.success()
    b.failure()
    assert not b.is_open


def test_fallback_skips_failed_and_open_providers():
    t = [0.0]
    bad = ScriptedProvider([LLMUnavailable()] * 10)
    good = ScriptedProvider(["from good"] * 10)
    fb = FallbackProvider([bad, good], threshold=2, cooldown_s=30, clock=lambda: t[0])
    assert fb.generate(REQ).text == "from good"
    fb.generate(REQ)                        # second failure opens bad's breaker
    n = len(bad.requests)
    fb.generate(REQ)
    assert len(bad.requests) == n           # skipped while open
    with pytest.raises(LLMUnavailable):
        FallbackProvider([ScriptedProvider([])]).generate(REQ)


def test_guard_scrubs_prompt_and_output():
    seen = {}
    def fn(r):
        seen["u"] = r.user
        return "ok\x00 done"
    g = GuardedProvider(CallableProvider(fn), max_prompt_chars=50, max_output_chars=5)
    r = g.generate(LLMRequest.simple("s", "x" * 500))
    assert len(seen["u"]) <= 50 and r.text == "ok do"


def test_shadow_never_returns_candidate_and_survives_candidate_failure():
    prim = ScriptedProvider(["runway is 16.99 days"] * 3)
    cand = ScriptedProvider(["runway is 16.99 days", "runway is 99 days", LLMUnavailable()])
    sp = ShadowProvider(prim, cand)
    facts = {"runway_days": 16.99}
    outs = [sp.generate(LLMRequest.simple("s", "u", facts=facts)).text for _ in range(3)]
    assert outs == ["runway is 16.99 days"] * 3
    s = sp.log.stats()
    assert s["samples"] == 3 and s["candidate_success_rate"] == pytest.approx(2 / 3)
    assert s["number_safety_rate"] == 0.5 and not sp.log.ready_to_promote(min_samples=3)


def test_shadow_ready_to_promote_requires_samples_and_perfect_number_safety():
    prim = ScriptedProvider(["a 1"] * 5)
    cand = ScriptedProvider(["b 1"] * 5)
    sp = ShadowProvider(prim, cand)
    for _ in range(5):
        sp.generate(LLMRequest.simple("s", "u", facts={"x": 1}))
    assert sp.log.ready_to_promote(min_samples=5) and not sp.log.ready_to_promote(min_samples=6)


def test_call_log_has_no_prompt_or_output_text():
    log = CallLog()
    InstrumentedProvider(ScriptedProvider(["secret answer"]), log).generate(LLMRequest.simple("s", "my private prompt"))
    blob = json.dumps([r.__dict__ for r in log.records])
    assert "private" not in blob and "secret" not in blob and log.summary() == {"calls": 1, "ok": 1, "failed": 0}


def test_factory_default_is_no_model_and_swap_is_config_only():
    reg = ProviderRegistry()
    reg.register("a", lambda: CallableProvider(lambda r: "A says 1", name="a"))
    reg.register("own", lambda: CallableProvider(lambda r: "own says 1", name="own"))
    assert not build_stack(reg, {}).configured
    with pytest.raises(LLMNotConfigured):
        build_stack(reg, {}).provider.generate(REQ)
    s = build_stack(reg, {"LLM_PROVIDERS": "a", "LLM_SHADOW": "own"})
    assert s.provider.generate(REQ).text == "A says 1" and s.shadow_log.stats()["samples"] == 1
    swapped = build_stack(reg, {"LLM_PROVIDERS": "own"})            # third party removed, nothing else changes
    assert swapped.provider.generate(REQ).text == "own says 1"
    with pytest.raises(ValueError):
        build_stack(reg, {"LLM_PROVIDERS": "nope"})


def test_every_provider_satisfies_the_abc():
    for p in (NullProvider(), ScriptedProvider([]), CallableProvider(lambda r: "x")):
        assert isinstance(p, LLMProvider)
    assert LLMResponse("t", "p", "m").finish_reason == "stop"
