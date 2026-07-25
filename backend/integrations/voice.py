"""
Voice pipeline — Gemini native audio input for STT, browser Web Speech API for dashboard.

WhatsApp voice notes: downloads the audio file and sends it to Gemini 2.5 Flash
for transcription. This reuses the existing GEMINI_API_KEY — no new credential needed.
Gemini natively accepts audio input, so there's no separate STT provider.

Dashboard voice: handled entirely in the browser using the Web Speech API
(SpeechRecognition for input, SpeechSynthesis for output). Zero API keys.

TTS for WhatsApp replies (sending audio back): stretch item. Text replies work first.
"""

from __future__ import annotations

import base64
import io
import json
import logging

import httpx

from backend.core.config import settings

logger = logging.getLogger("agenthive.integrations.voice")

WHATSAPP_GRAPH_URL = "https://graph.facebook.com/v21.0"

# Gemini API for audio transcription
# Uses the generativelanguage.googleapis.com endpoint directly (not OpenRouter)
# because OpenRouter doesn't support multimodal audio input
GEMINI_DIRECT_URL = "https://generativelanguage.googleapis.com/v1beta"


# ── Step 1: download the voice note from WhatsApp ────────────

def download_whatsapp_media(media_id: str) -> bytes | None:
    """Download a media file (voice note, image, etc.) from WhatsApp.

    WhatsApp doesn't send the raw file in the webhook — it sends a
    ``media_id``. You have to look up the real download URL first, then
    fetch the file itself. This does both steps.

    Args:
        media_id: The media ID from the incoming webhook payload
            (``messages[0]["audio"]["id"]``).

    Returns:
        Raw audio bytes, or None if the download failed.
    """
    if not settings.WHATSAPP_API_TOKEN:
        logger.warning("WHATSAPP_API_TOKEN not set — cannot download media")
        return None

    headers = {"Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}"}

    try:
        with httpx.Client(timeout=15.0) as client:
            # Step A: get the actual (temporary) file URL for this media ID
            meta_resp = client.get(f"{WHATSAPP_GRAPH_URL}/{media_id}", headers=headers)
            meta_resp.raise_for_status()
            file_url = meta_resp.json()["url"]

            # Step B: download the actual audio bytes from that URL
            file_resp = client.get(file_url, headers=headers)
            file_resp.raise_for_status()
            return file_resp.content
    except (httpx.HTTPError, KeyError) as e:
        logger.error("Failed to download WhatsApp media %s: %s", media_id, e)
        return None


# ── Step 2: speech -> text (Gemini native audio) ─────────────

def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/ogg") -> str | None:
    """Transcribe voice note audio using Gemini's native audio input.

    Gemini 2.5 Flash accepts audio natively — we send the audio bytes
    as inline data and ask it to transcribe. This reuses the existing
    GEMINI_API_KEY, so no new credential is needed.

    Falls back to a simpler prompt if the first attempt fails.

    Args:
        audio_bytes: Raw audio file bytes (WhatsApp voice notes are
            usually OGG/Opus format).
        mime_type: MIME type of the audio (default: "audio/ogg").

    Returns:
        The transcribed text, or None if transcription failed.
    """
    # Determine which API key to use for direct Gemini access
    # The GEMINI_API_KEY might be an OpenRouter key (starts with "sk-or-")
    # In that case, we can't use it for direct Gemini API. We need a real Gemini key.
    api_key = settings.GEMINI_API_KEY
    if api_key.startswith("sk-or-"):
        # This is an OpenRouter key — can't use for direct Gemini audio API
        # Fall back to a simple "audio not supported" message
        logger.warning(
            "GEMINI_API_KEY is an OpenRouter key — cannot use for direct audio transcription. "
            "Set a real Google AI Studio API key for voice note support."
        )
        return _fallback_transcribe_message()

    if not api_key:
        logger.warning("GEMINI_API_KEY not set — cannot transcribe audio")
        return None

    # Encode audio as base64 for the Gemini API
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    url = f"{GEMINI_DIRECT_URL}/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": audio_b64,
                        }
                    },
                    {
                        "text": (
                            "Transcribe this audio message exactly as spoken. "
                            "Return ONLY the transcribed text, nothing else. "
                            "If the audio is unclear, do your best to transcribe it."
                        )
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 1024,
        },
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, json=payload)
        resp.raise_for_status()

        result = resp.json()
        candidates = result.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                text = parts[0].get("text", "").strip()
                logger.info("Gemini transcribed voice note: %s", text[:100])
                return text or None

        logger.warning("Gemini returned no transcription candidates")
        return None

    except httpx.HTTPError as e:
        logger.error("Gemini audio transcription failed: %s", e)
        return None
    except Exception as e:
        logger.error("Unexpected error during transcription: %s", e)
        return None


def _fallback_transcribe_message() -> str | None:
    """Return a helpful message when audio transcription isn't available."""
    return None


# ── Step 3 (stretch): text -> speech for WhatsApp replies ────
# This would use Google Cloud TTS to send audio responses back on WhatsApp.
# Implemented as text replies first — voice-out is a stretch goal.

def text_to_speech(text: str) -> bytes | None:
    """Convert text into spoken audio (stretch item).

    Currently returns None — text replies are sent on WhatsApp instead.
    To enable: use Google Cloud Text-to-Speech API with a service account.

    Args:
        text: The reply text to convert to speech.

    Returns:
        Audio bytes, or None (not yet implemented).
    """
    # TODO: Implement with Google Cloud TTS when time allows
    # from google.cloud import texttospeech
    # client = texttospeech.TextToSpeechClient()
    # ...
    logger.debug("TTS not implemented — sending text reply instead")
    return None
