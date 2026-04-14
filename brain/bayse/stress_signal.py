# bayse/stress_signal.py
import asyncio
from .ws import BayseWebSocket


class LiveStressMonitor:
    def __init__(self):
        self.ws = BayseWebSocket()
        self.current_signal = {
            "score": 0.0,
            "status": "INITIALIZING",
            "price": 0.0,
            "spread": 0.0
        }
        self.market_id = "757dbec9-ee80-4e2b-ada0-8bb578171c1f"  # Active Bitcoin Market

    def calculate_stress(self, orderbook):
        """
        Instant calculation logic for the ZELTA Index
        """
        try:
            bids = orderbook.get('bids', [])
            asks = orderbook.get('asks', [])

            if not bids or not asks:
                return

            best_bid = bids[0]['price']
            best_ask = asks[0]['price']
            spread = best_ask - best_bid
            mid_price = (best_bid + best_ask) / 2

            # 1. Spread Stress: 0.05 spread = 50% stress
            spread_factor = min(spread * 10, 1.0)

            # 2. Imbalance Stress: Are sellers overwhelming buyers?
            bid_vol = sum(b['amount'] for b in bids[:5])
            ask_vol = sum(a['amount'] for a in asks[:5])
            imbalance = ask_volume / (bid_volume + ask_volume) if (bid_vol + ask_vol) > 0 else 0.5

            # Final Score (0-100)
            score = (spread_factor * 0.7 + imbalance * 0.3) * 100

            self.current_signal = {
                "score": round(score, 2),
                "status": "CRITICAL" if score > 75 else "STABLE",
                "price": round(mid_price, 4),
                "spread": round(spread, 4)
            }
        except Exception as e:
            print(f"⚠️ Calculation Error: {e}")

    async def start(self):
        """
        Background task to keep the signal updated
        """
        await self.ws.connect()
        await self.ws.subscribe_orderbook(self.market_id)

        async for orderbook in self.ws.listen():
            self.calculate_stress(orderbook)


# Create a singleton instance to be shared across the app
monitor = LiveStressMonitor()