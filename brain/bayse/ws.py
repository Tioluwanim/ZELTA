import asyncio
import json
import websockets

class BayseWebSocket:
    def __init__(self):
        self.url = "wss://socket.bayse.markets/ws/v1/markets"
        self.ws = None
        self.connected = False

    async def connect(self):
        try:
            print(f"🔌 Connecting to WS: {self.url}")
            self.ws = await websockets.connect(self.url)
            self.connected = True
            print("✅ WebSocket Connected!")
        except Exception as e:
            self.connected = False
            raise Exception(f"WebSocket connection failed: {e}")

    async def subscribe_orderbook(self, market_id, currency="NGN"):
        if not self.connected:
            raise Exception("WebSocket not connected")

        msg = {
            "type": "subscribe",
            "channel": "orderbook",
            "marketIds": [market_id],
            "currency": currency
        }
        await self.ws.send(json.dumps(msg))
        print(f"📡 Subscribed to orderbook → {market_id} ({currency})")

    async def listen(self):
        if not self.connected:
            raise Exception("WebSocket not connected")

        while True:
            try:
                msg = await self.ws.recv()
                messages = msg.split("\n")

                for m in messages:
                    if not m.strip():
                        continue
                    try:
                        data = json.loads(m)
                        if data.get("type") == "orderbook_update":
                            yield data["data"]["orderbook"]
                        elif data.get("type") in ["subscribed", "info"]:
                            print(f"ℹ️ WS System: {data}")
                    except json.JSONDecodeError:
                        print(f"⚠️ WS Decode Error: {m}")

            except websockets.ConnectionClosed:
                print("❌ WebSocket connection closed")
                self.connected = False
                break
            except Exception as e:
                print(f"⚠️ WS Stream Error: {e}")
                await asyncio.sleep(1)

    async def close(self):
        if self.ws:
            await self.ws.close()
            self.connected = False
            print("🔌 WebSocket closed")