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


def get_llm(
    temperature: float = 0.3,
    max_tokens: Optional[int] = None,
) -> ChatOpenAI:
    """Return a configured ChatOpenAI instance pointing at the LLM API.

    Uses the resolved API key (GEMINI_API_KEY preferred over OPENROUTER_API_KEY)
    and base URL. This ensures the valid .env key is used even when a stale
    OS-level environment variable overrides one of the settings.

    Args:
        temperature: Sampling temperature (0.0 = deterministic, 1.0 = creative).
        max_tokens: Maximum tokens in the response. Defaults to 1024 if not set.

    Returns:
        A ChatOpenAI instance ready to invoke.
    """
    return ChatOpenAI(
        base_url=_RESOLVED_BASE_URL,
        api_key=_RESOLVED_API_KEY,
        model=_RESOLVED_MODEL,
        temperature=temperature,
        max_tokens=max_tokens or 1024,
        max_retries=2,
        timeout=120,
        default_headers={
            "HTTP-Referer": "https://agenthive.app",
            "X-Title": "AgentHive",
        },
    )
