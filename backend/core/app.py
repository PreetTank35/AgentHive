"""
FastAPI application factory and main app instance.

Mounts all routers, configures CORS, and provides a /health endpoint.
Swagger UI is available at /docs.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.core.database import Base, engine

logger = logging.getLogger("agenthive")


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: create DB tables on startup.

    Args:
        application: The FastAPI app instance.

    Yields:
        Control back to the framework while the app is running.
    """
    logger.info("Creating database tables …")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready.")

    # Auto-seed if database is empty
    try:
        from backend.db.seed_data import seed
        seed()
    except Exception as e:
        logger.warning("Auto-seed skipped or failed: %s", e)

    yield
    logger.info("Shutting down …")


app = FastAPI(
    title="AgentHive API",
    description="AI-powered virtual team for small businesses — Manager Agent orchestrates 5 specialist agents.",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ──────────────────────────────────────────────

@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    """Return a simple health-check response.

    Returns:
        A dict with status "ok" and the current environment.
    """
    return {"status": "ok", "environment": settings.ENVIRONMENT}


# ── Register routers ─────────────────────────────────────────
# Import here (after app creation) to avoid circular imports.

from backend.integrations.chat_routes import router as chat_router  # noqa: E402
from backend.integrations.whatsapp import router as whatsapp_router  # noqa: E402

app.include_router(whatsapp_router, prefix="/api/webhook", tags=["webhook"])
app.include_router(chat_router, prefix="/api", tags=["chat"])

# ── Google Calendar OAuth routes ─────────────────────────────
try:
    from backend.integrations.calendar import calendar_router  # noqa: E402
    app.include_router(calendar_router, prefix="/api/calendar", tags=["calendar"])
except ImportError:
    logger.warning("Calendar routes not available")
