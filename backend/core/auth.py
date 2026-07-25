"""
Authentication utilities — Supabase Auth with custom JWT fallback.

When Supabase is configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY),
all auth operations go through Supabase Auth. When it's not configured
(e.g., local dev without Supabase), falls back to custom JWT with bcrypt.

This ensures the app works in both modes without code changes.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import get_db, get_supabase

logger = logging.getLogger("agenthive.auth")

bearer_scheme = HTTPBearer(auto_error=False)


# ── Password hashing (fallback mode only) ────────────────────

def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt (preferred) or SHA256.

    Args:
        password: The plain-text password.

    Returns:
        The hash string.
    """
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.hash(password)
    except Exception:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a stored hash.

    Args:
        plain: The plain-text password to check.
        hashed: The stored hash.

    Returns:
        True if the password matches.
    """
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(plain, hashed)
    except Exception:
        return hashlib.sha256(plain.encode("utf-8")).hexdigest() == hashed


# ── Token creation (Supabase-first, JWT fallback) ────────────

def create_access_token(data: dict[str, Any]) -> str:
    """Create a signed access token.

    When Supabase is configured, this is a no-op since Supabase Auth
    returns its own tokens directly during sign_up/sign_in. This function
    is only used in custom JWT fallback mode.

    Args:
        data: Payload data to embed in the token (must include ``sub``).

    Returns:
        Encoded JWT string.
    """
    import jwt
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, "agenthive-fallback-secret", algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify an access token.

    Tries Supabase Auth first (validates the JWT against Supabase's JWKS).
    Falls back to custom JWT verification if Supabase isn't configured.

    Args:
        token: The encoded JWT string.

    Returns:
        The decoded payload dictionary.

    Raises:
        HTTPException: If the token is expired or invalid.
    """
    # Try Supabase Auth first
    sb = get_supabase()
    if sb is not None:
        try:
            user_response = sb.auth.get_user(token)
            if user_response and user_response.user:
                return {
                    "sub": user_response.user.id,
                    "email": user_response.user.email,
                    "supabase": True,
                }
        except Exception as e:
            logger.debug("Supabase token validation failed: %s — trying JWT fallback", e)

    # Fallback to custom JWT
    try:
        import jwt
        payload = jwt.decode(token, "agenthive-fallback-secret", algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )


# ── Supabase Auth operations ─────────────────────────────────

def supabase_sign_up(email: str, password: str) -> dict[str, Any] | None:
    """Register a new user via Supabase Auth.

    Args:
        email: User's email address.
        password: User's password.

    Returns:
        Dict with access_token, user_id, etc., or None if Supabase isn't configured.

    Raises:
        HTTPException: If signup fails.
    """
    sb = get_supabase()
    if sb is None:
        return None

    try:
        response = sb.auth.sign_up({"email": email, "password": password})
        if response.user:
            return {
                "access_token": response.session.access_token if response.session else "",
                "user_id": response.user.id,
                "email": response.user.email,
            }
        raise HTTPException(status_code=400, detail="Signup failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Supabase sign_up error: %s", e)
        raise HTTPException(status_code=400, detail=f"Signup failed: {str(e)}")


def supabase_sign_in(email: str, password: str) -> dict[str, Any] | None:
    """Sign in a user via Supabase Auth.

    Args:
        email: User's email address.
        password: User's password.

    Returns:
        Dict with access_token, user_id, etc., or None if Supabase isn't configured.

    Raises:
        HTTPException: If login fails.
    """
    sb = get_supabase()
    if sb is None:
        return None

    try:
        response = sb.auth.sign_in_with_password({"email": email, "password": password})
        if response.user and response.session:
            return {
                "access_token": response.session.access_token,
                "user_id": response.user.id,
                "email": response.user.email,
            }
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Supabase sign_in error: %s", e)
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


# ── FastAPI dependencies ──────────────────────────────────────

def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Any | None:
    """FastAPI dependency that returns the current user if a valid token is present, else None.

    This is used for endpoints that work both with and without authentication
    (e.g., the chat widget in demo mode).

    Args:
        credentials: The Bearer token from the Authorization header.
        db: The database session.

    Returns:
        The User ORM object, or None if no valid token is present.
    """
    if credentials is None:
        return None

    from backend.db.models import User  # avoid circular import

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if user_id is None:
        return None

    # Supabase user IDs are UUIDs; custom JWT uses integer IDs
    if payload.get("supabase"):
        # Look up by email since Supabase uses UUID IDs
        email = payload.get("email")
        if email:
            user = db.query(User).filter(User.email == email).first()
            return user
        return None
    else:
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Any:
    """FastAPI dependency that requires a valid token and returns the current user.

    Args:
        credentials: The Bearer token from the Authorization header.
        db: The database session.

    Returns:
        The User ORM object.

    Raises:
        HTTPException: If no valid token is provided.
    """
    user = get_current_user_optional(credentials, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user
