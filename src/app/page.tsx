
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


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
      return { 
        expectedSlippage: 0,
        expectedFees: 0,
        expectedMarketImpact: 0,
        netCost: 0,
        makerTakerProportion: 'N/A',
        internalLatency: latency 
      };
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
    
    const marketImpactPlaceholder = 0; 
    const netCost = calculatedSlippage + calculatedFees + marketImpactPlaceholder;
    const makerTakerPlaceholder = "N/A";

    const endTime = performance.now();
    const latency = endTime - startTime;

    return {
      expectedSlippage: isNaN(calculatedSlippage) ? 0 : calculatedSlippage,
      expectedFees: isNaN(calculatedFees) ? 0 : calculatedFees,
      expectedMarketImpact: marketImpactPlaceholder,
      netCost: isNaN(netCost) ? 0 : netCost,
      makerTakerProportion: makerTakerPlaceholder,
      internalLatency: latency,
    };
  }, []);

  useEffect(() => {
    if (status === 'connected' && orderBook) {
      const newOutputs = calculateOutputs(orderBook, inputParams);
      setOutputParams(newOutputs);
    } else if (status !== 'connecting') {
      const currentLatency = outputParams.internalLatency; 
      setOutputParams({
        ...initialOutputParams, 
        internalLatency: status === 'error' && currentLatency > 0 ? currentLatency : 0 
      });
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
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-4 border-b border-border">
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
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TradeInputPanel inputParams={inputParams} onInputChange={handleInputChange} />
          <OutputDisplayPanel outputParams={outputParams} status={status} error={error} />
        </div>

        <Accordion type="multiple" className="w-full space-y-6">
          <AccordionItem value="live-order-book" className="border border-border rounded-lg shadow-lg overflow-hidden">
            <AccordionTrigger className="text-xl font-semibold px-6 py-4 bg-card hover:no-underline data-[state=open]:border-b data-[state=open]:rounded-b-none">
              Live Order Book: {orderBook?.symbol || inputParams.spotAsset}
            </AccordionTrigger>
            <AccordionContent className="bg-card p-0">
              <LiveOrderBookTable orderBook={orderBook} status={status} variant="collapsibleContent" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="market-depth-chart" className="border border-border rounded-lg shadow-lg overflow-hidden">
            <AccordionTrigger className="text-xl font-semibold px-6 py-4 bg-card hover:no-underline data-[state=open]:border-b data-[state=open]:rounded-b-none">
              Market Depth: {orderBook?.symbol || inputParams.spotAsset}
            </AccordionTrigger>
            <AccordionContent className="bg-card p-0">
               <MarketDepthChart orderBook={orderBook} status={status} variant="collapsibleContent" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-auto border-t border-border">
        <p className="text-center text-sm text-muted-foreground">&copy; {new Date().getFullYear()} TradeFlow. Made with passion ❤️ by Omm [aka Antonio Colapso]</p>
      </footer>
    </div>
  );
}
