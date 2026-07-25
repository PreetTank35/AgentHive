"""
Seed the database with realistic demo data for "Sunrise Bakery".

Run via:  python -m backend.db.seed_data
Or automatically on first startup when the users table is empty.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from backend.core.auth import hash_password
from backend.core.database import Base, SessionLocal, engine
from backend.db.models import (
    Customer,
    Draft,
    Expense,
    FaqEntry,
    HiredAgent,
    Invoice,
    MarketplaceAgent,
    Reminder,
    SupportQuestion,
    User,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def seed() -> None:
    """Populate the database with demo data so the app looks alive on first launch.

    Creates: 1 demo user, 5 customers, 15 expenses, 3 invoices,
    5 reminders, 3 drafts, 8 support questions, 12 FAQ entries,
    and 5 marketplace agent listings.

    Side effects:
        Writes rows to every business table. Safe to call multiple times —
        skips seeding if the demo user already exists.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Idempotency: skip if demo user exists
        existing = db.query(User).filter(User.email == "demo@sunrisebakery.com").first()
        if existing:
            print("[OK] Seed data already present - skipping.")
            return

        # ── Demo user ─────────────────────────────────────────
        user = User(
            email="demo@sunrisebakery.com",
            password_hash=hash_password("demo1234"),
            business_name="Sunrise Bakery",
        )
        db.add(user)
        db.flush()  # get user.id

        # ── Customers ─────────────────────────────────────────
        customers_data = [
            {"name": "Alice Johnson", "email": "alice@example.com", "phone": "+1-555-0101"},
            {"name": "Bob Martinez", "email": "bob.m@example.com", "phone": "+1-555-0102"},
            {"name": "Carol Chen", "email": "carol.chen@example.com", "phone": "+1-555-0103"},
            {"name": "David Okafor", "email": "david.o@example.com", "phone": "+1-555-0104"},
            {"name": "Emma Williams", "email": "emma.w@example.com", "phone": "+1-555-0105"},
        ]
        customers = []
        for cd in customers_data:
            c = Customer(user_id=user.id, **cd)
            db.add(c)
            customers.append(c)
        db.flush()

        # ── Expenses ──────────────────────────────────────────
        expenses_data = [
            {"amount": 450.00, "category": "ingredients", "description": "Bulk flour order — 50lb bags × 3", "date": _now() - timedelta(days=28)},
            {"amount": 120.50, "category": "ingredients", "description": "Organic butter and eggs", "date": _now() - timedelta(days=25)},
            {"amount": 89.99, "category": "supplies", "description": "Parchment paper and cupcake liners", "date": _now() - timedelta(days=22)},
            {"amount": 1200.00, "category": "rent", "description": "Monthly shop rent — July", "date": _now() - timedelta(days=20)},
            {"amount": 215.00, "category": "utilities", "description": "Electricity bill — June", "date": _now() - timedelta(days=18)},
            {"amount": 75.00, "category": "marketing", "description": "Instagram ad campaign — sourdough promo", "date": _now() - timedelta(days=15)},
            {"amount": 340.00, "category": "ingredients", "description": "Specialty chocolate and vanilla extract", "date": _now() - timedelta(days=12)},
            {"amount": 55.00, "category": "supplies", "description": "Bakery boxes and tissue paper", "date": _now() - timedelta(days=10)},
            {"amount": 180.00, "category": "utilities", "description": "Water and gas bill", "date": _now() - timedelta(days=8)},
            {"amount": 500.00, "category": "equipment", "description": "Stand mixer repair", "date": _now() - timedelta(days=6)},
            {"amount": 95.00, "category": "marketing", "description": "Flyer printing for farmer's market", "date": _now() - timedelta(days=4)},
            {"amount": 275.00, "category": "ingredients", "description": "Fresh fruit for seasonal tarts", "date": _now() - timedelta(days=3)},
            {"amount": 60.00, "category": "supplies", "description": "Cleaning supplies", "date": _now() - timedelta(days=2)},
            {"amount": 150.00, "category": "ingredients", "description": "Flour and sugar restock", "date": _now() - timedelta(days=1)},
            {"amount": 45.00, "category": "marketing", "description": "Google My Business boost", "date": _now()},
        ]
        for ed in expenses_data:
            db.add(Expense(user_id=user.id, **ed))

        # ── Invoices ──────────────────────────────────────────
        invoices_data = [
            {
                "customer": customers[0],
                "items": json.dumps([{"item": "Wedding cake (3-tier)", "qty": 1, "price": 350}]),
                "total": 350.00,
                "status": "paid",
            },
            {
                "customer": customers[1],
                "items": json.dumps([
                    {"item": "Sourdough loaves", "qty": 20, "price": 8},
                    {"item": "Croissants", "qty": 30, "price": 4.5},
                ]),
                "total": 295.00,
                "status": "sent",
            },
            {
                "customer": customers[2],
                "items": json.dumps([{"item": "Corporate cupcake box (12pc)", "qty": 5, "price": 45}]),
                "total": 225.00,
                "status": "draft",
            },
        ]
        for inv in invoices_data:
            db.add(Invoice(
                user_id=user.id,
                customer_id=inv["customer"].id,
                items=inv["items"],
                total=inv["total"],
                status=inv["status"],
            ))

        # ── Reminders ─────────────────────────────────────────
        reminders_data = [
            {"title": "Order flour from Mill Creek", "description": "50lb bags × 5, call by 9 AM", "due_at": _now() + timedelta(days=2)},
            {"title": "Farmer's market booth setup", "description": "Table, signage, samples", "due_at": _now() + timedelta(days=4)},
            {"title": "Health inspection prep", "description": "Deep clean kitchen, check temp logs", "due_at": _now() + timedelta(days=7)},
            {"title": "Meet with wedding client", "description": "Cake tasting with Alice Johnson — bring 3 flavors", "due_at": _now() + timedelta(days=5)},
            {"title": "Pay quarterly taxes", "description": "File Q2 estimated tax payment", "due_at": _now() + timedelta(days=10)},
        ]
        for rd in reminders_data:
            db.add(Reminder(user_id=user.id, **rd))

        # ── Drafts ────────────────────────────────────────────
        drafts_data = [
            {
                "content_type": "post",
                "subject": "New Sourdough Drop 🍞",
                "body": "Fresh out of the oven! Our signature sourdough is back in stock this weekend. Limited batches — swing by Saturday morning before they're gone! #SunriseBakery #Sourdough #FreshBread",
                "status": "draft",
            },
            {
                "content_type": "email",
                "subject": "July Newsletter — Sunrise Bakery",
                "body": "Dear valued customer,\n\nHappy July! Here's what's new at Sunrise Bakery:\n\n• NEW: Summer berry tarts (limited edition)\n• Sourdough bread available every Sat & Sun\n• Catering packages for your summer events\n\nCome visit us!\n\nWarm regards,\nThe Sunrise Bakery Team",
                "status": "published",
            },
            {
                "content_type": "proposal",
                "subject": "Corporate Catering Proposal — TechCorp Q3",
                "body": "Proposal for weekly office catering:\n\n• Monday: Assorted pastries (24 pc) — $65\n• Wednesday: Sandwich platter (20 pc) — $85\n• Friday: Cookie & brownie box (30 pc) — $55\n\nWeekly total: $205\nMonthly estimate: $820\n\nIncludes delivery and setup. 10% discount for 3-month commitment.",
                "status": "draft",
            },
        ]
        for dd in drafts_data:
            db.add(Draft(user_id=user.id, **dd))

        # ── Support Questions ─────────────────────────────────
        sq_data = [
            {"question": "What are your opening hours?", "answer": "We're open Tuesday–Sunday, 7 AM – 3 PM. Closed Mondays.", "resolved": True},
            {"question": "Do you deliver?", "answer": "Yes! We deliver within a 10-mile radius for orders over $50. Delivery fee is $5.", "resolved": True},
            {"question": "Are your products nut-free?", "answer": "Our kitchen handles tree nuts and peanuts. We cannot guarantee a nut-free environment, but we label all items clearly.", "resolved": True},
            {"question": "Can I place a custom cake order?", "answer": "Absolutely! Custom cakes need at least 5 business days' notice. Contact us with your design and we'll send a quote.", "resolved": True},
            {"question": "Do you offer gluten-free options?", "answer": "Yes, we have gluten-free brownies and cookies available daily. Custom GF cakes on request.", "resolved": True},
            {"question": "What payment methods do you accept?", "answer": "We accept cash, credit/debit cards, Apple Pay, and Google Pay.", "resolved": True},
            {"question": "How do I cancel an order?", "answer": "Orders can be cancelled up to 24 hours before the scheduled pickup/delivery time for a full refund.", "resolved": True},
            {"question": "Do you cater events?", "answer": "Yes! We offer catering for events of all sizes. Minimum order is $200. Contact us for a custom menu.", "resolved": True},
        ]
        for sq in sq_data:
            db.add(SupportQuestion(user_id=user.id, **sq))

        # ── FAQ Entries (for RAG) ─────────────────────────────
        faq_data = [
            {"question": "What are Sunrise Bakery's hours?", "answer": "We are open Tuesday through Sunday, 7:00 AM to 3:00 PM. We are closed every Monday.", "category": "hours"},
            {"question": "Where is Sunrise Bakery located?", "answer": "We are located at 142 Main Street, Downtown. There is free parking behind the building.", "category": "location"},
            {"question": "Does Sunrise Bakery deliver?", "answer": "Yes, we deliver within a 10-mile radius for orders over $50. The delivery fee is $5. Orders must be placed by 2 PM for next-day delivery.", "category": "delivery"},
            {"question": "What are your most popular items?", "answer": "Our bestsellers are: sourdough bread, almond croissants, blueberry muffins, custom celebration cakes, and our seasonal fruit tarts.", "category": "products"},
            {"question": "Do you accommodate dietary restrictions?", "answer": "We offer gluten-free brownies and cookies daily. Vegan options are available on weekends. Our kitchen handles nuts, dairy, and gluten — we cannot guarantee allergen-free products but we label everything clearly.", "category": "dietary"},
            {"question": "How do I order a custom cake?", "answer": "Custom cakes require at least 5 business days' notice. Call us or visit the shop to discuss your design. Prices start at $65 for a single tier. We offer tastings by appointment.", "category": "custom orders"},
            {"question": "Do you offer catering?", "answer": "Yes! We cater events of all sizes. Minimum order is $200. We offer pastry platters, sandwich trays, dessert tables, and custom menus. Contact us for a quote.", "category": "catering"},
            {"question": "What payment methods do you accept?", "answer": "We accept cash, all major credit and debit cards, Apple Pay, Google Pay, and Venmo.", "category": "payment"},
            {"question": "Can I return or cancel an order?", "answer": "Orders can be cancelled up to 24 hours before pickup/delivery for a full refund. Due to the perishable nature of our products, we cannot accept returns on baked goods.", "category": "returns"},
            {"question": "Do you have a loyalty program?", "answer": "Yes! Our Sunrise Rewards card gives you a free item after every 10 purchases. Pick up a card in store.", "category": "rewards"},
            {"question": "Can I place a wholesale order?", "answer": "We work with restaurants, cafés, and offices on wholesale arrangements. Minimum weekly commitment is $150. Contact us for wholesale pricing.", "category": "wholesale"},
            {"question": "Do you hire / are you accepting job applications?", "answer": "We're always looking for passionate bakers and friendly counter staff. Drop off a resume in store or email us at jobs@sunrisebakery.com.", "category": "careers"},
        ]
        for faq in faq_data:
            db.add(FaqEntry(user_id=user.id, **faq))

        # ── Marketplace Agents (stretch) ──────────────────────
        marketplace_data = [
            {"name": "Inventory Tracker", "description": "Automatically tracks ingredient inventory levels, predicts reorder points, and generates purchase orders.", "creator": "SupplyChain AI Co.", "category": "operations", "pricing": "$19/mo", "icon": "📦"},
            {"name": "Social Media Manager", "description": "Schedules and auto-posts content to Instagram, Facebook, and Twitter. Analyzes engagement metrics.", "creator": "ContentBot Labs", "category": "marketing", "pricing": "$29/mo", "icon": "📱"},
            {"name": "Review Responder", "description": "Monitors Google and Yelp reviews, drafts professional responses, and flags negative reviews for urgent attention.", "creator": "RepGuard Inc.", "category": "customer service", "pricing": "$15/mo", "icon": "⭐"},
            {"name": "Tax Prep Assistant", "description": "Categorizes expenses for tax purposes, estimates quarterly tax payments, and generates year-end summaries.", "creator": "TaxBot Pro", "category": "finance", "pricing": "$39/mo", "icon": "🧾"},
            {"name": "HR & Payroll Helper", "description": "Manages employee schedules, calculates payroll, and tracks PTO. Sends pay stubs automatically.", "creator": "WorkforceAI", "category": "human resources", "pricing": "$49/mo", "icon": "👥"},
        ]
        for ma in marketplace_data:
            db.add(MarketplaceAgent(**ma))

        db.commit()
        print("[SUCCESS] Seed data created successfully - Sunrise Bakery is open for business!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
