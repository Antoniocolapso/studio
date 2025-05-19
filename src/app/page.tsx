
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
  expectedSlippage: NaN,
  expectedFees: NaN,
  expectedMarketImpact: 0,
  netCost: NaN,
  makerTakerProportion: 'N/A',
  internalLatency: 0,
};

export default function HomePage() {
  const [inputParams, setInputParams] = useState<InputParameters>(initialInputParams);
  const [outputParams, setOutputParams] = useState<OutputParameters>(initialOutputParams);
  const { orderBook, status, error } = useOrderbook();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [isCalculatingOutputs, setIsCalculatingOutputs] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateOutputs = useCallback((currentOrderBook: OrderBookData | null, currentInputs: InputParameters): OutputParameters => {
    const startTime = performance.now();
    setIsCalculatingOutputs(true);

    let calculatedSlippage = NaN;
    let calculatedFees = NaN;
    const calculatedMarketImpact = 0; // Placeholder
    let netCost = NaN;
    const makerTakerProportion = "N/A"; // Placeholder

    if (currentOrderBook && currentInputs.quantity > 0 && currentOrderBook.asks && currentOrderBook.asks.length > 0) {
      const { asks } = currentOrderBook;
      let quantityToFill = currentInputs.quantity;
      const bestAskPrice = parseFloat(asks[0][0]);
      let totalCost = 0;
      let quantityFilled = 0;

      if (!isNaN(bestAskPrice)) {
        for (const level of asks) {
          const price = parseFloat(level[0]);
          const availableQuantity = parseFloat(level[1]);

          if (quantityToFill <= 0) break;

          const amountToTake = Math.min(quantityToFill, availableQuantity);
          totalCost += amountToTake * price;
          quantityFilled += amountToTake;
          quantityToFill -= amountToTake;
        }

        if (quantityFilled > 0) {
          const vwap = totalCost / quantityFilled;
          const costAtBestAsk = bestAskPrice * quantityFilled;
          calculatedSlippage = totalCost - costAtBestAsk;

          const feePercentage = parseFloat(currentInputs.feeTier.replace('%', '')) / 100;
          if (!isNaN(feePercentage)) {
            calculatedFees = totalCost * feePercentage; // Fees based on actual filled cost
          } else {
            calculatedFees = 0;
          }
        } else {
          // Not enough liquidity to fill any part of the order
          calculatedSlippage = 0;
          calculatedFees = 0;
        }
      } else {
        calculatedSlippage = 0;
        calculatedFees = 0;
      }
    } else {
      calculatedSlippage = 0;
      calculatedFees = 0;
    }
    
    calculatedSlippage = isNaN(calculatedSlippage) || !isFinite(calculatedSlippage) ? 0 : calculatedSlippage;
    calculatedFees = isNaN(calculatedFees) || !isFinite(calculatedFees) ? 0 : calculatedFees;

    netCost = calculatedSlippage + calculatedFees + calculatedMarketImpact; // Market impact is currently 0
    netCost = isNaN(netCost) || !isFinite(netCost) ? 0 : netCost;
    
    const latency = performance.now() - startTime;
    setIsCalculatingOutputs(false);

    return {
      expectedSlippage: calculatedSlippage,
      expectedFees: calculatedFees,
      expectedMarketImpact: calculatedMarketImpact,
      netCost: netCost,
      makerTakerProportion: makerTakerProportion,
      internalLatency: latency,
    };
  }, []);

  useEffect(() => {
    if (status === 'connected' && orderBook) {
      setIsCalculatingOutputs(true);
      setOutputParams(prev => ({
        ...prev,
        expectedSlippage: NaN,
        expectedFees: NaN,
        netCost: NaN,
      }));
      const newOutputs = calculateOutputs(orderBook, inputParams);
      setOutputParams(newOutputs);
    } else if (status !== 'connecting') {
      const currentLatency = outputParams.internalLatency;
       setOutputParams({
        ...initialOutputParams,
        expectedSlippage: 0,
        expectedFees: 0,
        netCost: 0,
        internalLatency: status === 'error' && currentLatency > 0 ? currentLatency : 0,
      });
      setIsCalculatingOutputs(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderBook, inputParams, status, error, calculateOutputs]);

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
          <OutputDisplayPanel outputParams={outputParams} status={status} error={error} isCalculatingOutputs={isCalculatingOutputs} />
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
