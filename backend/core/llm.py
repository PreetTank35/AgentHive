"""
Central LLM initializer for AgentHive.

Uses OpenRouter (google/gemini-2.5-flash) as the primary LLM via the
OpenAI-compatible endpoint. Falls back to a deterministic report
handler only when the API is truly unreachable.

BUG FIX (2026-07-24): Reversed API key priority order.
    The OS-level OPENROUTER_API_KEY env var was overriding the valid
    .env file value via pydantic-settings' precedence rules. The old
    code used `settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY`,
    which always picked the stale OS key. Now we use GEMINI_API_KEY
    first (reliably read from .env), falling back to OPENROUTER_API_KEY.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage

from backend.core.config import settings

logger = logging.getLogger("agenthive.llm")

# ── Resolved credentials (computed once at module load) ──────
# Priority: GEMINI_API_KEY (from .env) > OPENROUTER_API_KEY (may be overridden by OS env)
_RESOLVED_API_KEY: str = settings.GEMINI_API_KEY or settings.OPENROUTER_API_KEY
_RESOLVED_BASE_URL: str = settings.GEMINI_BASE_URL or settings.OPENROUTER_BASE_URL
_RESOLVED_MODEL: str = settings.LLM_MODEL or "google/gemini-2.5-flash"

# Log the resolved credentials at startup so auth issues are immediately visible
logger.info(
    "LLM config resolved — model=%s, base_url=%s, api_key=%s...%s",
    _RESOLVED_MODEL,
    _RESOLVED_BASE_URL,
    _RESOLVED_API_KEY[:12] if _RESOLVED_API_KEY else "EMPTY",
    _RESOLVED_API_KEY[-4:] if _RESOLVED_API_KEY else "",
)

if not _RESOLVED_API_KEY:
    logger.error(
        "NO API KEY FOUND — both GEMINI_API_KEY and OPENROUTER_API_KEY are empty. "
        "LLM calls will fail. Set one of these in your .env file."
    )


def get_api_key() -> str:
    """Return the first non-empty API key from environment settings."""
    return settings.GEMINI_API_KEY or settings.OPENROUTER_API_KEY or settings.OPENAI_API_KEY or ""


def get_llm(
    temperature: float = 0.3,
    max_tokens: Optional[int] = None,
) -> ChatOpenAI:
    """Return a configured ChatOpenAI instance pointing at the LLM API.

    Supports direct Google Gemini API (Google AI Studio) as well as OpenRouter.
    Automatically formats base_url and model name depending on provider.
    """
    api_key = get_api_key()

    # Determine default base URL & model based on key provider
    if api_key.startswith("sk-or-v1-"):
        default_base_url = "https://openrouter.ai/api/v1"
        default_model = "google/gemini-2.5-flash"
    else:
        # Direct Google Gemini API OpenAI-compatible endpoint
        default_base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        default_model = "gemini-1.5-flash"

    base_url = settings.GEMINI_BASE_URL or settings.OPENROUTER_BASE_URL or default_base_url
    model = settings.LLM_MODEL or default_model

    # If using Google direct endpoint and model starts with 'google/', strip prefix
    if "generativelanguage.googleapis.com" in base_url and model.startswith("google/"):
        model = model.replace("google/", "", 1)

    if not api_key:
        logger.error("No LLM API key provided. Set GEMINI_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY.")

    headers = {}
    if "openrouter.ai" in base_url:
        headers = {
            "HTTP-Referer": "https://agenthive.app",
            "X-Title": "AgentHive",
        }

    return ChatOpenAI(
        base_url=base_url,
        api_key=api_key or "placeholder",
        model=model,
        temperature=temperature,
        max_tokens=max_tokens or 1024,
        max_retries=2,
        timeout=120,
        default_headers=headers if headers else None,
    )
