
export type OrderBookLevel = [string, string]; // [price, quantity]

export interface OrderBookData {
  timestamp: string;
  exchange: string;
  symbol: string;
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
}

export interface InputParameters {
  exchange: string;
  spotAsset: string;
  orderType: 'market';
  quantity: number;
  volatility: number | undefined;
  feeTier: string; // e.g., "0.1%"
}

export interface OutputParameters {
  expectedSlippage: number | undefined; // Can be undefined or NaN while calculating
  expectedFees: number | undefined; // Can be undefined or NaN while calculating
  expectedMarketImpact: number;
  netCost: number | undefined; // Can be undefined or NaN while calculating
  makerTakerProportion: string;
  internalLatency: number; // in ms
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// For MarketDepthChart
export interface DepthChartDataPoint {
  price: number;
  bidVolume?: number; // Cumulative bid volume
  askVolume?: number; // Cumulative ask volume
}
