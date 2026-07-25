"""
Comprehensive agent test script — verifies all AgentHive agents produce
real Gemini/LLM-powered responses (not pre-formed fallback outputs).
"""
import httpx
import json
import time
import sys

BASE = "http://localhost:8000"
TIMEOUT = 120  # seconds per request (LLM can be slow)

AGENTS_TESTS = [
    {
        "name": "Support Agent",
        "key": "support",
        "message": "What are your bakery opening hours and do you offer delivery?",
        "expect_keywords": ["hour", "delivery", "bakery", "open"],
    },
    {
        "name": "Finance Agent",
        "key": "finance",
        "message": "Log an expense of 350 rupees for flour and sugar ingredients bought today",
        "expect_keywords": ["expense", "350", "ingredient", "flour", "log"],
    },
    {
        "name": "Content Agent",
        "key": "content",
        "message": "Draft a creative Instagram post about our fresh croissants this weekend",
        "expect_keywords": ["croissant", "bakery", "fresh", "weekend"],
    },
    {
        "name": "Scheduler Agent",
        "key": "scheduler",
        "message": "Remind me to check the oven temperature at 6am tomorrow morning",
        "expect_keywords": ["reminder", "oven", "6", "tomorrow", "schedule"],
    },
    {
        "name": "Analytics Agent",
        "key": "analytics",
        "message": "Give me an analytics overview of the bakery's performance this month",
        "expect_keywords": ["expense", "draft", "reminder", "support", "bakery"],
    },
    {
        "name": "Manager Auto-Route (Finance)",
        "key": None,  # No target — Manager should auto-route
        "message": "How much did we spend this month? Show me the expense summary",
        "expect_keywords": ["expense", "spend", "total", "finance"],
    },
    {
        "name": "Manager Auto-Route (Support)",
        "key": None,
        "message": "What time do you open on Sundays?",
        "expect_keywords": ["sunday", "hour", "open", "bakery"],
    },
]


def is_preformed_response(text: str) -> bool:
    """Detect if response is a pre-formed fallback (not from LLM)."""
    FALLBACK_PATTERNS = [
        "I've received and processed your request for Sunrise Bakery:",
        "All systems are active and ready to assist you!",
        "Note: Logged via Finance Agent fallback engine",
        "via Finance Agent fallback engine",
        "Logged via",
        "fallback engine",
    ]
    for pattern in FALLBACK_PATTERNS:
        if pattern.lower() in text.lower():
            return True
    return False


def check_keywords(text: str, keywords: list) -> dict:
    """Check how many expected keywords appear in the response."""
    text_lower = text.lower()
    found = [kw for kw in keywords if kw.lower() in text_lower]
    missing = [kw for kw in keywords if kw.lower() not in text_lower]
    return {"found": found, "missing": missing}


def run_tests():
    print("\n" + "=" * 70)
    print("  AGENTHIVE — FULL AGENT TEST SUITE")
    print("  Testing real Gemini LLM calls via OpenRouter")
    print("=" * 70)

    # Health check
    print("\n[0] Health Check")
    try:
        r = httpx.get(f"{BASE}/health", timeout=10)
        if r.status_code == 200:
            print(f"    ✅ Backend is UP — {r.json()}")
        else:
            print(f"    ❌ Health check failed: {r.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"    ❌ Backend unreachable: {e}")
        sys.exit(1)

    results = []
    passed = 0
    failed = 0

    for i, test in enumerate(AGENTS_TESTS, start=1):
        print(f"\n[{i}] Testing: {test['name']}")
        print(f"     Query: {test['message'][:80]}")
        print(f"     Target: {test['key'] or 'auto (Manager routes)'}")

        payload = {
            "message": test["message"],
            "user_id": 1,
        }
        if test["key"]:
            payload["target_agent"] = test["key"]

        start = time.time()
        try:
            r = httpx.post(f"{BASE}/api/chat", json=payload, timeout=TIMEOUT)
            elapsed = time.time() - start
            data = r.json()

            response_text = data.get("response", "")
            agent_handled = data.get("agent_name", "unknown")
            orchestrator = data.get("orchestrator", "")

            print(f"     HTTP: {r.status_code} | Agent: {agent_handled} | Time: {elapsed:.1f}s")
            print(f"     Orchestrator: {orchestrator}")

            # Check for pre-formed fallback
            is_fallback = is_preformed_response(response_text)

            # Check for expected keywords
            kw_result = check_keywords(response_text, test["expect_keywords"])

            # Determine pass/fail
            test_passed = (
                r.status_code == 200
                and not is_fallback
                and len(response_text) > 50
                and len(kw_result["found"]) >= max(1, len(test["expect_keywords"]) // 2)
            )

            if test_passed:
                passed += 1
                status = "✅ PASS"
            else:
                failed += 1
                status = "❌ FAIL"

            print(f"     Result: {status}")
            print(f"     Fallback Detected: {'YES ⚠️' if is_fallback else 'No'}")
            print(f"     Keywords Found: {kw_result['found']}")
            if kw_result['missing']:
                print(f"     Keywords Missing: {kw_result['missing']}")
            print(f"     Response Preview:\n       {response_text[:300].replace(chr(10), chr(10) + '       ')}")

            results.append({
                "test": test["name"],
                "passed": test_passed,
                "is_fallback": is_fallback,
                "response_length": len(response_text),
                "keywords_found": kw_result["found"],
                "elapsed": round(elapsed, 1),
            })

        except httpx.TimeoutException:
            failed += 1
            elapsed = time.time() - start
            print(f"     ❌ TIMEOUT after {elapsed:.0f}s")
            results.append({"test": test["name"], "passed": False, "error": "timeout"})
        except Exception as e:
            failed += 1
            print(f"     ❌ ERROR: {e}")
            results.append({"test": test["name"], "passed": False, "error": str(e)})

    # Summary
    print("\n" + "=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    print(f"  Tests Run:    {len(AGENTS_TESTS)}")
    print(f"  Passed:       {passed} ✅")
    print(f"  Failed:       {failed} ❌")
    print(f"  Pass Rate:    {(passed / len(AGENTS_TESTS) * 100):.0f}%")

    fallbacks = [r for r in results if r.get("is_fallback")]
    if fallbacks:
        print(f"\n  ⚠️  Agents returning fallback (not real LLM) responses:")
        for r in fallbacks:
            print(f"     - {r['test']}")
    else:
        print("\n  ✅ All agents are making REAL LLM calls!")

    print("=" * 70)
    return passed, failed


if __name__ == "__main__":
    passed, failed = run_tests()
    sys.exit(0 if failed == 0 else 1)
