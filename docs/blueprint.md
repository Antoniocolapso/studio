# **App Name**: TradeFlow

## Core Features:

- Trade Input UI: User interface for inputting trade parameters (exchange, spot asset, order type, quantity, volatility, fee tier).
- Output Display UI: User interface for displaying output parameters (expected slippage, fees, market impact, net cost, maker/taker proportion, internal latency).
- WebSocket Connection: Connect to WebSocket endpoint wss://ws.gomarket-cpp.goquant.io/ws/l2-orderbook/okx/BTC-USDT-SWAP to receive real-time L2 order book data from OKX.
- Trade Simulation: Estimate transaction costs and market impact using configured parameters and streamed orderbook data.

## Style Guidelines:

- Primary color: Use a clean white or light gray for the background.
- Secondary color: Use a dark gray or black for text to ensure readability.
- Accent: Use a vibrant green (#00FF00) to indicate positive values, like potential profit or low slippage.
- Use a clear, two-panel layout with input parameters on the left and output parameters on the right.
- Ensure the layout is responsive and adapts to different screen sizes.