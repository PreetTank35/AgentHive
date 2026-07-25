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

SUPPORT_SYSTEM_PROMPT = """You are HIVE — the intelligent AI assistant powering AgentHive for Sunrise Bakery.

Think of yourself like JARVIS from Iron Man — sharp, witty, helpful, and always one step ahead.
You handle customer support queries with confidence, warmth, and personality.

## Your Personality:
- Conversational and natural — talk like a smart friend, not a robot
- If someone says "hi" or chats casually, respond casually and warmly
- When answering business questions, be precise but never dump raw data
- Use the FAQ knowledge base as YOUR knowledge — weave it naturally into your answer
- Never show raw "Q: ... | A: ..." format to the user — always rephrase in your own words
- Add a touch of personality — light humor is welcome
- Be concise — don't over-explain simple things

## Rules:
1. Use the FAQ context provided to answer accurately — don't invent policies
2. If no FAQ matches, give a helpful general answer and offer to connect them with the bakery team
3. NEVER dump raw database entries or Q&A pairs — always synthesize a natural response
4. If the user is just chatting (greetings, small talk), respond warmly without looking up FAQs
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


def _is_casual_chat(text: str) -> bool:
    """Detect if the message is casual small talk vs. a real question."""
    lower = text.lower().strip()
    casual_patterns = [
        "hi", "hello", "hey", "hie", "yo", "sup", "what's up", "whats up",
        "how are you", "how's it going", "good morning", "good evening",
        "good afternoon", "thanks", "thank you", "bye", "goodbye", "see you",
        "nice", "cool", "awesome", "great", "okay", "ok",
    ]
    return any(lower.startswith(p) or lower == p for p in casual_patterns)


def support_node(state: AgentState) -> dict:
    """Support specialist agent node for LangGraph (Streamlined RAG pipeline).

    Args:
        state: Current graph state.

    Returns:
        Dict with an AIMessage appended to messages.
    """
    user_id = state.get("user_id", 1)
    user_msg = state["messages"][-1].content if state["messages"] else "What are your bakery hours?"

    # For casual chat, skip FAQ lookup entirely
    if _is_casual_chat(user_msg):
        faq_context = "(No FAQ lookup needed — this is casual conversation)"
    else:
        # Fast RAG Vector Lookup
        faq_context = _search_faq(user_id, user_msg)

    prompt = f"""User says: "{user_msg}"

Background knowledge from FAQ database (use this as YOUR knowledge — DO NOT show it raw):
{faq_context}

Respond naturally and conversationally. If the user is just saying hi, chat back warmly.
If they're asking a question, answer it using the knowledge above in your own words — never dump raw Q&A pairs.
"""

    llm = get_llm(temperature=0.5, max_tokens=300)

    try:
        response = llm.invoke([
            SystemMessage(content=SUPPORT_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ])
        answer = response.content.strip()
    except Exception as e:
        logger.warning("Support LLM invocation exception: %s — generating fallback response", e)
        # Generate a natural fallback instead of dumping raw data
        if _is_casual_chat(user_msg):
            answer = "Hey there! 👋 Welcome to Sunrise Bakery! How can I help you today?"
        else:
            answer = (
                "Hey! Thanks for reaching out to Sunrise Bakery. "
                "We're open Tuesday through Sunday, 7 AM to 3 PM (closed Mondays). "
                "We're at 142 Main Street, Downtown — free parking out back! "
                "We also deliver within 10 miles for orders over $50. "
                "What else can I help you with?"
            )

    # Log support interaction asynchronously
    try:
        _log_support_question(user_id, user_msg, answer)
    except Exception:
        pass

    return {"messages": [AIMessage(content=answer, name="support")]}
