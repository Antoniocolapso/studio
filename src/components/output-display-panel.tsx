
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OutputParameters } from '@/types';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from 'lucide-react';

interface OutputDisplayPanelProps {
  outputParams: OutputParameters;
  status: string;
  error: string | null;
  isCalculating: boolean;
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

export default function OutputDisplayPanel({ outputParams, status, error, isCalculating }: OutputDisplayPanelProps) {
  const renderValue = (value: string | number | undefined, originalValue?: number | string) => {
    if (status === 'connecting') return <span className="text-muted-foreground">Connecting...</span>;
    if (status === 'error') return <span className="text-destructive">Error</span>;
    if (status === 'disconnected') return <span className="text-yellow-600 dark:text-yellow-400">Disconnected</span>;
    if (isCalculating && (value === undefined || (typeof value === 'number' && isNaN(value)))) return <span className="text-muted-foreground">Calculating...</span>;


    const displayValue = typeof value === 'number' ? value.toString() : value;
     if (displayValue === "Calculating..." || displayValue === undefined || String(displayValue).includes("NaN") || (typeof originalValue === 'number' && (isNaN(originalValue) || !isFinite(originalValue)))) {
      return <span className="text-muted-foreground">Calculating...</span>;
    }
    return displayValue;
  };

  const confidenceColor = (confidence: string | undefined) => {
    switch (confidence) {
      case 'high': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const stats = [
    {
      label: "Expected Slippage (AI)",
      value: formatCurrency(outputParams.expectedSlippage),
      rawValue: outputParams.expectedSlippage,
      isPositiveCondition: (val: number | undefined) => val !== undefined && val <= 0.01 && val >= 0,
      tooltip: outputParams.aiSlippageReasoning,
      confidence: outputParams.aiSlippageConfidence,
    },
    { label: "Expected Fees", value: formatCurrency(outputParams.expectedFees), rawValue: outputParams.expectedFees },
    { label: "Expected Market Impact", value: formatCurrency(outputParams.expectedMarketImpact), rawValue: outputParams.expectedMarketImpact, tooltip: "Almgren-Chriss model (placeholder)" },
    { label: "Net Cost", value: formatCurrency(outputParams.netCost), rawValue: outputParams.netCost },
    { label: "Maker/Taker Proportion", value: outputParams.makerTakerProportion || "N/A", rawValue: outputParams.makerTakerProportion, tooltip: "Logistic regression (placeholder)" },
    { label: "Internal Latency (Calc Time)", value: formatLatency(outputParams.internalLatency), rawValue: outputParams.internalLatency },
  ];

  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Trade Execution Estimates</CardTitle>
        {status === 'connecting' && <CardDescription className="text-sm text-muted-foreground">Attempting to connect to WebSocket...</CardDescription>}
        {status === 'disconnected' && <CardDescription className="text-sm text-yellow-600 dark:text-yellow-400">WebSocket disconnected. Attempting to reconnect...</CardDescription>}
        {error && <CardDescription className="text-sm text-destructive">{error}</CardDescription>}
        {isCalculating && status === 'connected' && <CardDescription className="text-sm text-muted-foreground">Calculating estimates...</CardDescription>}
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
                        {item.confidence && (
                           <p className={cn("text-xs mt-1", confidenceColor(item.confidence))}>
                              AI Confidence: <span className="font-semibold">{item.confidence.toUpperCase()}</span>
                           </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className={cn(
                    "text-sm font-medium",
                    item.isPositiveCondition && typeof item.rawValue === 'number' && item.isPositiveCondition(item.rawValue) && status === 'connected' && !isCalculating
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
