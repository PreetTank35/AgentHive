"""
Scheduler Agent — creates reminders, schedules meetings, lists upcoming events.

Uses LLM API calls with tool-use for DB operations
and Google Calendar (OAuth per-user).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage, ToolMessage
from backend.core.llm import get_llm
from backend.core.database import SessionLocal
from backend.db.models import Reminder
from backend.orchestration.state import AgentState
from backend.integrations.calendar import create_calendar_event, list_calendar_events

logger = logging.getLogger("agenthive.agents.scheduler")

SCHEDULER_SYSTEM_PROMPT = """You are HIVE — the intelligent AI assistant powering AgentHive for Sunrise Bakery.

Think of yourself like JARVIS managing Tony Stark's schedule — precise, reliable, and always ahead of time.
When Tony says "remind me to order flour tomorrow", JARVIS handles it instantly with a confirmation. That's you.

## Your Personality:
- Efficient and dependable — time management is your domain
- Conversational confirmations — "Done! I've set a reminder for tomorrow at 9 AM to order flour." not "Reminder created. ID: 12."
- If someone is just chatting, respond naturally
- When listing schedules, make it scannable and clear
- Light humor welcome — "Looks like a busy week! Better brew some extra coffee ☕"

## Rules:
1. Use tools to create/list/complete reminders and calendar events
2. Parse natural language dates: "tomorrow" = next day, "next Monday" = coming Monday
3. If no time is specified, default to 9:00 AM
4. After scheduling, confirm the exact date/time in plain language
5. NEVER respond with raw JSON or database IDs — always speak naturally
6. Use create_calendar_event for actual meetings, create_reminder for internal tasks
"""

SCHEDULER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_reminder",
            "description": "Create a new reminder or task. The due_at must be in ISO 8601 format.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Short title for the reminder"},
                    "description": {"type": "string", "description": "Additional details"},
                    "due_at": {"type": "string", "description": "Due date/time in ISO 8601 format (e.g., 2025-01-15T09:00:00)"},
                },
                "required": ["title", "due_at"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_reminders",
            "description": "List upcoming reminders that are not yet completed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "include_completed": {"type": "boolean", "description": "Whether to include completed reminders (default: false)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "complete_reminder",
            "description": "Mark a reminder as completed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reminder_id": {"type": "integer", "description": "ID of the reminder to complete"},
                },
                "required": ["reminder_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_calendar_event",
            "description": "Create a real event on the user's connected Google Calendar (use this for actual meetings, not just internal reminders). Uses Calendar's native reminders.",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string", "description": "Short title for the meeting"},
                    "start_time": {"type": "string", "description": "Start date/time in ISO 8601 format (e.g., 2026-07-25T15:00:00)"},
                    "duration_minutes": {"type": "integer", "description": "Duration in minutes (default 30)"},
                    "description": {"type": "string", "description": "Optional extra notes for the event"},
                },
                "required": ["summary", "start_time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_calendar_events",
            "description": "List upcoming events from the user's Google Calendar. Shows events for the specified number of days ahead.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Number of days to look ahead (default 7, max 30)"},
                },
                "required": [],
            },
        },
    },
]


def _create_reminder(user_id: int, title: str, due_at: str, description: str = "") -> str:
    """Insert a new reminder into the database.

    Args:
        user_id: The owning user's ID.
        title: Reminder title.
        due_at: ISO 8601 datetime string.
        description: Optional details.

    Returns:
        JSON confirmation string.
    """
    db = SessionLocal()
    try:
        # Parse the ISO date string
        try:
            due_datetime = datetime.fromisoformat(due_at.replace("Z", "+00:00"))
        except ValueError:
            # Fallback: try common formats
            due_datetime = datetime.now(timezone.utc)

        reminder = Reminder(
            user_id=user_id,
            title=title,
            description=description,
            due_at=due_datetime,
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return json.dumps({
            "status": "success",
            "reminder_id": reminder.id,
            "title": title,
            "due_at": due_datetime.isoformat(),
        })
    except Exception as e:
        db.rollback()
        return json.dumps({"status": "error", "message": str(e)})
    finally:
        db.close()


def _list_reminders(user_id: int, include_completed: bool = False) -> str:
    """List reminders from the database.

    Args:
        user_id: The owning user's ID.
        include_completed: Whether to include completed items.

    Returns:
        JSON string listing reminders.
    """
    db = SessionLocal()
    try:
        query = db.query(Reminder).filter(Reminder.user_id == user_id)
        if not include_completed:
            query = query.filter(Reminder.completed.is_(False))
        reminders = query.order_by(Reminder.due_at.asc()).limit(20).all()
        result = [
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "due_at": r.due_at.isoformat() if r.due_at else None,
                "completed": r.completed,
            }
            for r in reminders
        ]
        return json.dumps({"reminders": result, "count": len(result)})
    finally:
        db.close()


def _complete_reminder(user_id: int, reminder_id: int) -> str:
    """Mark a reminder as completed.

    Args:
        user_id: The owning user's ID.
        reminder_id: ID of the reminder to complete.

    Returns:
        JSON confirmation string.
    """
    db = SessionLocal()
    try:
        reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == user_id).first()
        if not reminder:
            return json.dumps({"status": "error", "message": f"Reminder {reminder_id} not found"})
        reminder.completed = True
        db.commit()
        return json.dumps({"status": "success", "reminder_id": reminder_id, "title": reminder.title})
    except Exception as e:
        db.rollback()
        return json.dumps({"status": "error", "message": str(e)})
    finally:
        db.close()


def _create_calendar_event_tool(user_id: int, summary: str, start_time: str, duration_minutes: int = 30, description: str = "") -> str:
    """Wrapper for Google Calendar event creation — OAuth per-user.

    Args:
        user_id: The owning user's ID (used to look up their OAuth tokens).
        summary: Short title for the meeting.
        start_time: ISO 8601 datetime string.
        duration_minutes: Duration in minutes.
        description: Optional extra notes.

    Returns:
        JSON string with the result.
    """
    result = create_calendar_event(
        user_id=user_id,
        summary=summary,
        start_time=start_time,
        duration_minutes=duration_minutes,
        description=description,
    )
    return json.dumps(result)


def _list_calendar_events_tool(user_id: int, days: int = 7) -> str:
    """List upcoming Google Calendar events for the user.

    Args:
        user_id: The owning user's ID.
        days: Number of days to look ahead.

    Returns:
        JSON string with events list.
    """
    days = min(days, 30)  # cap at 30 days
    result = list_calendar_events(user_id=user_id, max_results=20)
    return json.dumps(result)


TOOL_MAP = {
    "create_reminder": _create_reminder,
    "list_reminders": _list_reminders,
    "complete_reminder": _complete_reminder,
    "create_calendar_event": _create_calendar_event_tool,
    "list_calendar_events": _list_calendar_events_tool,
}


def _execute_tool(tool_name: str, args: dict[str, Any], user_id: int) -> str:
    """Execute a scheduler tool by name.

    Args:
        tool_name: Name of the tool.
        args: Arguments from the LLM.
        user_id: Current user's DB ID.

    Returns:
        JSON result string.
    """
    fn = TOOL_MAP.get(tool_name)
    if fn is None:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})
    return fn(user_id=user_id, **args)


def _fallback_scheduler_handler(state: AgentState, error_msg: str = "") -> dict:
    """Natural fallback handler when LLM API fails."""
    import re
    from datetime import timedelta
    user_id = state.get("user_id", 1)
    user_text = state["messages"][-1].content if state.get("messages") else ""
    lower = user_text.lower()

    logger.warning("Scheduler LLM call failed (%s) — running fallback", error_msg)

    # 1. List reminders intent
    if any(k in lower for k in ["list", "show", "upcoming", "view", "reminders"]):
        res_raw = _list_reminders(user_id=user_id, include_completed=False)
        data = json.loads(res_raw)
        reminders = data.get("reminders", [])
        if not reminders:
            msg = "Your schedule is clear! No upcoming reminders at the moment. 📅"
        else:
            lines = ["Here's what's coming up:\n"]
            for r in reminders:
                due_str = r['due_at'][:16].replace('T', ' ') if r.get('due_at') else "Soon"
                lines.append(f"• **{r['title']}** — {due_str}")
            msg = "\n".join(lines)
        return {"messages": [AIMessage(content=msg, name="scheduler")]}

    # 2. Create reminder intent
    title = re.sub(r"remind\s+(?:me\s+)?(?:to\s+)?", "", user_text, flags=re.IGNORECASE).strip()
    if not title:
        title = "Bakery Task"

    now = datetime.now(timezone.utc)
    due = now + timedelta(days=1)
    if "tomorrow" in lower:
        due = now + timedelta(days=1)
    elif "today" in lower:
        due = now + timedelta(hours=4)
    elif "next week" in lower:
        due = now + timedelta(days=7)

    _create_reminder(user_id=user_id, title=title.capitalize(), due_at=due.isoformat(), description=user_text)

    due_formatted = due.strftime("%B %d at %I:%M %p")
    msg = f"Done! ✅ I've set a reminder for **{title.capitalize()}** on **{due_formatted}**. I'll make sure you don't forget!"
    return {"messages": [AIMessage(content=msg, name="scheduler")]}


def scheduler_node(state: AgentState) -> dict:
    """Scheduler specialist agent node for the LangGraph.

    Uses bind_tools() instead of passing tools= to invoke() to avoid
    TypeError with ChatOpenAI.

    Args:
        state: Current graph state.

    Returns:
        Dict with an AIMessage appended to messages.
    """
    user_id = state.get("user_id", 1)
    now_str = datetime.now(timezone.utc).isoformat()
    system_with_time = SCHEDULER_SYSTEM_PROMPT + f"\n\nCurrent UTC date/time: {now_str}"

    conversation = [SystemMessage(content=system_with_time)]
    for msg in state.get("messages", [])[-10:]:
        conversation.append(msg)

    try:
        llm = get_llm(temperature=0.2, max_tokens=500)

        # CRITICAL FIX: Use bind_tools() instead of passing tools= to invoke()
        llm_with_tools = llm.bind_tools(SCHEDULER_TOOLS)

        for _ in range(5):
            response = llm_with_tools.invoke(conversation)
            if not response.tool_calls:
                return {"messages": [AIMessage(content=response.content, name="scheduler")]}
            conversation.append(response)
            for tc in response.tool_calls:
                result = _execute_tool(tc["name"], tc["args"], user_id)
                conversation.append(ToolMessage(content=result, tool_call_id=tc["id"]))

        return {"messages": [AIMessage(content="All set! Your schedule has been updated. Need anything else?", name="scheduler")]}
    except Exception as e:
        return _fallback_scheduler_handler(state, str(e))
