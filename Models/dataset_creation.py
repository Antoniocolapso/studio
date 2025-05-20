import collections, asyncio, websockets, json, traceback, random
import pandas as pd

data_log = []
mid_prices = collections.deque(maxlen=20)  # store last 20 mid_prices for volatility

def label_is_taker(order_price, best_bid, best_ask, side):
    # side: "buy" or "sell"
    if side == "buy":
        return int(order_price >= best_ask)  # buy crossing ask = taker
    else:
        return int(order_price <= best_bid)  # sell crossing bid = taker

async def collect_data():
    uri = "wss://ws.gomarket-cpp.goquant.io/ws/l2-orderbook/okx/BTC-USDT-SWAP"
    while True:
        try:
            async with websockets.connect(uri, ping_interval=20, ping_timeout=10) as websocket:
                while True:
                    try:
                        message = await websocket.recv()
                        snapshot = json.loads(message)

                        # Custom timestamp (simple UTC timestamp string)
                        from time import time
                        timestamp = str(int(time()))

                        asks = snapshot.get('asks', [])
                        bids = snapshot.get('bids', [])

                        if not asks or not bids:
                            continue

                        best_ask = float(asks[0][0])
                        best_ask_size = float(asks[0][1])
                        best_bid = float(bids[0][0])
                        best_bid_size = float(bids[0][1])

                        spread = best_ask - best_bid
                        mid_price = (best_ask + best_bid) / 2

                        mid_prices.append(mid_price)
                        if len(mid_prices) >= 2:
                            volatility = pd.Series(mid_prices).std()
                        else:
                            volatility = 0.0

                        # Simulate a trade side and price near best bid/ask
                        side = random.choice(["buy", "sell"])
                        # Price offset slightly aggressive or passive (random within spread)
                        price_offset = random.uniform(-0.5, 0.5)

                        if side == "buy":
                            sim_price = best_ask + price_offset
                        else:
                            sim_price = best_bid + price_offset

                        is_taker = label_is_taker(sim_price, best_bid, best_ask, side)

                        data_log.append({
                            "timestamp": timestamp,
                            "best_ask": best_ask,
                            "best_bid": best_bid,
                            "spread": spread,
                            "mid_price": mid_price,
                            "order_size": best_ask_size,
                            "volatility": volatility,
                            "sim_price": sim_price,
                            "side": side,
                            "is_taker": is_taker
                        })

                        if len(data_log) % 500 == 0:
                            pd.DataFrame(data_log).to_csv("realtime_orderbook.csv", index=False)
                            print(f"{len(data_log)} ticks saved")

                    except websockets.exceptions.ConnectionClosed as e:
                        print(f"WebSocket closed: {e.code} - {e.reason}")
                        break
                    except Exception:
                        print("Error in message processing:")
                        traceback.print_exc()
                        continue
        except Exception as e:
            print(f"Reconnecting in 5 seconds due to error: {e}")
            await asyncio.sleep(5)


async def main():
    while True:
        try:
            await collect_data()
        except Exception as e:
            print("Reconnecting in 5 seconds due to error...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())
