import asyncio
import time
import hmac
import json
import hashlib
import base64
import httpx
import urllib.parse

from config.settings import settings
from .ws import BayseWebSocket

class BayseClient:
    def __init__(self):
        self.PUBLIC_KEY = settings.BAYSE_PUBLIC_KEY
        self.SECRET_KEY = settings.BAYSE_PRIVATE_KEY
        self.BASE_URL = "https://relay.bayse.markets"

        self.client = httpx.AsyncClient(timeout=10)
        self.last_request_time = 0
        self.min_interval = 0.2

        # WebSocket instance
        self.ws = BayseWebSocket()

    # ─────────────────────────────
    # HELPERS
    # ─────────────────────────────

    def _get_timestamp(self):
        return str(int(time.time()))

    def _hash_body(self, body: dict):
        if not body:
            return hashlib.sha256(b"").hexdigest()
        body_str = json.dumps(body, separators=(",", ":"), sort_keys=True)
        return hashlib.sha256(body_str.encode()).hexdigest()

    def _sign_payload(self, method, path, timestamp, body_hash, use_base64=False):
        payload = f"{timestamp}.{method}.{path}.{body_hash}"
        digest = hmac.new(
            self.SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256
        ).digest()
        return base64.b64encode(digest).decode() if use_base64 else digest.hex()

    # ─────────────────────────────
    # REQUEST CORE
    # ─────────────────────────────

    async def _request(self, method: str, path: str, body: dict = None, params=None, use_base64_sig=False, retries=3):
        body = body or {}

        # Append params to path for the signature payload
        sign_path = path
        if params:
            if isinstance(params, list):
                query_string = urllib.parse.urlencode(params)
            else:
                query_string = urllib.parse.urlencode(params, doseq=True)
            sign_path = f"{path}?{query_string}"

        for attempt in range(retries):
            try:
                now = time.time()
                wait = self.min_interval - (now - self.last_request_time)
                if wait > 0:
                    await asyncio.sleep(wait)
                self.last_request_time = time.time()

                timestamp = self._get_timestamp()
                body_hash = self._hash_body(body)

                # Sign the full path INCLUDING query parameters
                signature = self._sign_payload(method, sign_path, timestamp, body_hash, use_base64_sig)

                headers = {
                    "X-API-KEY": self.PUBLIC_KEY,
                    "X-TIMESTAMP": timestamp,
                    "X-SIGNATURE": signature,
                    "Content-Type": "application/json",
                }

                response = await self.client.request(
                    method=method,
                    url=self.BASE_URL + path,
                    headers=headers,
                    params=params,
                    json=body if method != "GET" else None,
                )

                if response.status_code != 200:
                    print(f"DEBUG Error Response [{response.status_code}]: {response.text}")

                response.raise_for_status()
                return response.json()

            except Exception as e:
                if attempt == retries - 1:
                    raise Exception(f"Bayse request failed: {e}")
                await asyncio.sleep(0.5 * (attempt + 1))

    # ─────────────────────────────
    # REST ENDPOINTS
    # ─────────────────────────────

    async def get_events(self):
        return await self._request("GET", "/v1/pm/events")

    async def get_event(self, event_id):
        return await self._request("GET", f"/v1/pm/events/{event_id}")

    async def get_markets(self, event_id):
        data = await self.get_event(event_id)
        # Handle different response formats from the relay
        return data.get("markets") or data.get("data", {}).get("markets", [])

    async def find_market_id(self, preferences=["NGN", "Bitcoin", "Election"]):
        """
        Dynamically finds an active market ID.
        Strategy:
        1. Search titles for preferred keywords.
        2. Fallback to the first available event with a market.
        """
        events_data = await self.get_events()
        event_list = events_data if isinstance(events_data, list) else events_data.get('events', [])

        # Strategy 1: Match by keyword
        for pref in preferences:
            for event in event_list:
                if pref.lower() in event.get('title', '').lower():
                    markets = await self.get_markets(event.get('id'))
                    if markets:
                        market = markets[0]
                        print(f"✅ Found Market by Preference ({pref}): {market.get('title')} (ID: {market.get('id')})")
                        return market.get('id')

        # Strategy 2: Fallback to any active event
        if event_list:
            for event in event_list[:5]: # Check first 5 for speed
                markets = await self.get_markets(event.get('id'))
                if markets:
                    market = markets[0]
                    print(f"✅ Found Fallback Market: {market.get('title')} (ID: {market.get('id')})")
                    return market.get('id')

        return None

    async def get_ticker(self, market_id, outcome="YES"):
        return await self._request(
            "GET",
            f"/v1/pm/markets/{market_id}/ticker",
            params={"outcome": outcome, "currency": "NGN"}
        )

    async def get_order_books(self, outcome_ids):
        return await self._request(
            "GET",
            "/v1/pm/books",
            params=[("outcomeId[]", oid) for oid in outcome_ids] + [("currency", "NGN")]
        )

    async def place_order(self, market_id, event_id, outcome_id, amount, price):
        return await self._request(
            "POST",
            f"/v1/pm/events/{event_id}/markets/{market_id}/orders",
            body={
                "side": "BUY",
                "outcomeId": outcome_id,
                "amount": amount,
                "type": "LIMIT",
                "price": price,
                "currency": "NGN"
            },
            use_base64_sig=True
        )

    # ─────────────────────────────
    # WEBSOCKET SHORTCUTS
    # ─────────────────────────────

    async def connect_ws(self):
        await self.ws.connect()

    async def subscribe_orderbook(self, market_id):
        await self.ws.subscribe_orderbook(market_id)

    async def listen_ws(self):
        async for msg in self.ws.listen():
            yield msg

    async def close(self):
        await self.client.aclose()
        await self.ws.close()