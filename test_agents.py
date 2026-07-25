"""Comprehensive test script for all AgentHive specialist agents."""
import httpx
import json

BASE = "http://localhost:8000"

def test_agents():
    # Check health
    try:
        r = httpx.get(f"{BASE}/health", timeout=10)
        print(f"Health check: {r.json()}")
    except Exception as e:
        print(f"Health check FAILED: {e}")
        return

    agents = [
        ("support", "What are your bakery opening hours?"),
        ("finance", "Log an expense of 500 rupees for flour ingredients"),
        ("content", "Draft an Instagram post about our fresh sourdough bread"),
        ("scheduler", "Remind me to order milk tomorrow at 9am"),
        ("analytics", "Give me a business performance summary"),
    ]

    for agent, msg in agents:
        print(f"\n{'='*60}")
        print(f"Testing: {agent.upper()} AGENT")
        print(f"Query: {msg}")
        print(f"{'='*60}")
        payload = {"message": msg, "user_id": 1, "target_agent": agent}
        try:
            r = httpx.post(f"{BASE}/api/chat", json=payload, timeout=90)
            data = r.json()
            print(f"HTTP Status: {r.status_code}")
            print(f"Agent Handled By: {data.get('agent_name', 'unknown')}")
            response_text = data.get("response", "")
            print(f"Response:\n{response_text[:400]}")
            if len(response_text) > 400:
                print(f"... (truncated, total {len(response_text)} chars)")
        except Exception as e:
            print(f"ERROR: {e}")

    # Also test manager auto-routing
    print(f"\n{'='*60}")
    print("Testing: MANAGER AUTO-ROUTING (no target agent)")
    print("Query: How much did I spend this month?")
    print(f"{'='*60}")
    payload = {"message": "How much did I spend this month?", "user_id": 1}
    try:
        r = httpx.post(f"{BASE}/api/chat", json=payload, timeout=90)
        data = r.json()
        print(f"HTTP Status: {r.status_code}")
        print(f"Routed to: {data.get('agent_name', 'unknown')}")
        print(f"Orchestrator: {data.get('orchestrator', '')}")
        response_text = data.get("response", "")
        print(f"Response:\n{response_text[:400]}")
    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == "__main__":
    test_agents()
