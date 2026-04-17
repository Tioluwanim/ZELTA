import asyncio
import json
import websockets


class BayseWebSocket:
    def __init__(self):
        # Docs confirmed: wss://socket.bayse.markets/ws/v1/markets
        self.url = "wss://socket.bayse.markets/ws/v1/markets"
        self.ws = None
        self.connected = False
        self._subscriptions = []  # Remember subs for reconnection

    async def connect(self):
        try:
            print(f"🔌 Connecting to Bayse WS: {self.url}")
            self.ws = await websockets.connect(self.url)
            self.connected = True
            print("✅ Bayse WebSocket connected")
        except Exception as e:
            self.connected = False
            raise Exception(f"WebSocket connection failed: {e}")

    async def subscribe_orderbook(self, market_id: str, currency: str = "NGN"):
        """
        Docs say: channel='orderbook', marketIds=[...], currency='NGN'
        """
        if not self.connected:
            raise Exception("WebSocket not connected. Call connect() first.")

        msg = {
            "type": "subscribe",
            "channel": "orderbook",
            "marketIds": [market_id],
            "currency": currency,
        }
        await self.ws.send(json.dumps(msg))

        # Remember for auto-reconnect
        self._subscriptions.append(msg)
        print(f"📡 Subscribed: orderbook → {market_id} ({currency})")

    async def subscribe_prices(self, event_id: str):
        """Subscribe to price updates for a full event"""
        if not self.connected:
            raise Exception("WebSocket not connected.")

        msg = {
            "type": "subscribe",
            "channel": "prices",
            "eventId": event_id,
        }
        await self.ws.send(json.dumps(msg))
        self._subscriptions.append(msg)
        print(f"📡 Subscribed: prices → event {event_id}")

    async def _reconnect(self):
        """Auto-reconnect and re-subscribe after disconnection"""
        print("🔄 Reconnecting to Bayse WebSocket...")
        self.connected = False
        await asyncio.sleep(3)
        try:
            await self.connect()
            # Re-subscribe to all previous channels
            for sub in self._subscriptions:
                await self.ws.send(json.dumps(sub))
                print(f"📡 Re-subscribed: {sub.get('channel')}")
        except Exception as e:
            print(f"❌ Reconnection failed: {e}")

    async def listen(self):
        """
        Yields orderbook dicts from Bayse WebSocket.
        Docs confirmed: data is in data.orderbook for orderbook_update events.
        Server may batch messages separated by newlines.
        """
        if not self.connected:
            raise Exception("WebSocket not connected.")

        while True:
            try:
                raw = await self.ws.recv()

                # Docs: server may batch multiple JSON messages with \n
                messages = raw.split("\n")
                for m in messages:
                    if not m.strip():
                        continue
                    try:
                        data = json.loads(m)
                        msg_type = data.get("type")

                        if msg_type == "orderbook_update":
                            # Docs confirmed: data.orderbook is the nested object
                            orderbook = data.get("data", {}).get("orderbook", {})
                            if orderbook:
                                yield orderbook

                        elif msg_type == "price_update":
                            # Can use for future price signal layer
                            print(f"💹 Price update: {data.get('data', {}).get('title', '')}")

                        elif msg_type in ("subscribed", "info", "pong"):
                            print(f"ℹ️ WS system: {data}")

                        elif msg_type == "error":
                            print(f"❌ WS error from Bayse: {data}")

                    except json.JSONDecodeError:
                        print(f"⚠️ Could not parse WS message: {m[:100]}")

            except websockets.ConnectionClosed:
                print("❌ Bayse WebSocket disconnected")
                await self._reconnect()

            except Exception as e:
                print(f"⚠️ WS stream error: {e}")
                await asyncio.sleep(1)

    async def close(self):
        if self.ws:
            await self.ws.close()
            self.connected = False
            print("🔌 Bayse WebSocket closed")
