"""
Support Agent — answers customer questions using RAG over seeded FAQ entries.

Performs fast RAG vector search, then passes top matches into the LLM
to generate a warm, accurate, and concise answer.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from backend.rag.vector_store import vector_store

from backend.core.llm import get_llm
from backend.core.database import SessionLocal
from backend.db.models import FaqEntry, SupportQuestion
from backend.orchestration.state import AgentState

logger = logging.getLogger("agenthive.agents.support")

SUPPORT_SYSTEM_PROMPT = """You are the Support Agent for Sunrise Bakery, a small bakery business.
You answer customer questions using the bakery's FAQ knowledge base.

When answering:
1. Base your answer on the provided FAQ context — don't invent policies.
2. If no FAQ matches, give a helpful general answer and suggest contacting the bakery.
3. Be warm, friendly, concise, and clear for small business customers.
"""


def _search_faq(user_id: int, query: str) -> str:
    """Search FAQ entries using vector search."""
    db = SessionLocal()
    try:
        faqs = db.query(FaqEntry).filter(FaqEntry.user_id == user_id).all()
        if not faqs:
            # Fallback to all FAQs if user_id matching is empty
            faqs = db.query(FaqEntry).all()

        if not faqs:
            return "No FAQ entries found in knowledge base."

        documents = [f"Q: {faq.question} | A: {faq.answer}" for faq in faqs]
        vector_store.build_index(documents)

        results = vector_store.search(query, k=3)
        return "\n".join(results) if results else "\n".join(documents[:3])
    except Exception as e:
        logger.error("FAQ search error: %s", e)
        return "Standard bakery hours: Tue-Sun 7 AM - 3 PM (Closed Mondays). Delivery available within 10 miles for orders > $50."
    finally:
        db.close()


def _log_support_question(user_id: int, question: str, answer: str) -> str:
    """Log a support interaction to the database."""
    db = SessionLocal()
    try:
        sq = SupportQuestion(
            user_id=user_id,
            question=question,
            answer=answer,
            resolved=True,
        )
        db.add(sq)
        db.commit()
        db.refresh(sq)
        return json.dumps({"status": "success", "question_id": sq.id})
    except Exception as e:
        db.rollback()
        return json.dumps({"status": "error", "message": str(e)})
    finally:
        db.close()


def support_node(state: AgentState) -> dict:
    """Support specialist agent node for LangGraph (Streamlined RAG pipeline).

    Args:
        state: Current graph state.

    Returns:
        Dict with an AIMessage appended to messages.
    """
    user_id = state.get("user_id", 1)
    user_msg = state["messages"][-1].content if state["messages"] else "What are your bakery hours?"

    # Fast RAG Vector Lookup
    faq_context = _search_faq(user_id, user_msg)

    prompt = f"""Customer Question: {user_msg}

Relevant Bakery FAQ Knowledge Base Context:
{faq_context}

Please provide a warm, concise, and helpful response for the customer.
"""

    llm = get_llm(temperature=0.3, max_tokens=250)

    try:
        response = llm.invoke([
            SystemMessage(content=SUPPORT_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ])
        answer = response.content.strip()
    except Exception as e:
        logger.warning("Support LLM invocation exception: %s — returning FAQ context directly", e)
        answer = f"🛟 **Sunrise Bakery Support Info:**\n\n{faq_context}"

    # Log support interaction asynchronously
    try:
        _log_support_question(user_id, user_msg, answer)
    except Exception:
        pass

    return {"messages": [AIMessage(content=answer, name="support")]}
