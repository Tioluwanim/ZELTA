import asyncio
from brain.bayse.client import BayseClient


def extract_list(response):
    if not response: return []
    if isinstance(response, list): return response
    if isinstance(response, dict):
        return response.get("data") or response.get("events") or response.get("markets") or []
    return []


async def test_rest():
    client = BayseClient()
    try:
        print("\n🚀 Starting ZELTA Liquidity Scanner...\n")

        events = await client.get_events()
        event_list = extract_list(events)
        print(f"🔥 Found {len(event_list)} events. Hunting for an active market...")

        active_market = None
        active_outcomes = []
        active_books = []

        # Scan the first 30 events looking for liquidity
        for e in event_list[:30]:
            event_id = e.get("id")
            markets = await client.get_markets(event_id)
            market_list = extract_list(markets)

            for m in market_list:
                market_id = m.get("id")
                out1 = m.get("outcome1Id")
                out2 = m.get("outcome2Id")

                if not out1 or not out2:
                    continue

                # Check the order book quietly
                try:
                    books = await client.get_order_books([out1, out2])
                    # If the book is NOT empty, we found our golden market!
                    if books and len(books) > 0:
                        active_market = m
                        active_outcomes = [out1, out2]
                        active_books = books
                        break  # Break out of inner loop
                except Exception:
                    pass  # Ignore 404s or 400s during scanning

            if active_market:
                break  # Break out of outer loop

        if not active_market:
            print("\n⚠️ Scanned 30 events, but all of them are completely empty (no trades).")
            print("Try running the script later when the market is active.")
            return

        print("\n✅ ACTIVE MARKET FOUND!")
        print(f"📌 Event: {e.get('title')}")
        print(f"🎯 Market: {active_market.get('title') or active_market.get('name')}")
        print(f"🆔 Market ID: {active_market.get('id')}\n")

        # Now test the Ticker on this active market
        print("⚡ Requesting NGN Ticker...")
        try:
            ticker = await client.get_ticker(active_market.get("id"), outcome="YES")
            print("✅ Ticker Success:")
            print(ticker)
        except Exception as err:
            print(f"⚠️ Ticker failed (Might still be too illiquid for a ticker): {err}")

        print("\n📚 Order Book Data:")
        for book in active_books:
            oid = book.get("outcomeId")
            bids = len(book.get("bids", []))
            asks = len(book.get("asks", []))
            print(f"Outcome {oid} -> Bids: {bids}, Asks: {asks}")

            # Print the top bid if it exists
            if bids > 0:
                top_bid = book["bids"][0]
                print(f"   💰 Top Bid: {top_bid.get('amount')} contracts @ ₦{top_bid.get('price')}")

    finally:
        await client.close()
        print("\n🏁 Scanner complete.")


if __name__ == "__main__":
    asyncio.run(test_rest())