"""
ZELTA Demo Seed Script
Loads a realistic OAU student account for hackathon presentation.
Run: python seed_demo.py --uid <firebase_uid>

Creates:
  - Wallet with ₦45,000 balance (realistic student wallet)
  - 15 recent transactions (income + expenses, triggers intercept)
  - 2 savings goals (hostel fee, emergency fund)
  - Student profile with exam dates (activates λt modifier)
  - 3 gig board entries
"""
import asyncio
import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone

# ── allow running from repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

import firebase_admin
from firebase_admin import credentials, firestore

SEED_TRANSACTIONS = [
    {"type": "income",  "amount": 30000, "category": "parent_transfer",  "description": "Money from Dad",           "days_ago": 14},
    {"type": "income",  "amount": 15000, "category": "bursary",           "description": "OAU Bursary",              "days_ago": 10},
    {"type": "income",  "amount": 12000, "category": "side_hustle",       "description": "Freelance design job",     "days_ago": 5},
    {"type": "expense", "amount": 1500,  "category": "food",              "description": "Bukka food",               "days_ago": 1},
    {"type": "expense", "amount": 2500,  "category": "data",              "description": "Airtel 5GB bundle",        "days_ago": 2},
    {"type": "expense", "amount": 800,   "category": "transport",         "description": "Okada to Faculty",         "days_ago": 1},
    {"type": "expense", "amount": 3000,  "category": "entertainment",     "description": "Party contribution",       "days_ago": 3},
    {"type": "expense", "amount": 1200,  "category": "food",              "description": "Suya night run",           "days_ago": 2},
    {"type": "expense", "amount": 500,   "category": "utilities",         "description": "Sachet water",             "days_ago": 1},
    {"type": "expense", "amount": 800,   "category": "education",         "description": "Photocopying",             "days_ago": 4},
    {"type": "expense", "amount": 1000,  "category": "food",              "description": "Canteen lunch",            "days_ago": 0},
    {"type": "expense", "amount": 2000,  "category": "entertainment",     "description": "Netflix split",            "days_ago": 5},
    {"type": "expense", "amount": 400,   "category": "transport",         "description": "Bolt ride",                "days_ago": 2},
    {"type": "expense", "amount": 1500,  "category": "food",              "description": "Faculty canteen lunch",    "days_ago": 3},
    {"type": "expense", "amount": 600,   "category": "data",              "description": "Airtime recharge",         "days_ago": 1},
]

SEED_GOALS = [
    {
        "label": "Hostel Fee",
        "amount": 15000,
        "description": "Saving for next semester hostel",
        "unlock_date": (datetime.now(timezone.utc) + timedelta(days=45)).isoformat(),
    },
    {
        "label": "Emergency Fund",
        "amount": 3500,
        "description": "Buffer for unexpected expenses",
        "unlock_date": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
    },
]

SEED_GIGS = [
    {
        "id": "seed_gig_001",
        "task": "Debug Python code",
        "location": "University Library",
        "payout": 15000,
        "payout_raw": "15k",
        "time_estimate": "2-3 hours",
        "skills_required": ["Python", "Debugging"],
        "status": "OPEN",
        "raw_text": "Need someone to debug my Python code at the library. Payout is 15k",
        "extracted_at": (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat(),
        "poster": "CS WhatsApp Group",
    },
    {
        "id": "seed_gig_002",
        "task": "Design social media flyers for my business",
        "location": "Remote / Online",
        "payout": 8000,
        "payout_raw": "8000 naira",
        "time_estimate": "1 day",
        "skills_required": ["Canva", "Graphic Design"],
        "status": "OPEN",
        "raw_text": "Looking for a graphic designer to make flyers for my business. 8000 naira. DM me.",
        "extracted_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
        "poster": "Level 300 Group",
    },
    {
        "id": "seed_gig_003",
        "task": "Help move items from SUB to New Hostel",
        "location": "SUB → New Hostel",
        "payout": 5000,
        "payout_raw": "5000",
        "time_estimate": "1-2 hours",
        "skills_required": ["Physical help"],
        "status": "CLAIMED",
        "raw_text": "Anyone who can help me move stuff today? Paying 5000.",
        "extracted_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
        "poster": "Final Year WhatsApp",
    },
]

SEED_PROFILE = {
    "name": "Demo Student",
    "university": "Obafemi Awolowo University",
    "department": "Computer Science",
    "level": "300",
    "financial": {
        "monthly_budget": 45000,
        "risk_tolerance": "moderate",
        "capital_range": "₦10,000 - ₦50,000",
        "monthly_income": 15000,
        "next_exam_date": (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%d"),
        "semester_start_date": (datetime.now(timezone.utc) - timedelta(days=60)).strftime("%Y-%m-%d"),
        "semester_length_days": 120,
        "fee_obligations": [
            {
                "label": "Hostel Fee",
                "amount": 58500,
                "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            }
        ],
    },
    "preferences": {
        "currency": "NGN",
        "language": "en",
        "stress_alert_threshold": 60,
        "auto_lock_on_crisis": True,
        "show_bayse_prices": True,
        "plain_english_mode": True,
        "primary_goal": "Build Emergency Fund",
        "decision_aggressiveness": 40,
        "stress_sensitivity": 65,
    },
    "notifications": {
        "stress_alerts": True,
        "weekly_bq_report": True,
        "decision_reminders": True,
        "bayse_spike_alerts": False,
        "frequency": "daily",
    },
}


def seed(uid: str, db: firestore.Client):
    print(f"\n🌱 Seeding demo data for uid: {uid}")

    # ── Profile ────────────────────────────────────────────────────
    print("  → Writing profile...")
    db.collection("profiles").document(uid).set({
        **SEED_PROFILE,
        "uid": uid,
        "email": "demo@zelta.app",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })

    # ── Wallet ─────────────────────────────────────────────────────
    print("  → Writing wallet...")
    total_income = sum(t["amount"] for t in SEED_TRANSACTIONS if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in SEED_TRANSACTIONS if t["type"] == "expense")
    locked = sum(g["amount"] for g in SEED_GOALS)

    db.collection("wallets").document(uid).set({
        "uid": uid,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "locked_amount": locked,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })

    # ── Transactions ───────────────────────────────────────────────
    print("  → Writing transactions...")
    import uuid
    tx_ref = db.collection("wallets").document(uid).collection("transactions")
    for tx in SEED_TRANSACTIONS:
        tx_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc) - timedelta(days=tx["days_ago"], hours=tx.get("hours_ago", 0))
        tx_ref.document(tx_id).set({
            "id": tx_id,
            "type": tx["type"],
            "amount": tx["amount"],
            "category": tx["category"],
            "description": tx.get("description", ""),
            "created_at": created_at,
            "balance_after": total_income - total_expenses,  # simplified
        })

    # ── Savings goals ──────────────────────────────────────────────
    print("  → Writing savings goals...")
    goals_ref = db.collection("wallets").document(uid).collection("savings_goals")
    for goal in SEED_GOALS:
        goal_id = str(uuid.uuid4())
        goals_ref.document(goal_id).set({
            "id": goal_id,
            **goal,
            "created_at": datetime.now(timezone.utc),
            "is_active": True,
        })

    # ── Gig board ──────────────────────────────────────────────────
    print("  → Writing gig board entries...")
    for gig in SEED_GIGS:
        db.collection("gig_board").document(gig["id"]).set({
            **gig,
            "extracted_by_uid": uid,
        })

    print(f"\n✅ Seed complete!")
    print(f"   Balance:   ₦{total_income - total_expenses - locked:,.0f} free cash")
    print(f"   Runway:    ~14 days (triggers intercept at demo spend)")
    print(f"   Exam in:   14 days (λt = {1 - 14/120:.3f} — Kelly reduced)")
    print(f"   Gigs:      {len(SEED_GIGS)} on board ({sum(1 for g in SEED_GIGS if g['status'] == 'OPEN')} open)")
    print(f"\n   Demo login: use dev_auth /api/dev/token?uid={uid}")


def main():
    parser = argparse.ArgumentParser(description="Seed ZELTA demo data")
    parser.add_argument("--uid", required=True, help="Firebase UID to seed")
    parser.add_argument("--service-account", default=None, help="Path to Firebase service account JSON")
    args = parser.parse_args()

    # Init Firebase
    sa = args.service_account or os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
    if not firebase_admin._apps:
        if sa and os.path.exists(sa):
            cred = credentials.Certificate(sa)
        else:
            cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    seed(args.uid, db)


if __name__ == "__main__":
    main()