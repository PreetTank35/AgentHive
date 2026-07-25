"""
SQLAlchemy ORM models for AgentHive.

Tables: users, customers, expenses, invoices, reminders, drafts,
support_questions, faq_entries, conversations, messages,
marketplace_agents, hired_agents.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.core.database import Base


def _utcnow() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


# ── Users ─────────────────────────────────────────────────────

class User(Base):
    """A business owner / operator using AgentHive."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    business_name = Column(String(255), nullable=False, default="My Business")
    created_at = Column(DateTime, default=_utcnow)
    # Google Calendar OAuth — stored per-user so each business connects their own calendar
    google_calendar_refresh_token = Column(Text, nullable=True)

    customers = relationship("Customer", back_populates="user")
    expenses = relationship("Expense", back_populates="user")
    invoices = relationship("Invoice", back_populates="user")
    reminders = relationship("Reminder", back_populates="user")
    drafts = relationship("Draft", back_populates="user")
    support_questions = relationship("SupportQuestion", back_populates="user")
    faq_entries = relationship("FaqEntry", back_populates="user")
    conversations = relationship("Conversation", back_populates="user")


# ── Customers ─────────────────────────────────────────────────

class Customer(Base):
    """A customer of the small business."""

    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="customers")
    invoices = relationship("Invoice", back_populates="customer")


# ── Expenses ──────────────────────────────────────────────────

class Expense(Base):
    """A business expense entry."""

    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(100), nullable=False, default="general")
    description = Column(Text, nullable=True)
    date = Column(DateTime, default=_utcnow)
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="expenses")


# ── Invoices ──────────────────────────────────────────────────

class Invoice(Base):
    """A simple invoice record."""

    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    items = Column(Text, nullable=False, default="[]")  # JSON-encoded list
    total = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), nullable=False, default="draft")  # draft / sent / paid
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")


# ── Reminders ─────────────────────────────────────────────────

class Reminder(Base):
    """A reminder or meeting record."""

    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_at = Column(DateTime, nullable=False)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="reminders")


# ── Drafts (Content Agent) ───────────────────────────────────

class Draft(Base):
    """A content draft — social post, email, or proposal."""

    __tablename__ = "drafts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content_type = Column(String(50), nullable=False, default="post")  # post / email / proposal
    subject = Column(String(255), nullable=True)
    body = Column(Text, nullable=False, default="")
    status = Column(String(50), nullable=False, default="draft")  # draft / published
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="drafts")


# ── Support ───────────────────────────────────────────────────

class SupportQuestion(Base):
    """A logged customer support question and its answer."""

    __tablename__ = "support_questions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="support_questions")


class FaqEntry(Base):
    """A FAQ entry used by the Support Agent for RAG retrieval."""

    __tablename__ = "faq_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="faq_entries")


# ── Conversations & Messages ─────────────────────────────────

class Conversation(Base):
    """A chat conversation (web widget or WhatsApp)."""

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    channel = Column(String(50), nullable=False, default="web")  # web / whatsapp
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")


class Message(Base):
    """A single message within a conversation."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # user / assistant / system
    content = Column(Text, nullable=False)
    agent_name = Column(String(50), nullable=True)  # which specialist agent handled it
    created_at = Column(DateTime, default=_utcnow)

    conversation = relationship("Conversation", back_populates="messages")


# ── Marketplace (stretch) ────────────────────────────────────

class MarketplaceAgent(Base):
    """A third-party agent listed on the marketplace."""

    __tablename__ = "marketplace_agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    creator = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, default="general")
    pricing = Column(String(100), nullable=False, default="free")
    icon = Column(String(10), nullable=True, default="🤖")
    created_at = Column(DateTime, default=_utcnow)


class HiredAgent(Base):
    """Records that a user has 'hired' a marketplace agent."""

    __tablename__ = "hired_agents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("marketplace_agents.id"), nullable=False)
    hired_at = Column(DateTime, default=_utcnow)
