import asyncio
from brain.bayse.client import BayseClient


async def test_websocket():
    client = BayseClient()
    try:
        print("\n🚀 Testing ZELTA Bayse WebSocket...\n")

        # For the test, we need a valid market ID.
        # Replace this with the market_id you got from test_rest.py
        test_market_id = "741de6e7-4362-40f2-990a-da7e0c95fb66"  # The Atiku Abubakar market from your previous logs

        await client.connect_ws()
        await client.subscribe_orderbook(test_market_id)

        print(f"⏳ Listening for live updates on {test_market_id} for 15 seconds...\n")

        # Listen for updates with a timeout so the test doesn't run forever
        async def listen_task():
            count = 0
            async for update in client.listen_ws():
                print(f"\n📈 Live Orderbook Update #{count + 1}:")
                print(update)
                count += 1
                if count >= 3:  # Exit after 3 updates
                    break

        await asyncio.wait_for(listen_task(), timeout=15.0)

    except asyncio.TimeoutError:
        print("\n⏱️ Test finished. No more updates in the last 15 seconds.")
    except Exception as e:
        print(f"\n❌ WS Test Error: {e}")
    finally:
        await client.close()
        print("🏁 WS Test complete.")


if __name__ == "__main__":
    asyncio.run(test_websocket())