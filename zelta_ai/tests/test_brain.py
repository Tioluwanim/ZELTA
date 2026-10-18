# test_brain.py
# Run: python test_brain.py
# Tests every endpoint of the ZELTA AI Brain

import asyncio
import os
import httpx
import json
import time

# ── CONFIG ────────────────────────────────────────────────────────────────────
BRAIN_URL    = os.getenv("BRAIN_URL", "http://localhost:8080")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "")

HEADERS = {
    "Content-Type": "application/json",
    "x-api-key":    INTERNAL_KEY,
}

# Tunde's demo wallet data
WALLET = {
    "wallet_data": {
        "free_cash":     26500.0,
        "locked_total":  18500.0,
        "total_balance": 45000.0,
    },
    "transactions": [],
    "user_context": {}
}

# ── HELPERS ───────────────────────────────────────────────────────────────────

def print_section(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def pass_fail(condition: bool, label: str):
    icon = "✅" if condition else "❌"
    print(f"  {icon} {label}")
    return condition

# ── TESTS ─────────────────────────────────────────────────────────────────────

async def test_health(client: httpx.AsyncClient) -> bool:
    print_section("TEST 1 — Health Check GET /")
    try:
        r = await client.get("/")
        data = r.json()

        print(f"  Status code: {r.status_code}")
        print(f"  Response: {json.dumps(data, indent=4)}")

        ok = pass_fail(r.status_code == 200, "Status 200")
        ok = pass_fail("status" in data, "Has status field") and ok
        ok = pass_fail(data.get("status") == "running", "Status is running") and ok
        return ok

    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def test_brain_intelligence(client: httpx.AsyncClient) -> bool:
    print_section("TEST 2 — Brain Intelligence POST /brain/intelligence")
    try:
        r = await client.post(
            "/brain/intelligence",
            json=WALLET,
            headers=HEADERS,
            timeout=30.0
        )
        data = r.json()

        print(f"  Status code: {r.status_code}")
        print(f"  Latency: {data.get('latency_sec', 'N/A')}s")

        ok = pass_fail(r.status_code == 200, "Status 200")
        ok = pass_fail(data.get("success") is True, "success: true") and ok

        brain = data.get("data", {})

        for field in ["stress", "bias", "decision", "confidence", "allocation", "score", "explanation"]:
            ok = pass_fail(field in brain, f"Has {field}") and ok

        stress = brain.get("stress", {})
        bias   = brain.get("bias", {})
        alloc  = brain.get("allocation", {})
        exp    = brain.get("explanation", {})

        print(f"\n  📊 Stress Index:  {stress.get('score')}/100 ({stress.get('level')})")
        print(f"  🧠 Active Bias:   {bias.get('bias')} ({bias.get('confidence')} confidence)")
        print(f"  💰 Verdict:       {alloc.get('verdict')}")
        print(f"  💵 Invest NGN:    ₦{alloc.get('invest_ngn', 0):,.0f}")
        print(f"  💵 Save NGN:      ₦{alloc.get('save_ngn', 0):,.0f}")
        print(f"  💵 Hold NGN:      ₦{alloc.get('hold_ngn', 0):,.0f}")

        nlp = brain.get("nlp", {})
        headlines = nlp.get("scored_headlines", [])

        ok = pass_fail(len(headlines) > 0, f"NLP scraped {len(headlines)} headlines") and ok
        ok = pass_fail(nlp.get("aggregate_sentiment") is not None, "NLP sentiment calculated") and ok

        ok = pass_fail(
            exp.get("summary") != "AI explanation temporarily unavailable.",
            "Gemini Co-Pilot working"
        ) and ok

        return ok

    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def test_stress_signal(client: httpx.AsyncClient) -> bool:
    print_section("TEST 3 — Bayse Stress Signal GET /api/stress")
    try:
        r = await client.get("/api/stress", headers=HEADERS)
        data = r.json()

        print(f"  Status code: {r.status_code}")

        ok = pass_fail(r.status_code == 200, "Status 200")
        ok = pass_fail("score" in data, "Has score") and ok
        ok = pass_fail("status" in data, "Has status") and ok
        ok = pass_fail("source" in data, "Has source") and ok
        ok = pass_fail("Bayse" in data.get("source", ""), "Source references Bayse") and ok

        print(f"\n  📡 Signal: {data.get('score')}/100 ({data.get('status')})")

        return ok

    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def test_bayse_markets(client: httpx.AsyncClient) -> bool:
    print_section("TEST 4 — Bayse Markets")
    try:
        r = await client.get("/api/bayse/markets", headers=HEADERS, timeout=15.0)
        data = r.json()

        ok = pass_fail(r.status_code == 200, "Status 200")

        markets = data.get("markets", {})
        events  = markets if isinstance(markets, list) else markets.get("data", [])

        ok = pass_fail(len(events) > 0, f"{len(events)} markets found") and ok

        for event in events[:3]:
            print(f"   - {event.get('title', 'Unknown')[:60]}")

        return ok

    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def test_unauthorized(client: httpx.AsyncClient) -> bool:
    print_section("TEST 5 — Unauthorized Access")
    try:
        r = await client.post(
            "/brain/intelligence",
            json=WALLET,
            headers={"x-api-key": "wrong_key"},
            timeout=10.0,
        )

        return pass_fail(r.status_code == 401, f"Returns 401 (got {r.status_code})")

    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def test_with_high_stress_wallet(client: httpx.AsyncClient) -> bool:
    print_section("TEST 6 — High Stress Scenario")

    stressed_wallet = {
        "wallet_data": {
            "free_cash": 2000.0,
            "locked_total": 18500.0,
            "total_balance": 20500.0,
        },
        "transactions": [],
        "user_context": {}
    }

    try:
        r = await client.post("/brain/intelligence", json=stressed_wallet, headers=HEADERS)
        data = r.json()

        alloc = data.get("data", {}).get("allocation", {})
        verdict = alloc.get("verdict", "")

        ok = pass_fail(r.status_code == 200, "Status 200")
        ok = pass_fail(verdict in ("HOLD", "SAVE"), f"Protective verdict ({verdict})") and ok

        return ok

    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def test_pipeline_latency(client: httpx.AsyncClient) -> bool:
    print_section("TEST 7 — Latency")

    try:
        start = time.time()

        r = await client.post("/brain/intelligence", json=WALLET, headers=HEADERS)

        total = round(time.time() - start, 2)
        data = r.json()
        brain_latency = data.get("latency_sec", 0)

        print(f"  Total: {total}s | Brain: {brain_latency}s")

        ok = pass_fail(r.status_code == 200, "Status 200")
        ok = pass_fail(total < 30, f"<30s ({total})") and ok
        ok = pass_fail(brain_latency < 25, f"<25s ({brain_latency})") and ok

        return ok

    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


# ── MAIN ──────────────────────────────────────────────────────────────────────

async def main():
    print("\n🚀 ZELTA AI Brain — Full Test Suite")
    print(f"   Testing: {BRAIN_URL}")

    results = {}

    async with httpx.AsyncClient(base_url=BRAIN_URL, timeout=60.0) as client:
        results["Health"]      = await test_health(client)
        results["Brain"]       = await test_brain_intelligence(client)
        results["Stress"]      = await test_stress_signal(client)
        results["Markets"]     = await test_bayse_markets(client)
        results["Security"]    = await test_unauthorized(client)
        results["HighStress"]  = await test_with_high_stress_wallet(client)
        results["Latency"]     = await test_pipeline_latency(client)

    print_section("SUMMARY")

    passed = sum(results.values())
    total = len(results)

    for k, v in results.items():
        print(f"  {'✅' if v else '❌'} {k}")

    print(f"\n  Score: {passed}/{total}")

    if passed == total:
        print("\n🎉 ALL SYSTEMS GO — READY FOR DEMO")
    elif passed >= total * 0.7:
        print("\n⚠️ Minor issues — fix before demo")
    else:
        print("\n❌ Critical failures")

if __name__ == "__main__":
    asyncio.run(main())