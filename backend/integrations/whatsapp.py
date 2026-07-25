"""
WhatsApp gateway — dual-path (Meta Cloud API + Twilio Sandbox).

WhatsApp is a channel/bridge into the existing Manager Agent — it receives
a message, hands the text to the Manager Agent pipeline (exactly like the
dashboard chat does), and sends the response back. It is NOT a 6th thinking
agent — it's a gateway.

Both integration paths are gated behind the WHATSAPP_PROVIDER env flag:
  - "meta"   → Meta WhatsApp Cloud API (production path, requires Business verification)
  - "twilio" → Twilio WhatsApp Sandbox (faster to demo, no verification wait)

To switch: change WHATSAPP_PROVIDER in .env and fill in the corresponding credentials.
"""

from __future__ import annotations

import logging
import re
import urllib.parse
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import get_db
from backend.db.models import Conversation, Message, User
from backend.orchestration.manager import agent_graph
from backend.orchestration.state import AgentState
from backend.integrations.voice import download_whatsapp_media, transcribe_audio
from langchain_core.messages import HumanMessage

logger = logging.getLogger("agenthive.integrations.whatsapp")
router = APIRouter()

WHATSAPP_GRAPH_URL = "https://graph.facebook.com/v21.0"


# ── Text Formatter for WhatsApp ──────────────────────────────

def format_text_for_whatsapp(text: str) -> str:
    """Format markdown text into clean WhatsApp text formatting.

    WhatsApp supports:
      *bold*
      _italic_
      ~strikethrough~
      ```monospace```

    Converts Markdown headers, bullet points, bold tags, etc.
    """
    if not text:
        return ""

    # Replace **bold** with *bold*
    formatted = re.sub(r"\*\*(.*?)\*\*", r"*\1*", text)
    # Replace markdown headers ### Header with *Header*
    formatted = re.sub(r"^#{1,6}\s*(.*)$", r"*\1*", formatted, flags=re.MULTILINE)
    # Remove HTML tags if any
    formatted = re.sub(r"<[^>]+>", "", formatted)
    
    return formatted.strip()


# ── Pydantic schemas ─────────────────────────────────────────

class ChatRequest(BaseModel):
    """Incoming chat message from the frontend widget or WhatsApp.

    Attributes:
        message: The user's message text.
        user_id: Database user ID (defaults to 1 for demo).
        conversation_id: Optional existing conversation to continue.
    """
    message: str
    user_id: int = 1
    conversation_id: int | None = None


class ChatResponse(BaseModel):
    """Response from the agent system.

    Attributes:
        response: The agent's reply text.
        agent_name: Which specialist agent handled the request.
        conversation_id: The conversation this message belongs to.
    """
    response: str
    agent_name: str
    conversation_id: int


# ── Shared chat pipeline (used by both WhatsApp paths) ───────

def _route_through_agents(text: str, user_id: int, db: Session, channel: str = "whatsapp", sender_phone: str = "") -> ChatResponse:
    """Route a message through the Manager Agent pipeline and persist to DB.

    This is the same pipeline the dashboard chat uses — WhatsApp is just
    a different entry/exit point.

    Args:
        text: The user's message text.
        user_id: Database user ID.
        db: Database session.
        channel: Channel identifier ("whatsapp" or "web").
        sender_phone: Optional phone number of WhatsApp sender.

    Returns:
        ChatResponse with the agent's reply.
    """
    # Look up user by phone or fallback to user_id
    user = None
    if sender_phone:
        clean_phone = sender_phone.replace("whatsapp:", "").strip()
        user = db.query(User).filter(User.phone == clean_phone).first()

    if not user:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = db.query(User).first()
            if not user:
                return ChatResponse(
                    response="System not configured. Please set up the database first.",
                    agent_name="manager",
                    conversation_id=0,
                )

    # Find active conversation or create a new one
    conversation = (
        db.query(Conversation)
        .filter(Conversation.user_id == user.id, Conversation.channel == channel)
        .order_by(Conversation.created_at.desc())
        .first()
    )

    if not conversation:
        conversation = Conversation(user_id=user.id, channel=channel)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Save user message to DB
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=text,
        agent_name="user",
    )
    db.add(user_msg)
    db.commit()

    # Invoke the Manager Agent graph
    try:
        initial_state: AgentState = {
            "messages": [HumanMessage(content=text)],
            "current_agent": "",
            "user_id": user.id,
            "metadata": {"channel": channel, "sender_phone": sender_phone},
        }
        result = agent_graph.invoke(initial_state)

        ai_messages = [m for m in result["messages"] if hasattr(m, "name") or (hasattr(m, "type") and m.type == "ai")]
        if ai_messages:
            last_ai = ai_messages[-1]
            response_text = last_ai.content
            agent_name = getattr(last_ai, "name", None) or result.get("current_agent", "manager")
        else:
            response_text = "I'm sorry, I couldn't process that request. Could you try rephrasing?"
            agent_name = "manager"
    except Exception as e:
        logger.error("Agent graph failed: %s", e, exc_info=True)
        response_text = "I apologize, but I encountered an error processing your request. Please try again."
        agent_name = "manager"

    # Save assistant response to DB
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=response_text,
        agent_name=agent_name,
    )
    db.add(assistant_msg)
    db.commit()

    return ChatResponse(
        response=response_text,
        agent_name=agent_name,
        conversation_id=conversation.id,
    )


# ══════════════════════════════════════════════════════════════
#  META WHATSAPP CLOUD API PATH
# ══════════════════════════════════════════════════════════════

def send_whatsapp_message_meta(to: str, text: str) -> bool:
    """Send a text message via Meta's WhatsApp Cloud API.

    Args:
        to: Recipient's phone number in international format (e.g., "919876543210").
        text: The reply text to send.

    Returns:
        True if Meta accepted the message, False otherwise.
    """
    if not settings.WHATSAPP_API_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        logger.warning("WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set")
        return False

    formatted_text = format_text_for_whatsapp(text)
    url = f"{WHATSAPP_GRAPH_URL}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": formatted_text},
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers=headers, json=payload)
        if resp.status_code == 200:
            logger.info("Meta WhatsApp message sent to %s", to)
            return True
        logger.error("Meta WhatsApp send failed (%s): %s", resp.status_code, resp.text)
        return False
    except httpx.HTTPError as e:
        logger.error("Meta WhatsApp send request error: %s", e)
        return False


# ══════════════════════════════════════════════════════════════
#  TWILIO WHATSAPP SANDBOX PATH
# ══════════════════════════════════════════════════════════════

def send_whatsapp_message_twilio(to: str, text: str) -> bool:
    """Send a text message via Twilio's WhatsApp API.

    Args:
        to: Recipient's phone number in WhatsApp format (e.g., "whatsapp:+17017911866").
        text: The reply text to send.

    Returns:
        True if Twilio accepted the message, False otherwise.
    """
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.warning("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set")
        return False

    try:
        from twilio.rest import Client as TwilioClient
    except ImportError:
        logger.error("twilio package not installed — pip install twilio")
        return False

    formatted_text = format_text_for_whatsapp(text)

    try:
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        # Ensure 'to' has the whatsapp: prefix
        if not to.startswith("whatsapp:"):
            to = f"whatsapp:{to}"

        message = client.messages.create(
            body=formatted_text,
            from_=settings.TWILIO_WHATSAPP_NUMBER,
            to=to,
        )
        logger.info("Twilio WhatsApp message sent to %s (sid=%s)", to, message.sid)
        return True
    except Exception as e:
        logger.error("Twilio WhatsApp send failed: %s", e)
        return False


# ── Unified reply dispatcher ─────────────────────────────────

def send_reply(to: str, text: str) -> bool:
    """Send a WhatsApp reply using the configured provider.

    Checks WHATSAPP_PROVIDER to decide which path to use.

    Args:
        to: Recipient's phone number.
        text: Reply text.

    Returns:
        True if the message was sent.
    """
    provider = settings.WHATSAPP_PROVIDER.lower()
    if provider == "twilio":
        return send_whatsapp_message_twilio(to, text)
    else:
        return send_whatsapp_message_meta(to, text)


# ══════════════════════════════════════════════════════════════
#  WEBHOOK ENDPOINTS
# ══════════════════════════════════════════════════════════════

# ── Meta Cloud API webhook ───────────────────────────────────

@router.get("/whatsapp")
def whatsapp_verify(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
) -> str | dict:
    """WhatsApp webhook verification (GET) — Meta Cloud API."""
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified successfully")
        return hub_challenge or ""
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp")
async def whatsapp_incoming_meta(request: Request, db: Session = Depends(get_db)) -> dict:
    """Handle incoming WhatsApp messages (POST) — Meta Cloud API."""
    body = await request.json()
    logger.info("Meta WhatsApp webhook received")

    try:
        entry = body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])

        if not messages:
            return {"status": "no_message"}

        wa_message = messages[0]
        sender_phone = wa_message.get("from", "unknown")
        msg_type = wa_message.get("type", "text")

        if msg_type == "audio":
            media_id = wa_message.get("audio", {}).get("id")
            audio_bytes = download_whatsapp_media(media_id) if media_id else None
            if not audio_bytes:
                logger.error("Could not download voice note media_id=%s", media_id)
                return {"status": "media_download_failed"}

            text = transcribe_audio(audio_bytes)
            if not text:
                logger.error("Could not transcribe voice note from %s", sender_phone)
                return {"status": "transcription_failed"}
            logger.info("Voice note from %s transcribed: %s", sender_phone, text[:100])
        else:
            text = wa_message.get("text", {}).get("body", "")

        if not text:
            return {"status": "no_text"}

        response = _route_through_agents(text, user_id=1, db=db, channel="whatsapp", sender_phone=sender_phone)
        sent = send_whatsapp_message_meta(to=sender_phone, text=response.response)

        return {"status": "ok", "agent": response.agent_name, "sent": sent}

    except Exception as e:
        logger.error("Meta WhatsApp webhook error: %s", e, exc_info=True)
        return {"status": "error", "message": str(e)}


# ── Twilio WhatsApp Sandbox webhook ──────────────────────────

@router.post("/whatsapp/twilio")
async def whatsapp_incoming_twilio(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Handle incoming WhatsApp messages (POST) — Twilio Sandbox."""
    form = await request.form()
    sender = form.get("From", "unknown")  # e.g., "whatsapp:+15550101"
    body = form.get("Body", "").strip()
    num_media = int(form.get("NumMedia", "0"))

    logger.info("Twilio WhatsApp from %s: '%s' (%d media)", sender, body[:100], num_media)

    text = body

    if num_media > 0 and not body:
        media_url = form.get("MediaUrl0", "")
        media_type = form.get("MediaContentType0", "")
        if media_type.startswith("audio/"):
            try:
                with httpx.Client(
                    timeout=15.0,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                ) as client:
                    resp = client.get(media_url)
                    resp.raise_for_status()
                    audio_bytes = resp.content

                text = transcribe_audio(audio_bytes)
                if not text:
                    logger.error("Failed to transcribe Twilio voice note")
                    text = ""
            except Exception as e:
                logger.error("Failed to download/transcribe Twilio media: %s", e)

    if not text:
        return {"status": "no_text"}

    response = _route_through_agents(text, user_id=1, db=db, channel="whatsapp", sender_phone=sender)
    sent = send_whatsapp_message_twilio(to=sender, text=response.response)

    return {"status": "ok", "agent": response.agent_name, "sent": sent}


# ── WhatsApp Connection Status & Config (for Frontend) ──────

@router.get("/whatsapp/status")
def whatsapp_status() -> dict:
    """Check WhatsApp gateway connection status & return direct chat links for visitors."""
    provider = settings.WHATSAPP_PROVIDER.lower()

    if provider == "twilio":
        connected = bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN)
        number_raw = settings.TWILIO_WHATSAPP_NUMBER.replace("whatsapp:", "").replace("+", "").strip()
        display_number = settings.TWILIO_WHATSAPP_NUMBER.replace("whatsapp:", "").strip()
        
        # Build direct wa.me click-to-chat URL
        wa_url = f"https://wa.me/{number_raw}" if number_raw else None
        
        return {
            "provider": "twilio",
            "connected": connected,
            "display_number": display_number,
            "sandbox_number": settings.TWILIO_WHATSAPP_NUMBER if connected else None,
            "click_to_chat_url": wa_url,
            "instructions": f"Send any message to {display_number} on WhatsApp to chat with your AI Team!",
        }
    else:
        connected = bool(settings.WHATSAPP_API_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID)
        return {
            "provider": "meta",
            "connected": connected,
            "phone_number_id": settings.WHATSAPP_PHONE_NUMBER_ID if connected else None,
            "click_to_chat_url": None,
            "instructions": "Meta WhatsApp Cloud API active.",
        }
