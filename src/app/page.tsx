
"use client";

import { useState, useEffect, useCallback } from 'react';
import TradeInputPanel from '@/components/trade-input-panel';
import OutputDisplayPanel from '@/components/output-display-panel';
import { DarkModeToggle } from '@/components/dark-mode-toggle';
import { useOrderbook } from '@/hooks/use-orderbook';
import type { InputParameters, OutputParameters, OrderBookData } from '@/types';
import { useToast } from "@/hooks/use-toast";
import LiveOrderBookTable from '@/components/LiveOrderBookTable';
import MarketDepthChart from '@/components/MarketDepthChart';


const initialInputParams: InputParameters = {
  exchange: 'OKX',
  spotAsset: 'BTC-USDT-SWAP',
  orderType: 'market',
  quantity: 0.00167, 
  volatility: undefined,
  feeTier: '0.1%',
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
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  const calculateOutputs = useCallback((currentOrderBook: OrderBookData | null, currentInputs: InputParameters): OutputParameters => {
    const startTime = performance.now();

    if (!currentOrderBook || currentInputs.quantity <= 0) {
      const latency = performance.now() - startTime;
      return { ...initialOutputParams, internalLatency: latency };
    }

    const { asks, bids } = currentOrderBook;
    let calculatedSlippage = 0;
    let calculatedFees = 0;
    
    if (asks.length > 0 && bids.length > 0) {
      const bestAskPrice = parseFloat(asks[0][0]);
      const bestBidPrice = parseFloat(bids[0][0]);
      const midPrice = (bestAskPrice + bestBidPrice) / 2;
      
      calculatedSlippage = (bestAskPrice - midPrice) * currentInputs.quantity;

      const feePercentage = parseFloat(currentInputs.feeTier.replace('%', '')) / 100;
      if (!isNaN(feePercentage)) {
        calculatedFees = currentInputs.quantity * bestAskPrice * feePercentage;
      }
    }
    
    const marketImpact = 0; 
    const netCost = calculatedSlippage + calculatedFees + marketImpact;
    const makerTaker = "50% Taker / 50% Maker"; 

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
      const currentLatency = outputParams.internalLatency;
      setOutputParams({...initialOutputParams, internalLatency: status === 'error' ? currentLatency : 0 });
    }
  }, [orderBook, inputParams, status, calculateOutputs, outputParams.internalLatency]);
  
  useEffect(() => {
    if (status === 'connected') {
      toast({ title: "WebSocket Connected", description: "Receiving real-time order book data." });
    } else if (status === 'disconnected') {
      toast({ title: "WebSocket Disconnected", description: "Attempting to reconnect...", variant: "destructive" });
    } else if (status === 'error' && error) {
      toast({ title: "WebSocket Error", description: error, variant: "destructive" });
    }
  }, [status, error, toast]);


  const handleInputChange = (newParams: InputParameters) => {
    setInputParams(newParams);
    if (orderBook && status === 'connected') {
       const newOutputs = calculateOutputs(orderBook, newParams);
       setOutputParams(newOutputs);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-background transition-colors duration-300">
      <header className="w-full max-w-6xl mb-8">
        <div className="flex justify-between items-center">
          <div className="text-left">
            <h1 className="text-4xl font-bold text-primary">TradeFlow</h1>
            <p className="text-muted-foreground">Real-time L2 Order Book Analysis</p>
          </div>
          <div className="flex items-center gap-4">
             {currentTime && <span className="text-sm text-muted-foreground hidden md:inline">{currentTime}</span>}
            <DarkModeToggle />
          </div>
        </div>
      </header>
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TradeInputPanel inputParams={inputParams} onInputChange={handleInputChange} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <OutputDisplayPanel outputParams={outputParams} status={status} error={error} />
          <LiveOrderBookTable orderBook={orderBook} status={status} />
          <MarketDepthChart orderBook={orderBook} status={status} />
        </div>
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TradeFlow. Powered by GoQuant Tech.</p>
      </footer>
    </div>
  );
}
