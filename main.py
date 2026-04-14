# main.py
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from brain.bayse.stress_signal import monitor
from brain.bayse.client import BayseClient

# Global state to keep track of what the "Brain" is currently looking at
state = {
    "active_market_name": "None",
    "start_time": None
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    client = BayseClient()
    print("🚀 Starting ZELTA BQ Engine...")

    # 1. Dynamically find an active market (prioritizing NGN and BTC for OAU persona)
    # This uses the new method we added to your BayseClient class
    market_id = await client.find_market_id(["NGN", "Bitcoin", "USD"])

    bg_task = None
    if market_id:
        # 2. Update the monitor with the discovered ID
        monitor.market_id = market_id

        # 3. Start the WebSocket listener as a background task
        # This keeps the stress_signal updated in real-time
        bg_task = asyncio.create_task(monitor.start())

        # Store the market ID in our state for the API to report
        state["active_market_name"] = market_id
        print(f"🎯 ZELTA is now monitoring: {market_id}")
    else:
        print("⚠️ Warning: No active markets found. ZELTA is running in standby mode.")

    yield  # --- Server is now live and handling requests ---

    # --- SHUTDOWN ---
    print("🛑 Shutting down ZELTA...")
    if bg_task:
        bg_task.cancel()
        try:
            await bg_task
        except asyncio.CancelledError:
            print("✅ Background monitor task cancelled.")

    await monitor.ws.close()
    await client.close()


app = FastAPI(
    title="ZELTA BQ Engine",
    description="Behavioral Quantitative Financial Intelligence powered by Bayse Markets",
    lifespan=lifespan
)


@app.get("/brain")
async def get_brain():
    """
    The primary intelligence endpoint for the ZELTA frontend.
    Returns the real-time behavioral stress signal.
    """
    return {
        "status": "active" if monitor.ws.connected else "disconnected",
        "monitoring": state["active_market_name"],
        "signal": monitor.current_signal
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "zelta-bq-engine"}


if __name__ == "__main__":
    import uvicorn

    # Run locally on port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)