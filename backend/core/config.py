"""
Application configuration.

All settings are read from environment variables (or a .env file).
Never hardcode secrets — use .env.example as the reference for required vars.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration read from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── LLM (Gemini via OpenRouter or direct) ─────────────────
    GEMINI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    LLM_MODEL: str = "google/gemini-2.5-flash"
    GEMINI_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # ── Supabase (Auth + Database) ────────────────────────────
    # Project URL from Supabase dashboard → Settings → API
    SUPABASE_URL: str = ""
    # Public anon key (safe for frontend)
    SUPABASE_ANON_KEY: str = ""
    # Service role key (backend only — NEVER expose to frontend)
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    # Postgres connection string from Supabase → Settings → Database
    SUPABASE_DB_URL: str = "sqlite:///./agenthive.db"

    # ── WhatsApp Gateway ──────────────────────────────────────
    # Provider: "meta" (production) or "twilio" (sandbox/demo)
    WHATSAPP_PROVIDER: str = "twilio"
    # Meta Cloud API credentials
    WHATSAPP_VERIFY_TOKEN: str = "agenthive-verify"
    WHATSAPP_API_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    # Twilio Sandbox credentials
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"

    # ── Google Calendar (OAuth 2.0 per-user) ──────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/calendar/callback"

    # ── Razorpay ──────────────────────────────────────────────
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # ── App ───────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"


settings = Settings()
