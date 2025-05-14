"use client";

import { useState, useEffect, useCallback } from 'react';
import TradeInputPanel from '@/components/trade-input-panel';
import OutputDisplayPanel from '@/components/output-display-panel';
import { useOrderbook } from '@/hooks/use-orderbook';
import type { InputParameters, OutputParameters, OrderBookData } from '@/types';
import { useToast } from "@/hooks/use-toast"; // Shadcn toast

const initialInputParams: InputParameters = {
  exchange: 'OKX',
  spotAsset: 'BTC-USDT-SWAP',
  orderType: 'market',
  quantity: 0.00167, // Approx 100 USD if 1 BTC = $60k
  volatility: undefined,
  feeTier: '0.1%', // Example fee tier
};

const initialOutputParams: OutputParameters = {
  expectedSlippage: 0,
  expectedFees: 0,
  expectedMarketImpact: 0,
  netCost: 0,
  makerTakerProportion: 'N/A',
  internalLatency: 0,
};

export default function HomePage() {
  const [inputParams, setInputParams] = useState<InputParameters>(initialInputParams);
  const [outputParams, setOutputParams] = useState<OutputParameters>(initialOutputParams);
  const { orderBook, status, error } = useOrderbook();
  const { toast } = useToast();

  const calculateOutputs = useCallback((currentOrderBook: OrderBookData | null, currentInputs: InputParameters): OutputParameters => {
    const startTime = performance.now();

    if (!currentOrderBook || currentInputs.quantity <= 0) {
      const latency = performance.now() - startTime;
      return { ...initialOutputParams, internalLatency: latency };
    }

    const { asks, bids } = currentOrderBook;
    let calculatedSlippage = 0;
    let calculatedFees = 0;
    // Simplified calculations
    // Assuming a buy order for slippage calculation
    if (asks.length > 0 && bids.length > 0) {
      const bestAskPrice = parseFloat(asks[0][0]);
      const bestBidPrice = parseFloat(bids[0][0]);
      const midPrice = (bestAskPrice + bestBidPrice) / 2;
      
      // Simplified slippage for a market buy: (execution price - mid price) * quantity
      // Assume execution at best ask for this small quantity
      calculatedSlippage = (bestAskPrice - midPrice) * currentInputs.quantity;

      // Fees
      const feePercentage = parseFloat(currentInputs.feeTier.replace('%', '')) / 100;
      if (!isNaN(feePercentage)) {
        calculatedFees = currentInputs.quantity * bestAskPrice * feePercentage;
      }
    }
    
    const marketImpact = 0; // Placeholder for Almgren-Chriss model
    const netCost = calculatedSlippage + calculatedFees + marketImpact;
    const makerTaker = "50% Taker / 50% Maker"; // Placeholder for logistic regression

    const endTime = performance.now();
    const latency = endTime - startTime;

    return {
      expectedSlippage: isNaN(calculatedSlippage) ? 0 : calculatedSlippage,
      expectedFees: isNaN(calculatedFees) ? 0 : calculatedFees,
      expectedMarketImpact: marketImpact,
      netCost: isNaN(netCost) ? 0 : netCost,
      makerTakerProportion: makerTaker,
      internalLatency: latency,
    };
  }, []);

  useEffect(() => {
    if (status === 'connected' && orderBook) {
      const newOutputs = calculateOutputs(orderBook, inputParams);
      setOutputParams(newOutputs);
    } else if (status !== 'connecting') {
       // Reset outputs if disconnected or error, but keep latency if measurable
      const currentLatency = outputParams.internalLatency;
      setOutputParams({...initialOutputParams, internalLatency: status === 'error' ? currentLatency : 0 });
    }
  }, [orderBook, inputParams, status, calculateOutputs, outputParams.internalLatency]);
  
  // Toast notifications for WebSocket status changes
  useEffect(() => {
    if (status === 'connected') {
      toast({ title: "WebSocket Connected", description: "Receiving real-time market data." });
    } else if (status === 'disconnected') {
      toast({ title: "WebSocket Disconnected", description: "Attempting to reconnect...", variant: "destructive" });
    } else if (status === 'error' && error) {
      toast({ title: "WebSocket Error", description: error, variant: "destructive" });
    }
  }, [status, error, toast]);


  const handleInputChange = (newParams: InputParameters) => {
    setInputParams(newParams);
    // Recalculate immediately with new inputs and current orderbook
    if (orderBook && status === 'connected') {
       const newOutputs = calculateOutputs(orderBook, newParams);
       setOutputParams(newOutputs);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-background">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary">TradeFlow</h1>
        <p className="text-muted-foreground">Real-time Trade Simulator</p>
      </header>
      <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="w-full">
          <TradeInputPanel inputParams={inputParams} onInputChange={handleInputChange} />
        </div>
        <div className="w-full">
          <OutputDisplayPanel outputParams={outputParams} status={status} error={error} />
        </div>
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TradeFlow. Powered by GoQuant Tech.</p>
      </footer>
    </div>
  );
}
