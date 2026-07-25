"""
Shared state schema for the LangGraph agent orchestration.

Every node in the graph reads and writes this state. The ``messages``
field uses LangGraph's built-in message reducer so appended messages
are accumulated automatically.
"""

from __future__ import annotations

from typing import Annotated, Any

from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """Shared state flowing through the Manager → Specialist agent graph.

    Attributes:
        messages: Conversation message list (auto-accumulated via add_messages).
        current_agent: Name of the specialist agent chosen by the manager.
        user_id: Database ID of the current user (for scoped DB queries).
        metadata: Arbitrary extra data agents can pass to each other.
    """

    messages: Annotated[list, add_messages]
    current_agent: str
    user_id: int
    metadata: dict[str, Any]
