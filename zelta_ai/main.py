import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router, public_router
from api.twin import router as twin_router
from brain.bayse.stress_signal import monitor

DEBUG = os.getenv("DEBUG", "false").lower() == "true"   # secure by default (was "true")
PORT = int(os.getenv("PORT", "8080"))


# ── LIFESPAN ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[ZELTA Brain] Starting up...")

    # Warmup fetch once so /api/stress has useful data immediately.
    try:
        await monitor.fetch_once()
    except Exception as e:
        print(f"[ZELTA Brain] Warmup fetch failed: {e}")

    stop_event = asyncio.Event()

    async def monitor_loop():
        """
        Run the Bayse monitor continuously in the background.
        If a cycle crashes, log it and retry after a short delay.
        """
        while not stop_event.is_set():
            try:
                await monitor.fetch_once()
            except Exception as e:
                print(f"[ZELTA Brain] Monitor error: {e}")

            try:
                await asyncio.wait_for(stop_event.wait(), timeout=60)
            except asyncio.TimeoutError:
                pass

    task = asyncio.create_task(monitor_loop())
    print("[ZELTA Brain] Ready.")

    try:
        yield
    finally:
        print("[ZELTA Brain] Shutting down...")
        stop_event.set()
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        print("[ZELTA Brain] Monitor stopped.")


# ── APP ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ZELTA AI Brain",
    description="Behavioral Quantitative Financial Intelligence",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if DEBUG else None,
    redoc_url=None,
)


# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── ROUTES ────────────────────────────────────────────────────────────────────
app.include_router(router)         # /brain/*
app.include_router(public_router)  # /api/*
app.include_router(twin_router)    # /brain/v1/twin (unconfigured data source => 503 until wired)


# ── ROOT ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    signal = monitor.get_signal()

    return {
        "service": "ZELTA AI Brain",
        "status": "running",
        "version": "1.0.0",
        "bayse_connected": True,
        "stress_score": signal.get("score", 50),
        "stress_level": signal.get("status", "UNKNOWN"),
    }


# ── DEV ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=DEBUG,
    )