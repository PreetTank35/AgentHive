"""
Content Agent — drafts social posts, emails, proposals.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage, HumanMessage
from backend.core.llm import get_llm
from backend.core.database import SessionLocal
from backend.db.models import Draft
from backend.orchestration.state import AgentState

logger = logging.getLogger("agenthive.agents.content")

CONTENT_SYSTEM_PROMPT = """You are the Content Agent for Sunrise Bakery, a small bakery business.
You help the owner create compelling content: social media posts, marketing emails, newsletters, and business proposals.

Style guidelines:
- Friendly, warm, approachable tone that matches a local artisan bakery
- Use emojis effectively for social posts
- Emails should be professional but personable
- Produce REAL, ready-to-use content (no placeholders like [Insert Date])
"""


def _create_draft(user_id: int, content_type: str, subject: str, body: str) -> str:
    """Save a new content draft to the database."""
    db = SessionLocal()
    try:
        draft = Draft(
            user_id=user_id,
            content_type=content_type,
            subject=subject,
            body=body,
            status="draft",
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)
        return json.dumps({"status": "success", "draft_id": draft.id, "content_type": content_type, "subject": subject})
    except Exception as e:
        db.rollback()
        return json.dumps({"status": "error", "message": str(e)})
    finally:
        db.close()


def _fallback_content_handler(state: AgentState, error_msg: str = "") -> dict:
    """Deterministic rule-based fallback handler when LLM API fails."""
    user_id = state.get("user_id", 1)
    user_text = state["messages"][-1].content if state.get("messages") else ""
    lower = user_text.lower()

    logger.warning("Content LLM call failed (%s) — running deterministic rule-based fallback", error_msg)

    content_type = "post"
    if "email" in lower:
        content_type = "email"
    elif "proposal" in lower:
        content_type = "proposal"

    topic = user_text.replace("Draft", "").replace("draft", "").strip() or "Weekend Sourdough Special"
    subject = f"Sunrise Bakery — {topic.title()[:40]}"

    if content_type == "post":
        body = (
            f"✨ Fresh from the Sunrise Bakery oven! ✨\n\n"
            f"We are thrilled to bring you our latest creation: {topic}! 🥐🎨\n"
            f"Baked daily using non-GMO organic flour. Stop by today before we sell out!\n\n"
            f"#SunriseBakery #FreshlyBaked #ArtisanBakery #ShopLocal"
        )
    elif content_type == "email":
        body = (
            f"Dear Bakery Friends,\n\n"
            f"We have exciting news regarding {topic}! We're baking fresh batches daily. "
            f"Visit our storefront or order online to reserve yours!\n\n"
            f"Warmly,\nThe Sunrise Bakery Team"
        )
    else:
        body = (
            f"Proposal: {topic}\n\n"
            f"Sunrise Bakery is pleased to offer catering and special baked goods orders tailored to your event."
        )

    _create_draft(user_id=user_id, content_type=content_type, subject=subject, body=body)

    formatted_msg = (
        f"📝 **Content Draft Created!**\n\n"
        f"**Subject:** {subject}\n\n"
        f"**Content:**\n{body}"
    )
    return {"messages": [AIMessage(content=formatted_msg, name="content")]}


def content_node(state: AgentState) -> dict:
    """Content specialist agent node for LangGraph."""
    user_id = state.get("user_id", 1)
    user_msg = state["messages"][-1].content if state.get("messages") else "Draft a post about sourdough bread"

    prompt = f"""Task: Create content based on this request: "{user_msg}"

Generate ready-to-use content (social post, email, or proposal).
Format your response clearly with a Subject and Body.
"""

    try:
        llm = get_llm(temperature=0.7, max_tokens=350)
        response = llm.invoke([
            SystemMessage(content=CONTENT_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ])
        content_text = response.content.strip()

        # Save to DB
        content_type = "email" if "email" in user_msg.lower() else "post"
        subject = f"Sunrise Bakery Content ({content_type.title()})"
        _create_draft(user_id, content_type, subject, content_text)

        return {"messages": [AIMessage(content=content_text, name="content")]}
    except Exception as e:
        return _fallback_content_handler(state, str(e))
