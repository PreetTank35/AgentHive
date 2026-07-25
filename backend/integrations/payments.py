"""
Razorpay integration — creates real payment links for invoices so the
Finance Agent can actually collect payment, not just record it.

Setup required (one-time, outside this code):
    1. Sign up at razorpay.com (test mode is free, no real bank
       account needed to start).
    2. Go to Settings -> API Keys -> Generate Test Key.
    3. Put the Key ID and Key Secret into your .env file as
       RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.
"""

from __future__ import annotations

import logging

from backend.core.config import settings

logger = logging.getLogger("agenthive.integrations.payments")

_client = None  # lazily-built Razorpay client, cached after first use


def _get_client():
    """Build (and cache) the authenticated Razorpay client.

    Returns:
        The Razorpay client, or None if credentials are missing or the
        SDK isn't installed.
    """
    global _client
    if _client is not None:
        return _client

    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        logger.warning("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set")
        return None

    try:
        import razorpay
    except ImportError:
        logger.error("razorpay package not installed. Run: pip install razorpay")
        return None

    _client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    return _client


def create_payment_link(amount_rupees: float, description: str, customer_name: str, customer_phone: str = "") -> dict:
    """Create a real, shareable Razorpay payment link for an invoice.

    The returned link can be sent directly to a customer over WhatsApp —
    they tap it, pay via UPI/card, and Razorpay handles the actual
    transaction.

    Args:
        amount_rupees: Amount to charge, in rupees (e.g. 5000 for ₹5000).
        description: What the payment is for (shown to the customer).
        customer_name: Customer's name, shown on the payment page.
        customer_phone: Optional phone number in international format
            (e.g. "919876543210"), used to prefill the payment form.

    Returns:
        A dict with "status": "success" and the payment "link" (URL) on
        success, or "status": "error" with a message on failure.
    """
    client = _get_client()
    if client is None:
        return {"status": "error", "message": "Razorpay not configured"}

    try:
        payload = {
            "amount": int(amount_rupees * 100),  # Razorpay uses paise, not rupees
            "currency": "INR",
            "description": description,
            "customer": {
                "name": customer_name,
                "contact": customer_phone,
            },
            "notify": {"sms": bool(customer_phone), "email": False},
        }
        link = client.payment_link.create(payload)
        logger.info("Created Razorpay payment link for %s: %s", customer_name, link.get("short_url"))
        return {
            "status": "success",
            "payment_link_id": link.get("id"),
            "link": link.get("short_url"),
        }
    except Exception as e:
        logger.error("Failed to create Razorpay payment link: %s", e)
        return {"status": "error", "message": str(e)}
