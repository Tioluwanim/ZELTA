import asyncio
from brain.copilot.gemini import ZeltaCopilot  # noqa: E402
from llm import CallableProvider, LLMUnavailable, ScriptedProvider  # noqa: E402


def run(c):
    return asyncio.run(c)


def test_no_config_means_no_model_and_safe_fallbacks(monkeypatch):
    for k in ("GOOGLE_API_KEY", "GEMINI_API_KEY", "GOOGLE_CLOUD_PROJECT", "GOOGLE_GENAI_USE_VERTEXAI"):
        monkeypatch.delenv(k, raising=False)
    c = ZeltaCopilot()                                   # used to raise ValueError without a Gemini key
    assert run(c.answer_question("q", {})) == "Unable to answer right now. Check your dashboard."
    assert run(c.run({}))["confidence_note"] == "AI explanation temporarily unavailable."
    run(c.aclose())


def test_any_provider_replaces_gemini():
    c = ZeltaCopilot(provider=ScriptedProvider(["Keep ₦2,000 for food today."]))
    assert run(c.answer_question("what now?", {})) == "Keep ₦2,000 for food today."
    j = ZeltaCopilot(provider=ScriptedProvider(['{"summary": "ok", "action": "wait"}']))
    out = run(j.run({}))
    assert out["summary"] == "ok" and out["action"] == "wait"


def test_provider_failure_and_bad_json_fall_back():
    assert "Unable" in run(ZeltaCopilot(provider=ScriptedProvider([LLMUnavailable()])).answer_question("q", {}))
    bad = ZeltaCopilot(provider=ScriptedProvider(["not json"]))
    assert run(bad.run({}))["confidence_note"] == "AI explanation temporarily unavailable."
    boom = ZeltaCopilot(provider=CallableProvider(lambda r: 1 / 0))
    assert "Unable" in run(boom.answer_question("q", {}))
