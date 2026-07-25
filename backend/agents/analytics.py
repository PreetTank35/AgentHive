"""
Analytics Agent — queries the DB for real metrics, then uses Gemini
to generate actionable business insights and recommendations.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from backend.core.database import SessionLocal
from backend.db.models import Draft, Expense, Reminder, SupportQuestion
from backend.orchestration.state import AgentState

logger = logging.getLogger("agenthive.agents.analytics")

ANALYTICS_SYSTEM_PROMPT = """You are the Analytics Agent for Sunrise Bakery, a small bakery business.
You receive raw business metrics from the database and produce insightful, actionable executive reports.

Your reports should:
- Highlight key financial trends and performance
- Identify areas of concern or opportunity
- Provide specific, practical recommendations
- Use clear formatting with sections and bullet points
- Be warm and encouraging, not just dry numbers
- Use ₹ or $ depending on context, emojis to make it visually engaging

Always end with 2-3 concrete, actionable recommendations based on the actual data provided.
"""


def _get_expense_analytics(user_id: int, days: int = 30) -> dict[str, Any]:
    """Compute expense analytics for the given period."""
    db = SessionLocal()
    try:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        expenses = db.query(Expense).filter(Expense.user_id == user_id, Expense.date >= since).all()

        by_category: dict[str, float] = {}
        for e in expenses:
            by_category[e.category] = by_category.get(e.category, 0.0) + e.amount

        total = sum(by_category.values())
        top_expense = max(expenses, key=lambda x: x.amount, default=None)

        return {
            "period_days": days,
            "total_spent": round(total, 2),
            "expense_count": len(expenses),
            "by_category": {k: round(v, 2) for k, v in sorted(by_category.items(), key=lambda x: -x[1])},
            "avg_per_expense": round(total / len(expenses), 2) if expenses else 0.0,
            "top_expense": {
                "amount": top_expense.amount,
                "category": top_expense.category,
                "description": top_expense.description,
            } if top_expense else None,
        }
    finally:
        db.close()


def _get_content_analytics(user_id: int) -> dict[str, Any]:
    """Compute content draft analytics."""
    db = SessionLocal()
    try:
        drafts = db.query(Draft).filter(Draft.user_id == user_id).all()
        by_type: dict[str, int] = {}
        by_status: dict[str, int] = {}
        for d in drafts:
            by_type[d.content_type] = by_type.get(d.content_type, 0) + 1
            by_status[d.status] = by_status.get(d.status, 0) + 1
        return {
            "total_drafts": len(drafts),
            "by_type": by_type,
            "by_status": by_status,
        }
    finally:
        db.close()


def _get_support_analytics(user_id: int) -> dict[str, Any]:
    """Compute support question analytics."""
    db = SessionLocal()
    try:
        questions = db.query(SupportQuestion).filter(SupportQuestion.user_id == user_id).all()
        resolved = sum(1 for q in questions if q.resolved)
        return {
            "total_questions": len(questions),
            "resolved": resolved,
            "unresolved": len(questions) - resolved,
            "resolution_rate": round(resolved / len(questions) * 100, 1) if questions else 100.0,
        }
    finally:
        db.close()


def _get_scheduler_analytics(user_id: int) -> dict[str, Any]:
    """Compute reminder/scheduler analytics."""
    db = SessionLocal()
    try:
        reminders = db.query(Reminder).filter(Reminder.user_id == user_id).all()
        completed = sum(1 for r in reminders if r.completed)
        now = datetime.now(timezone.utc)

        def _to_utc(dt):
            if dt is None:
                return None
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

        upcoming = [r for r in reminders if not r.completed and r.due_at and _to_utc(r.due_at) > now]

        return {
            "total_reminders": len(reminders),
            "completed": completed,
            "upcoming": len(upcoming),
            "completion_rate": round(completed / len(reminders) * 100, 1) if reminders else 0.0,
            "next_due": upcoming[0].title if upcoming else "No pending items",
        }
    finally:
        db.close()


def analytics_node(state: AgentState) -> dict:
    """Analytics specialist node: gathers DB metrics and uses Gemini to generate insights."""
    from backend.core.llm import get_llm

    user_id = state.get("user_id", 1)
    user_question = state["messages"][-1].content if state.get("messages") else "Give me a business analytics report"

    # Gather all metrics from the database
    exp = _get_expense_analytics(user_id, days=30)
    cnt = _get_content_analytics(user_id)
    sup = _get_support_analytics(user_id)
    sch = _get_scheduler_analytics(user_id)

    # Format metrics as context for the LLM
    metrics_context = f"""
## Live Business Metrics for Sunrise Bakery (Last 30 Days)

### Financial Data:
- Total Expenses: ${exp['total_spent']:.2f} across {exp['expense_count']} transactions
- Average per Transaction: ${exp['avg_per_expense']:.2f}
- Spending by Category: {json.dumps(exp['by_category'], indent=2)}
- Largest Single Expense: {f"${exp['top_expense']['amount']:.2f} — {exp['top_expense']['description'] or exp['top_expense']['category']}" if exp['top_expense'] else 'No data'}

### Content & Marketing:
- Total Content Drafts: {cnt['total_drafts']}
- Drafts by Type: {json.dumps(cnt['by_type'])}
- Publish Status: {json.dumps(cnt['by_status'])}

### Operations & Scheduling:
- Total Reminders Set: {sch['total_reminders']}
- Completed Tasks: {sch['completed']} ({sch['completion_rate']}% completion rate)
- Upcoming Pending Tasks: {sch['upcoming']}
- Next Scheduled Item: {sch['next_due']}

### Customer Support:
- Total Customer Inquiries: {sup['total_questions']}
- Resolution Rate: {sup['resolution_rate']}% ({sup['resolved']} resolved, {sup['unresolved']} pending)

---
User's specific question/request: {user_question}
"""

    try:
        llm = get_llm(temperature=0.3, max_tokens=1200)
        response = llm.invoke([
            SystemMessage(content=ANALYTICS_SYSTEM_PROMPT),
            HumanMessage(content=metrics_context),
        ])
        report = response.content.strip()
        return {"messages": [AIMessage(content=report, name="analytics")]}

    except Exception as e:
        logger.error("Analytics LLM call failed: %s — falling back to structured report", e)
        # Fallback: build the report directly from DB data
        cat_lines = [f"  - **{cat.capitalize()}**: ${val:.2f}" for cat, val in exp.get("by_category", {}).items()]
        top_exp = exp.get("top_expense")
        top_desc = f"${top_exp['amount']:.2f} ({top_exp['description'] or top_exp['category']})" if top_exp else "N/A"

        report = f"""📊 **Executive Business Analytics — Sunrise Bakery**

💰 **Financial Performance (Last 30 Days):**
- **Total Expenses:** ${exp['total_spent']:.2f} across {exp['expense_count']} transactions
- **Average Per Expense:** ${exp['avg_per_expense']:.2f}
- **Top Single Expense:** {top_desc}
- **Category Breakdown:**
{chr(10).join(cat_lines) if cat_lines else "  - No expenses recorded"}

📝 **Content & Marketing Operations:**
- **Total Drafts Created:** {cnt['total_drafts']} items
- **By Type:** {json.dumps(cnt['by_type'])}
- **Status:** {cnt['by_status'].get('draft', 0)} draft, {cnt['by_status'].get('published', 0)} published

📅 **Operations & Scheduling:**
- **Total Reminders:** {sch['total_reminders']} ({sch['completion_rate']}% completion rate)
- **Upcoming Tasks:** {sch['upcoming']}
- **Next Key Task:** {sch['next_due']}

🛟 **Customer Support:**
- **Total Inquiries:** {sup['total_questions']} logged
- **Resolution Rate:** {sup['resolution_rate']}% ({sup['resolved']} resolved, {sup['unresolved']} pending)
"""
        return {"messages": [AIMessage(content=report, name="analytics")]}
