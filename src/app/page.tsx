
"use client";

import { useState, useEffect, useCallback } from 'react';
import TradeInputPanel from '@/components/trade-input-panel';
import OutputDisplayPanel from '@/components/output-display-panel';
import { DarkModeToggle } from '@/components/dark-mode-toggle';
import { useOrderbook } from '@/hooks/use-orderbook';
import type { InputParameters, OutputParameters, OrderBookData, OrderBookLevel } from '@/types';
import { useToast } from "@/hooks/use-toast";
import LiveOrderBookTable from '@/components/LiveOrderBookTable';
import MarketDepthChart from '@/components/MarketDepthChart';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { estimateSlippage, SlippageEstimatorInput } from '@/ai/flows/slippage-estimator-flow';


const initialInputParams: InputParameters = {
  exchange: 'OKX',
  spotAsset: 'BTC-USDT-SWAP',
  orderType: 'market',
  quantity: 0.00167,
  volatility: undefined,
  feeTier: '0.1%',
};

const initialOutputParams: OutputParameters = {
  expectedSlippage: NaN, // Initialize with NaN to indicate "calculating"
  expectedFees: NaN,
  expectedMarketImpact: 0, // Placeholder
  netCost: NaN,
  makerTakerProportion: 'N/A', // Placeholder
  internalLatency: 0,
  aiSlippageConfidence: undefined,
  aiSlippageReasoning: undefined,
};

export default function HomePage() {
  const [inputParams, setInputParams] = useState<InputParameters>(initialInputParams);
  const [outputParams, setOutputParams] = useState<OutputParameters>(initialOutputParams);
  const { orderBook, status, error } = useOrderbook();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  const calculateOutputs = useCallback(async (currentOrderBook: OrderBookData | null, currentInputs: InputParameters): Promise<OutputParameters> => {
    const startTime = performance.now();
    setIsCalculating(true);

    let calculatedSlippage = NaN;
    let calculatedFees = NaN;
    const calculatedMarketImpact = 0; // Almgren-Chriss model placeholder
    let netCost = NaN;
    const makerTakerProportion = "N/A"; // Logistic regression placeholder
    let aiSlippageConfidence: 'high' | 'medium' | 'low' | undefined = undefined;
    let aiSlippageReasoning: string | undefined = undefined;


    if (currentOrderBook && currentInputs.quantity > 0 && currentOrderBook.asks && currentOrderBook.asks.length > 0) {
        const { asks, symbol } = currentOrderBook;
        const quantityToTrade = currentInputs.quantity;
        const bestAskPrice = parseFloat(asks[0][0]);

        if (!isNaN(bestAskPrice)) {
            // Prepare input for AI slippage estimator
            const askBookSnapshot = asks.slice(0, 10).map((level: OrderBookLevel) => ({
              price: parseFloat(level[0]),
              quantity: parseFloat(level[1]),
            }));

            const estimatorInput: SlippageEstimatorInput = {
              spotAsset: symbol,
              tradeQuantity: quantityToTrade,
              bestAskPrice: bestAskPrice,
              askBookSnapshot: askBookSnapshot,
            };

            try {
              const slippageResult = await estimateSlippage(estimatorInput);
              calculatedSlippage = slippageResult.estimatedSlippageValue;
              aiSlippageConfidence = slippageResult.confidence;
              aiSlippageReasoning = slippageResult.reasoning;

              // Fee Calculation (based on AI estimated execution)
              // Assuming slippageResult.estimatedSlippageValue is the total slippage amount.
              // The total cost would be (bestAskPrice * quantityToTrade) + slippage.
              // The average execution price (VWAP) would be ((bestAskPrice * quantityToTrade) + slippage) / quantityToTrade.
              // This simplified VWAP might not be perfectly accurate if the LLM doesn't "walk the book" exactly.
              
              let vwap: number;
              if (quantityToTrade > 0) {
                 vwap = (bestAskPrice * quantityToTrade + calculatedSlippage) / quantityToTrade;
              } else {
                 vwap = bestAskPrice; // Avoid division by zero if quantity is somehow zero
              }
              
              const feePercentage = parseFloat(currentInputs.feeTier.replace('%', '')) / 100;
              if (!isNaN(feePercentage)) {
                  calculatedFees = quantityToTrade * vwap * feePercentage;
              }

            } catch (aiError) {
              console.error("AI Slippage Estimation Error:", aiError);
              toast({ title: "AI Slippage Error", description: "Could not get AI slippage estimation.", variant: "destructive" });
              // Fallback to simpler calculation or 0 if AI fails
              calculatedSlippage = 0; 
              calculatedFees = 0;
              aiSlippageConfidence = 'low';
              aiSlippageReasoning = 'AI estimation failed, using fallback.';
            }
        } else {
            calculatedSlippage = 0;
            calculatedFees = 0;
        }
    } else {
       // Set to 0 if no order book or quantity is 0, rather than NaN, to avoid "Calculating..." indefinitely
        calculatedSlippage = 0;
        calculatedFees = 0;
    }

    calculatedSlippage = isNaN(calculatedSlippage) || !isFinite(calculatedSlippage) ? 0 : calculatedSlippage;
    calculatedFees = isNaN(calculatedFees) || !isFinite(calculatedFees) ? 0 : calculatedFees;

    netCost = calculatedSlippage + calculatedFees + calculatedMarketImpact;
    netCost = isNaN(netCost) || !isFinite(netCost) ? 0 : netCost;

    const latency = performance.now() - startTime;
    setIsCalculating(false);

    return {
      expectedSlippage: calculatedSlippage,
      expectedFees: calculatedFees,
      expectedMarketImpact: calculatedMarketImpact,
      netCost: netCost,
      makerTakerProportion: makerTakerProportion,
      internalLatency: latency,
      aiSlippageConfidence,
      aiSlippageReasoning,
    };
  }, [toast]);

  useEffect(() => {
    if (status === 'connected' && orderBook) {
      // Set initial state to NaN to show "Calculating..."
      setOutputParams(prev => ({
        ...prev,
        expectedSlippage: NaN,
        expectedFees: NaN,
        netCost: NaN,
        aiSlippageConfidence: undefined,
        aiSlippageReasoning: undefined,
      }));
      calculateOutputs(orderBook, inputParams).then(newOutputs => {
        setOutputParams(newOutputs);
      });
    } else if (status !== 'connecting') {
      const currentLatency = outputParams.internalLatency;
      setOutputParams({
        ...initialOutputParams,
        expectedSlippage: 0, // Reset to 0 instead of NaN when not connected
        expectedFees: 0,
        netCost: 0,
        internalLatency: status === 'error' && currentLatency > 0 ? currentLatency : 0,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderBook, inputParams, status, calculateOutputs]); // Removed calculateOutputs from deps to avoid re-triggering on its own change due to useCallback structure. inputParams change will trigger it.

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
    // Recalculation will be triggered by the useEffect watching inputParams and orderBook
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
          <OutputDisplayPanel outputParams={outputParams} status={status} error={error} isCalculating={isCalculating} />
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
