"""Local integration harness (not for deployment): fake auth and Firestore data, but the real routes and the real AI service."""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "zelta_backend"))
os.environ.update(APP_ENV="production", INTERNAL_API_KEY="k", AI_BRAIN_URL="http://127.0.0.1:8101")
import importlib, uvicorn
from datetime import datetime, timezone, timedelta
main = importlib.import_module("main")
svc = importlib.import_module("routes.twin").svc
main.initialize_firebase = lambda: None
deps = importlib.import_module("core.dependencies")
now = datetime.now(timezone.utc)
def d(n): return now - timedelta(days=n)
txs = [{"id": f"t{i}", "type": "expense", "amount": a, "category": c, "description": c, "date": d(i)} for i, (a, c) in enumerate(
    [(1800,"food"),(2000,"data"),(900,"transport"),(2500,"food"),(0.5,"food"),(1200,"transport"),(3000,"food"),(800,"data"),(1500,"food"),(2200,"social"),(700,"transport"),(1900,"food")], 1)]
txs.append({"id": "inc", "type": "income", "amount": 45000, "category": "parent_transfer", "date": d(12)})
svc.load_inputs = lambda db, uid: ({"total_income": 45000, "total_expenses": 20000, "total_balance": 53500},
    txs, {"financial": {"fee_obligations": [{"label": "Levy", "amount": 15000, "due_date": (now + timedelta(days=7)).date().isoformat()}]}})
svc.load_gigs = lambda db, limit=30: [{"id": "g1", "task": "Print 20 copies", "location": "Gate", "payout": 4000, "status": "OPEN", "time_estimate": "2 hours"}]
main.app.dependency_overrides[deps.get_current_user] = lambda: {"uid": "u1", "email": "t@x.com", "name": "T"}
main.app.dependency_overrides[deps.get_db] = lambda: object()
from types import SimpleNamespace
wallet_r = importlib.import_module("routes.wallet"); prof_r = importlib.import_module("routes.profile")
iso = lambda n: (now - timedelta(days=n)).isoformat()
WALLET = {"total_balance": 53500, "free_cash": 31000, "locked_amount": 8000, "total_income": 45000, "total_expenses": 15040, "weekly_burn_rate": 15036,
  "savings_goals": [{"id": "g1", "label": "Laptop repair", "amount": 8000, "unlock_date": iso(-30), "created_at": iso(10), "is_active": True}],
  "recent_transactions": [{"id": "t1", "type": "expense", "amount": 1800, "category": "food", "description": "Lunch", "date": iso(0), "balance_after": 53500}],
  "spending_heat": [{"category": "food", "amount": 6800, "percentage": 45, "status": "amber"}], "bq_alerts": []}
async def fake_wallet(db, uid, stress): return WALLET
async def fake_stress(db, uid): return SimpleNamespace(stress_index=42.0, combined_index=42.0, level="MODERATE", label="Moderate", bayse_primary=None)
wallet_r.get_wallet_summary = fake_wallet; wallet_r.get_stress_only = fake_stress
PROFILE = {"uid": "u1", "email": "t@x.com", "name": "Tola", "university": "OAU", "financial": {"fee_obligations": [{"label": "Levy", "amount": 15000, "due_date": (now + timedelta(days=7)).date().isoformat()}], "income_sources": ["parent_transfer"], "monthly_income": 45000, "risk_tolerance": "low"},
  "preferences": {"currency": "NGN", "primary_goal": "Build savings", "plain_english_mode": True}, "notifications": {"stress_alerts": True, "weekly_bq_report": True, "decision_reminders": True, "frequency": "daily"}}
async def fake_profile(db, uid, user): return PROFILE
prof_r.initialize_profile_on_first_login = fake_profile
uvicorn.run(main.app, host="127.0.0.1", port=8100, log_level="warning")
