"""
Finance Agent — logs expenses, creates invoices, summarises spending.

Makes real Claude API calls via OpenRouter with tool-use for DB operations.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from backend.core.llm import get_llm
from backend.core.database import SessionLocal
from backend.db.models import Customer, Expense, Invoice
from backend.orchestration.state import AgentState
from backend.integrations.payments import create_payment_link

logger = logging.getLogger("agenthive.agents.finance")

FINANCE_SYSTEM_PROMPT = """You are the Finance Agent for Sunrise Bakery, a small bakery business.
You help the owner manage expenses, create invoices, and understand their finances.

You have the following tools available. ALWAYS use them when the user asks to log, create, list, or summarise financial data.
Be friendly, professional, and concise. After performing an action, confirm what you did.
If the user's message is ambiguous about the amount, category, or description, make a reasonable assumption and state it clearly.

Common expense categories: ingredients, supplies, rent, utilities, marketing, equipment, wages, other.
"""

# ── Tool definitions (OpenAI function-calling format) ────────

FINANCE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "log_expense",
            "description": "Log a new business expense to the database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {"type": "number", "description": "Expense amount in dollars"},
                    "category": {"type": "string", "description": "Category: ingredients, supplies, rent, utilities, marketing, equipment, wages, other"},
                    "description": {"type": "string", "description": "Brief description of the expense"},
                },
                "required": ["amount", "category", "description"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_expenses",
            "description": "List recent business expenses. Returns expenses from the last N days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Number of days to look back (default 30)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_invoice",
            "description": "Create a new invoice for a customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string", "description": "Name of the customer"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "item": {"type": "string"},
                                "qty": {"type": "integer"},
                                "price": {"type": "number"},
                            },
                        },
                        "description": "List of line items",
                    },
                },
                "required": ["customer_name", "items"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_expense_summary",
            "description": "Get a summary of expenses grouped by category for a given period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Number of days to summarise (default 30)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_payment_link",
            "description": "Create a real, shareable Razorpay payment link so a customer can actually pay an invoice via UPI/card. Use this when the user wants to collect payment, not just record an invoice.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount_rupees": {"type": "number", "description": "Amount to charge, in rupees"},
                    "description": {"type": "string", "description": "What the payment is for"},
                    "customer_name": {"type": "string", "description": "Customer's name"},
                    "customer_phone": {"type": "string", "description": "Customer's phone number, international format, optional"},
                },
                "required": ["amount_rupees", "description", "customer_name"],
            },
        },
    },
]


# ── Tool implementations ─────────────────────────────────────

def _log_expense(user_id: int, amount: float, category: str, description: str) -> str:
    """Insert a new expense record into the database.

    Args:
        user_id: The owning user's ID.
        amount: Dollar amount.
        category: Expense category.
        description: Free-text description.

    Returns:
        Confirmation string with the expense details.
    """
    db = SessionLocal()
    try:
        expense = Expense(
            user_id=user_id,
            amount=amount,
            category=category.lower().strip(),
            description=description,
            date=datetime.now(timezone.utc),
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)
        return json.dumps({
            "status": "success",
            "expense_id": expense.id,
            "amount": amount,
            "category": category,
            "description": description,
        })
    except Exception as e:
        db.rollback()
        return json.dumps({"status": "error", "message": str(e)})
    finally:
        db.close()


def _list_expenses(user_id: int, days: int = 30) -> str:
    """Query recent expenses from the database.

    Args:
        user_id: The owning user's ID.
        days: Number of past days to include.

    Returns:
        JSON string listing expenses.
    """
    db = SessionLocal()
    try:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        expenses = (
            db.query(Expense)
            .filter(Expense.user_id == user_id, Expense.date >= since)
            .order_by(Expense.date.desc())
            .all()
        )
        result = [
            {
                "id": e.id,
                "amount": e.amount,
                "category": e.category,
                "description": e.description,
                "date": e.date.isoformat() if e.date else None,
            }
            for e in expenses
        ]
        return json.dumps({"expenses": result, "total": sum(e.amount for e in expenses), "count": len(result)})
    finally:
        db.close()


def _create_invoice(user_id: int, customer_name: str, items: list[dict[str, Any]]) -> str:
    """Create a new invoice record in the database.

    Args:
        user_id: The owning user's ID.
        customer_name: Name of the customer to invoice.
        items: List of line items with item, qty, price.

    Returns:
        JSON string with invoice details.
    """
    db = SessionLocal()
    try:
        customer = (
            db.query(Customer)
            .filter(Customer.user_id == user_id, Customer.name.ilike(f"%{customer_name}%"))
            .first()
        )
        total = sum(i.get("qty", 1) * i.get("price", 0) for i in items)
        invoice = Invoice(
            user_id=user_id,
            customer_id=customer.id if customer else None,
            items=json.dumps(items),
            total=total,
            status="draft",
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        return json.dumps({
            "status": "success",
            "invoice_id": invoice.id,
            "customer": customer_name,
            "total": total,
            "item_count": len(items),
        })
    except Exception as e:
        db.rollback()
        return json.dumps({"status": "error", "message": str(e)})
    finally:
        db.close()


def _get_expense_summary(user_id: int, days: int = 30) -> str:
    """Aggregate expenses by category over a given period.

    Args:
        user_id: The owning user's ID.
        days: Number of past days to include.

    Returns:
        JSON string with per-category totals and grand total.
    """
    db = SessionLocal()
    try:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        expenses = (
            db.query(Expense)
            .filter(Expense.user_id == user_id, Expense.date >= since)
            .all()
        )
        by_cat: dict[str, float] = {}
        for e in expenses:
            by_cat[e.category] = by_cat.get(e.category, 0) + e.amount
        grand_total = sum(by_cat.values())
        return json.dumps({
            "period_days": days,
            "by_category": by_cat,
            "grand_total": grand_total,
            "expense_count": len(expenses),
        })
    finally:
        db.close()


# ── Tool dispatcher ──────────────────────────────────────────

def _create_payment_link(user_id: int, amount_rupees: float, description: str, customer_name: str, customer_phone: str = "") -> str:
    """Wrapper so the Razorpay integration fits the same tool-call pattern as the DB tools.

    Args:
        user_id: The owning user's ID (unused here, kept for signature consistency with other tools).
        amount_rupees: Amount to charge, in rupees.
        description: What the payment is for.
        customer_name: Customer's name.
        customer_phone: Optional phone number.

    Returns:
        JSON string with the result from the Razorpay API call.
    """
    result = create_payment_link(
        amount_rupees=amount_rupees,
        description=description,
        customer_name=customer_name,
        customer_phone=customer_phone,
    )
    return json.dumps(result)


TOOL_MAP = {
    "log_expense": _log_expense,
    "list_expenses": _list_expenses,
    "create_invoice": _create_invoice,
    "get_expense_summary": _get_expense_summary,
    "create_payment_link": _create_payment_link,
}


def _execute_tool(tool_name: str, args: dict[str, Any], user_id: int) -> str:
    """Execute a tool by name with the given arguments.

    Args:
        tool_name: Name of the tool function.
        args: Arguments dict from the LLM tool call.
        user_id: Current user's DB ID (injected into all tool calls).

    Returns:
        JSON result string from the tool.
    """
    fn = TOOL_MAP.get(tool_name)
    if fn is None:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})
    return fn(user_id=user_id, **args)


def _fallback_finance_handler(state: AgentState, error_msg: str = "") -> dict:
    """Deterministic rule-based fallback handler when LLM API fails."""
    import re
    user_id = state.get("user_id", 1)
    user_text = state["messages"][-1].content if state.get("messages") else ""
    lower = user_text.lower()

    logger.warning("Finance LLM call failed (%s) — running deterministic rule-based fallback", error_msg)

    # 1. Log expense intent
    amount_match = re.search(r"\$(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:dollars?|usd)", lower)
    if amount_match or any(k in lower for k in ["log", "spent", "bought", "cost", "paid", "expense"]):
        amount = float(amount_match.group(1) or amount_match.group(2)) if amount_match else 25.0
        
        category = "other"
        categories = ["ingredients", "supplies", "rent", "utilities", "marketing", "equipment", "wages"]
        for cat in categories:
            if cat in lower:
                category = cat
                break
        if category == "other":
            if any(k in lower for k in ["flour", "butter", "sugar", "milk", "egg", "yeast", "fruit", "berry", "chocolate", "coffee"]):
                category = "ingredients"
            elif any(k in lower for k in ["box", "bag", "paper", "packaging", "towel", "soap", "clean"]):
                category = "supplies"
            elif any(k in lower for k in ["ad", "flyer", "social", "promo"]):
                category = "marketing"

        # Extract description or use full text
        clean_desc = re.sub(r"log\s+(?:a\s+)?", "", user_text, flags=re.IGNORECASE).strip()
        result_json = _log_expense(user_id=user_id, amount=amount, category=category, description=clean_desc)
        return {
            "messages": [AIMessage(content=f"✅ **Expense Logged Successfully!**\n\n- **Amount:** ${amount:.2f}\n- **Category:** {category.capitalize()}\n- **Description:** {clean_desc}\n\n*Note: Logged via Finance Agent fallback engine.*", name="finance")],
        }

    # 2. List expenses intent
    if any(k in lower for k in ["list", "show", "recent", "view", "history", "all"]):
        res_raw = _list_expenses(user_id=user_id, days=30)
        data = json.loads(res_raw)
        expenses = data.get("expenses", [])
        if not expenses:
            msg = "No recent expenses found in the last 30 days."
        else:
            lines = [f"📊 **Recent Expenses (Last 30 Days):**\n"]
            for e in expenses[:10]:
                lines.append(f"• **${e['amount']:.2f}** — {e['description']} (*{e['category']}*)")
            msg = "\n".join(lines)
        return {"messages": [AIMessage(content=msg, name="finance")]}

    # 3. Expense summary / report intent
    res_raw = _get_expense_summary(user_id=user_id, days=30)
    data = json.loads(res_raw)
    total = data.get("grand_total", 0.0)
    cats = data.get("categories", {})
    lines = [f"💰 **Financial Overview (Last 30 Days):**\n", f"**Total Spending:** ${total:.2f}\n", "**Breakdown by Category:**"]
    for cat, amt in cats.items():
        lines.append(f"• **{cat.capitalize()}:** ${amt:.2f}")
    return {"messages": [AIMessage(content="\n".join(lines), name="finance")]}


# ── LangGraph node ───────────────────────────────────────────

def finance_node(state: AgentState) -> dict:
    """Finance specialist agent node for the LangGraph.

    Runs a tool-calling loop: sends the user message + tools to Claude,
    executes any requested tools, feeds results back, repeats until
    the LLM produces a final text response.

    Args:
        state: Current graph state.

    Returns:
        Dict with an AIMessage appended to messages.
    """
    user_id = state.get("user_id", 1)
    conversation = [SystemMessage(content=FINANCE_SYSTEM_PROMPT)]

    # Carry over recent messages for context (last 10)
    for msg in state.get("messages", [])[-10:]:
        conversation.append(msg)

    try:
        llm = get_llm(temperature=0.3)

        # Tool-calling loop (max 5 iterations to prevent runaway)
        for _ in range(5):
            response = llm.invoke(conversation, tools=FINANCE_TOOLS)

            if not response.tool_calls:
                # Final text response
                return {
                    "messages": [AIMessage(content=response.content, name="finance")],
                }

            # Execute each tool call
            conversation.append(response)
            for tc in response.tool_calls:
                result = _execute_tool(tc["name"], tc["args"], user_id)
                conversation.append(ToolMessage(content=result, tool_call_id=tc["id"]))

        return {
            "messages": [AIMessage(content="I've processed your financial request. Let me know if you need anything else!", name="finance")],
        }
    except Exception as e:
        return _fallback_finance_handler(state, str(e))
