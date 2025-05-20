
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OutputParameters } from '@/types';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Removed import: import { predictSlippage, predictMakerTakerProportion } from '@/ai/flows/slippage-estimator-flow';
import { Info } from 'lucide-react';

interface OutputDisplayPanelProps {
  outputParams: OutputParameters;
  status: string;
  error: string | null;
  isCalculatingOutputs: boolean;
}

// Helper to format currency
const formatCurrency = (value: number | undefined) => {
  if (value === undefined || isNaN(value) || !isFinite(value)) return "Calculating...";
  return `$${value.toFixed(2)}`;
};

// Helper to format latency
const formatLatency = (value: number) => {
  if (isNaN(value) || !isFinite(value)) return "0 ms";
  return `${value.toFixed(2)} ms`;
};

export default function OutputDisplayPanel({ outputParams, status, error, isCalculatingOutputs }: OutputDisplayPanelProps) {
  const renderValue = (value: string | number | undefined, originalValue?: number | string) => {
    if (status === 'connecting') return <span className="text-muted-foreground">Connecting...</span>;
    if (status === 'error') return <span className="text-destructive dark:text-red-500">Error</span>;
    if (status === 'disconnected') return <span className="text-yellow-600 dark:text-yellow-400">Disconnected</span>;
    if (isCalculatingOutputs && (value === undefined || (typeof value === 'number' && isNaN(value)))) return <span className="text-muted-foreground">Calculating...</span>;

    const displayValue = typeof value === 'number' ? value.toString() : value;
     if (displayValue === "Calculating..." || displayValue === undefined || String(displayValue).includes("NaN") || (typeof originalValue === 'number' && (isNaN(originalValue) || !isFinite(originalValue)))) {
      return <span className="text-muted-foreground">Calculating...</span>;
    }
    return displayValue;
  };

  const stats = [
    {
      label: "Expected Slippage",
      value: formatCurrency(outputParams.expectedSlippage),
      rawValue: outputParams.expectedSlippage,
      isPositiveCondition: (val: number | undefined) => val !== undefined && val <= 0.01 && val >= 0,
      tooltip: "Estimated cost difference due to price movement caused by trade volume, based on current order book depth.",
    },
    { label: "Expected Fees", value: formatCurrency(outputParams.expectedFees), rawValue: outputParams.expectedFees, tooltip: "Calculated based on estimated execution price and fee tier." },
    { label: "Expected Market Impact", value: formatCurrency(outputParams.expectedMarketImpact), rawValue: outputParams.expectedMarketImpact, tooltip: "Placeholder (Almgren-Chriss model not implemented)." },
    { label: "Net Cost", value: formatCurrency(outputParams.netCost), rawValue: outputParams.netCost, tooltip: "Total estimated cost: Slippage + Fees + Market Impact." },
    { label: "Maker/Taker Proportion", value: outputParams.makerTakerProportion, rawValue: outputParams.makerTakerProportion, tooltip: "Placeholder (Logistic regression model not implemented)." },
    { label: "Internal Latency (Calc Time)", value: formatLatency(outputParams.internalLatency), rawValue: outputParams.internalLatency, tooltip: "Time taken for frontend calculations." },
  ];

  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Trade Execution Estimates</CardTitle>
        {status === 'connecting' && <CardDescription className="text-sm text-muted-foreground">Attempting to connect to WebSocket...</CardDescription>}
        {status === 'disconnected' && <CardDescription className="text-sm text-yellow-600 dark:text-yellow-400">WebSocket disconnected. Attempting to reconnect...</CardDescription>}
        {error && <CardDescription className="text-sm text-destructive dark:text-red-500">{error}</CardDescription>}
        {isCalculatingOutputs && status === 'connected' && <CardDescription className="text-sm text-muted-foreground">Calculating estimates...</CardDescription>}
         {status === 'connected' && !isCalculatingOutputs && !error && <CardDescription className="text-sm text-muted-foreground">Estimates based on live market data.</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <TooltipProvider>
          {stats.map((item, index) => (
            <React.Fragment key={index}>
              <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  {item.tooltip && (
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">{item.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className={cn(
                    "text-sm font-medium",
                     item.isPositiveCondition && typeof item.rawValue === 'number' && item.isPositiveCondition(item.rawValue) && status === 'connected' && !isCalculatingOutputs
                      ? "text-green-600 dark:text-green-400"
                      : "text-foreground"
                  )}
                >
                  {renderValue(item.value, typeof item.rawValue === 'number' || typeof item.rawValue === 'string' ? item.rawValue : undefined)}
                </p>
              </div>
              {index < stats.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
