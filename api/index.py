"""
Vercel Serverless Entrypoint for AgentHive FastAPI Backend.

This file acts as the ASGI entrypoint when deploying AgentHive to Vercel Serverless.
Vercel's Python runtime automatically imports `app` from `api/index.py`.
"""

from backend.core.app import app

# Export ASGI app for Vercel
__all__ = ["app"]
