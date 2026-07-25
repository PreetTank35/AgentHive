"""
Google Calendar integration — OAuth 2.0 per-user flow.

Each business owner connects their own Google Calendar via OAuth.
The refresh token is stored in the User model (Supabase Postgres),
and the access token is refreshed automatically as needed.

Key differences from the old service-account approach:
  - Each user connects their OWN calendar (not a shared service account)
  - One-time OAuth consent flow, then refresh token stored per-user
  - Events use Calendar's native reminders instead of Celery
  - Can both create AND read events (day/week/month views)

Setup (one-time):
  1. Google Cloud Console → your project
  2. Enable "Google Calendar API"
  3. OAuth consent screen → External, add test users
  4. Credentials → Create OAuth 2.0 Client ID (Web application)
  5. Add redirect URI: http://localhost:8000/api/calendar/callback
  6. Copy Client ID + Secret to .env as GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import get_db

logger = logging.getLogger("agenthive.integrations.calendar")

calendar_router = APIRouter()

# OAuth scopes — read/write access to calendar events
SCOPES = ["https://www.googleapis.com/auth/calendar"]


# ── OAuth credential builder ─────────────────────────────────

def _get_flow():
    """Create a Google OAuth2 flow for the Calendar API.

    Returns:
        An InstalledAppFlow or Flow object, or None if not configured.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        logger.warning("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set")
        return None

    try:
        from google_auth_oauthlib.flow import Flow
    except ImportError:
        logger.error("google-auth-oauthlib not installed — pip install google-auth-oauthlib")
        return None

    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }

    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    return flow


def _build_credentials_from_refresh_token(refresh_token: str):
    """Build Google OAuth credentials from a stored refresh token.

    Args:
        refresh_token: The user's stored refresh token.

    Returns:
        google.oauth2.credentials.Credentials object, or None.
    """
    if not refresh_token:
        return None

    try:
        from google.oauth2.credentials import Credentials
    except ImportError:
        return None

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )

    # Refresh the access token
    try:
        from google.auth.transport.requests import Request
        creds.refresh(Request())
        return creds
    except Exception as e:
        logger.error("Failed to refresh Google credentials: %s", e)
        return None


def _get_calendar_service(user_id: int, db: Session):
    """Build an authenticated Google Calendar API client for a specific user.

    Loads the user's refresh token from the database, builds credentials,
    and returns the Calendar API service object.

    Args:
        user_id: The user's database ID.
        db: Database session.

    Returns:
        Tuple of (service, error_message). Service is None if auth failed.
    """
    from backend.db.models import User

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None, "User not found"

    if not user.google_calendar_refresh_token:
        return None, "Google Calendar not connected. Please authorize via /api/calendar/auth"

    creds = _build_credentials_from_refresh_token(user.google_calendar_refresh_token)
    if not creds:
        return None, "Failed to refresh Google Calendar credentials. Please re-authorize."

    try:
        from googleapiclient.discovery import build
        service = build("calendar", "v3", credentials=creds)
        return service, None
    except Exception as e:
        return None, f"Failed to build Calendar client: {e}"


# ── Calendar operations ──────────────────────────────────────

def create_calendar_event(
    user_id: int,
    summary: str,
    start_time: str,
    duration_minutes: int = 30,
    description: str = "",
    db: Session = None,
) -> dict:
    """Create a real event on the user's connected Google Calendar.

    Uses Calendar's native reminder settings on created events instead of
    building a separate reminder-scheduling system.

    Args:
        user_id: The user's database ID.
        summary: Short title for the event.
        start_time: ISO 8601 datetime string.
        duration_minutes: How long the event lasts.
        description: Optional longer description.
        db: Database session (created internally if not provided).

    Returns:
        A dict with "status": "success" and event details, or "status": "error".
    """
    close_db = False
    if db is None:
        from backend.core.database import SessionLocal
        db = SessionLocal()
        close_db = True

    try:
        service, error = _get_calendar_service(user_id, db)
        if service is None:
            return {"status": "error", "message": error}

        start_dt = datetime.fromisoformat(start_time)
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        event = {
            "summary": summary,
            "description": description,
            "start": {"dateTime": start_dt.isoformat(), "timeZone": "Asia/Kolkata"},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": "Asia/Kolkata"},
            # Use Calendar's native reminders — no Celery needed
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 30},
                    {"method": "popup", "minutes": 10},
                ],
            },
        }

        created = service.events().insert(calendarId="primary", body=event).execute()
        logger.info("Created calendar event: %s", created.get("htmlLink"))
        return {
            "status": "success",
            "event_id": created.get("id"),
            "link": created.get("htmlLink"),
            "summary": summary,
            "start": start_dt.isoformat(),
        }
    except Exception as e:
        logger.error("Failed to create calendar event: %s", e)
        return {"status": "error", "message": str(e)}
    finally:
        if close_db:
            db.close()


def list_calendar_events(
    user_id: int,
    time_min: str = None,
    time_max: str = None,
    max_results: int = 10,
    db: Session = None,
) -> dict:
    """List upcoming events from the user's Google Calendar.

    Args:
        user_id: The user's database ID.
        time_min: ISO 8601 start of time range (defaults to now).
        time_max: ISO 8601 end of time range (defaults to 7 days from now).
        max_results: Maximum events to return.
        db: Database session.

    Returns:
        A dict with "status": "success" and list of events, or "status": "error".
    """
    close_db = False
    if db is None:
        from backend.core.database import SessionLocal
        db = SessionLocal()
        close_db = True

    try:
        service, error = _get_calendar_service(user_id, db)
        if service is None:
            return {"status": "error", "message": error}

        now = datetime.now(timezone.utc)
        if not time_min:
            time_min = now.isoformat()
        if not time_max:
            time_max = (now + timedelta(days=7)).isoformat()

        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=time_min,
                timeMax=time_max,
                maxResults=max_results,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )

        events = events_result.get("items", [])
        formatted = [
            {
                "id": e.get("id"),
                "summary": e.get("summary", "(No title)"),
                "start": e.get("start", {}).get("dateTime", e.get("start", {}).get("date")),
                "end": e.get("end", {}).get("dateTime", e.get("end", {}).get("date")),
                "link": e.get("htmlLink"),
            }
            for e in events
        ]

        return {"status": "success", "events": formatted, "count": len(formatted)}
    except Exception as e:
        logger.error("Failed to list calendar events: %s", e)
        return {"status": "error", "message": str(e)}
    finally:
        if close_db:
            db.close()


# ── OAuth API routes ──────────────────────────────────────────

@calendar_router.get("/auth")
def calendar_auth(user_id: int = Query(1, description="User ID to connect calendar for")):
    """Initiate Google Calendar OAuth consent flow.

    Redirects the user to Google's consent screen. After approval,
    Google redirects back to /api/calendar/callback with an auth code.

    Args:
        user_id: The user's database ID (passed through as state).

    Returns:
        Redirect to Google's OAuth consent page.
    """
    flow = _get_flow()
    if flow is None:
        raise HTTPException(status_code=500, detail="Google Calendar OAuth not configured")

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=str(user_id),  # pass user_id through OAuth state
    )
    return RedirectResponse(url=auth_url)


@calendar_router.get("/callback")
def calendar_callback(
    code: str = Query(...),
    state: str = Query("1"),
    db: Session = Depends(get_db),
):
    """Handle Google Calendar OAuth callback.

    Exchanges the auth code for tokens, stores the refresh token in
    the user's database record.

    Args:
        code: Authorization code from Google.
        state: User ID passed through OAuth state.
        db: Database session.

    Returns:
        Success message with instructions.
    """
    from backend.db.models import User

    flow = _get_flow()
    if flow is None:
        raise HTTPException(status_code=500, detail="Google Calendar OAuth not configured")

    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to exchange auth code: {e}")

    credentials = flow.credentials
    refresh_token = credentials.refresh_token

    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail="No refresh token received. Try revoking access at myaccount.google.com/permissions and re-authorizing.",
        )

    # Store refresh token against the user
    user_id = int(state)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.google_calendar_refresh_token = refresh_token
    db.commit()

    logger.info("Google Calendar connected for user %d", user_id)
    return {
        "status": "success",
        "message": "Google Calendar connected! The Scheduler Agent can now create and read events on your calendar.",
    }


@calendar_router.get("/events")
def get_events(
    user_id: int = Query(1),
    days: int = Query(7, description="Number of days to look ahead"),
    db: Session = Depends(get_db),
):
    """List upcoming calendar events for a user.

    Args:
        user_id: The user's database ID.
        days: Number of days to look ahead (default 7).
        db: Database session.

    Returns:
        List of upcoming events.
    """
    now = datetime.now(timezone.utc)
    time_max = (now + timedelta(days=days)).isoformat()
    return list_calendar_events(user_id=user_id, time_min=now.isoformat(), time_max=time_max, db=db)


@calendar_router.get("/status")
def calendar_status(
    user_id: int = Query(1),
    db: Session = Depends(get_db),
):
    """Check if a user has connected their Google Calendar.

    Args:
        user_id: The user's database ID.
        db: Database session.

    Returns:
        Connection status dict.
    """
    from backend.db.models import User

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"connected": False, "reason": "User not found"}

    connected = bool(user.google_calendar_refresh_token)
    return {
        "connected": connected,
        "auth_url": "/api/calendar/auth?user_id=" + str(user_id) if not connected else None,
    }
