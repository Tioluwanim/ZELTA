"""Local integration harness (not for deployment): fake auth and Firestore data, but the real routes and the real AI service."""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "zelta_ai"))
os.environ.update(INTERNAL_API_KEY="k", APP_ENV="production")
import uvicorn
from fastapi import FastAPI
import api.compute as compute
app = FastAPI(); app.include_router(compute.router)
uvicorn.run(app, host="127.0.0.1", port=8101, log_level="warning")
