"""
Manager Agent — LangGraph supervisor graph with instant intent routing.

Fast heuristic intent classification routes requests to specialist agents in < 1ms,
falling back to LLM classification if prompt is complex.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Literal

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

from backend.agents.analytics import analytics_node
from backend.agents.content import content_node
from backend.agents.finance import finance_node
from backend.agents.scheduler import scheduler_node
from backend.agents.support import support_node
from backend.core.config import settings
from backend.core.llm import get_llm
from backend.orchestration.state import AgentState

logger = logging.getLogger("agenthive.manager")


def _fast_classify(text: str) -> str | None:
    """Instant heuristic classification (< 1ms execution time)."""
    lower = text.lower().strip()

    # Casual greetings and small talk → support (which handles it conversationally)
    casual_starts = [
        "hi", "hello", "hey", "hie", "yo", "sup", "what's up", "whats up",
        "how are you", "how's it going", "good morning", "good evening",
        "good afternoon", "thanks", "thank you", "bye", "goodbye",
    ]
    if any(lower.startswith(p) or lower == p for p in casual_starts):
        return "support"

    # Explicit delegation or direct keywords
    if any(k in lower for k in ["customer support", "support agent", "help user", "queries", "faq", "opening hour", "hours", "delivery", "menu", "allergen", "open", "located", "location", "address", "parking", "vegan", "gluten"]):
        return "support"
    if any(k in lower for k in ["finance agent", "accounting agent", "expense", "invoice", "cost", "spent", "dollar", "$", "budget", "log expense", "payment", "revenue", "profit"]):
        return "finance"
    if any(k in lower for k in ["content agent", "marketing agent", "draft", "post", "social", "email", "newsletter", "proposal", "instagram", "facebook", "write", "compose", "blog"]):
        return "content"
    if any(k in lower for k in ["scheduler agent", "calendar agent", "remind", "reminder", "schedule", "meeting", "calendar", "tomorrow", "monday", "appointment", "book"]):
        return "scheduler"
    if any(k in lower for k in ["analytics agent", "reporting agent", "analytic", "summary", "report", "insight", "overview", "stat", "performance", "metrics", "dashboard", "how's the business", "how is the business"]):
        return "analytics"

    return None


def classify_intent(state: AgentState) -> AgentState:
    """Manager supervisor node: classifies intent and picks a specialist agent."""
    user_text = state["messages"][-1].content if state["messages"] else ""

    # Check fast heuristic classifier first (< 1ms)
    fast_agent = _fast_classify(user_text)
    if fast_agent:
        logger.info("Manager fast-routed to '%s'", fast_agent)
        return {"current_agent": fast_agent}

    # Fallback to LLM intent classification
    try:
        llm = get_llm(temperature=0.0, max_tokens=100)
        messages = [
            SystemMessage(content=(
                "You are the HIVE Manager — you route user messages to the right specialist agent. "
                "Available agents: finance, content, scheduler, support, analytics. "
                "If the message is casual chat/greeting, route to 'support'. "
                "Respond ONLY with JSON: {\"agent\": \"name\"}"
            )),
            HumanMessage(content=user_text),
        ]
        response = llm.invoke(messages)
        raw = response.content if hasattr(response, "content") else str(response)

        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            raw = json_match.group(0)

        parsed = json.loads(raw)
        agent_name = parsed.get("agent", "").lower().strip()
        valid_agents = {"finance", "content", "scheduler", "support", "analytics"}
        if agent_name in valid_agents:
            return {"current_agent": agent_name}
    except Exception as e:
        logger.warning("Manager LLM classification exception: %s", e)

    return {"current_agent": "support"}


def route_to_agent(state: AgentState) -> str:
    """Conditional edge routing to the specialist agent node."""
    return state.get("current_agent", "support")


# ── Build the LangGraph ──────────────────────────────────────

def build_graph() -> StateGraph:
    """Construct the Manager → Specialist LangGraph supervisor graph."""
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("classify", classify_intent)
    graph.add_node("finance", finance_node)
    graph.add_node("content", content_node)
    graph.add_node("scheduler", scheduler_node)
    graph.add_node("support", support_node)
    graph.add_node("analytics", analytics_node)

    # Entry point
    graph.set_entry_point("classify")

    # Conditional routing from classify → specialist
    graph.add_conditional_edges(
        "classify",
        route_to_agent,
        {
            "finance": "finance",
            "content": "content",
            "scheduler": "scheduler",
            "support": "support",
            "analytics": "analytics",
        },
    )

    # Each specialist goes to END
    for agent_name in ["finance", "content", "scheduler", "support", "analytics"]:
        graph.add_edge(agent_name, END)

    return graph.compile()


# Module-level compiled graph instance
agent_graph = build_graph()
