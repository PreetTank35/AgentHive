"""
Database engine, session management, and Supabase client.

Uses SQLAlchemy ORM connected to Supabase PostgreSQL for all data operations.
Also initializes a supabase-py client for Supabase Auth operations.
Falls back to SQLite if the Postgres driver is unavailable (local dev / serverless).
"""

from __future__ import annotations

import logging
import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from backend.core.config import settings

logger = logging.getLogger("agenthive.database")

# ── SQLAlchemy engine (Supabase Postgres or SQLite fallback) ──

db_url = settings.SUPABASE_DB_URL.strip()
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# On Vercel Serverless, root filesystem is read-only.
# If using SQLite fallback, redirect to /tmp/agenthive.db
if os.getenv("VERCEL") and db_url.startswith("sqlite"):
    db_url = "sqlite:////tmp/agenthive.db"

try:
    if db_url.startswith("sqlite"):
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args={"check_same_thread": False},
        )
    else:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=300,
        )
except Exception as e:
    logger.warning("PostgreSQL engine initialization warning: %s — falling back to SQLite in-memory", e)
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session and closes it after use.

    Yields:
        A SQLAlchemy Session bound to the configured engine.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Supabase client (for Auth operations) ────────────────────

_supabase_client = None


def get_supabase():
    """Return a cached Supabase client for auth operations.

    Uses the service_role key so the backend can manage users directly.
    Returns None if Supabase credentials are not configured.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning(
            "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — "
            "Supabase Auth operations will fall back to custom JWT"
        )
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
        logger.info("Supabase client initialized (URL=%s)", settings.SUPABASE_URL)
        return _supabase_client
    except ImportError:
        logger.warning("supabase-py not installed — pip install supabase")
        return None
    except Exception as e:
        logger.error("Failed to create Supabase client: %s", e)
        return None
