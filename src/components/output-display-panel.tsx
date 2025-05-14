
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OutputParameters } from '@/types';
import { cn } from "@/lib/utils";

interface OutputDisplayPanelProps {
  outputParams: OutputParameters;
  status: string;
  error: string | null;
}

// Helper to format currency
const formatCurrency = (value: number) => {
  if (isNaN(value) || !isFinite(value)) return "$0.00"; // Handle NaN or Infinity gracefully
  return `$${value.toFixed(2)}`;
};

// Helper to format latency
const formatLatency = (value: number) => {
  if (isNaN(value) || !isFinite(value)) return "0 ms"; // Handle NaN or Infinity
  return `${value.toFixed(2)} ms`;
};

export default function OutputDisplayPanel({ outputParams, status, error }: OutputDisplayPanelProps) {
  const renderValue = (value: string | number, originalValue?: number) => {
    if (status === 'connecting') return <span className="text-muted-foreground">Connecting...</span>;
    if (status === 'error') return <span className="text-destructive">Error</span>;
    if (status === 'disconnected') return <span className="text-yellow-600 dark:text-yellow-400">Disconnected</span>;
    
    const displayValue = typeof value === 'number' ? value.toString() : value;
    if (displayValue === "$NaN" || displayValue.includes("NaN") || (typeof originalValue === 'number' && (isNaN(originalValue) || !isFinite(originalValue)))) {
      return <span className="text-muted-foreground">Calculating...</span>;
    }
    return displayValue;
  };
  
  const stats = [
    { 
      label: "Expected Slippage", 
      value: formatCurrency(outputParams.expectedSlippage), 
      rawValue: outputParams.expectedSlippage,
      isPositiveCondition: (val: number) => val <= 0.01 && val >= 0 // Example: slippage is "good" if very low
    },
    { label: "Expected Fees", value: formatCurrency(outputParams.expectedFees), rawValue: outputParams.expectedFees },
    { label: "Expected Market Impact", value: formatCurrency(outputParams.expectedMarketImpact), rawValue: outputParams.expectedMarketImpact },
    { label: "Net Cost", value: formatCurrency(outputParams.netCost), rawValue: outputParams.netCost },
    { label: "Maker/Taker Proportion", value: outputParams.makerTakerProportion || "N/A", rawValue: outputParams.makerTakerProportion },
    { label: "Internal Latency (Calc Time)", value: formatLatency(outputParams.internalLatency), rawValue: outputParams.internalLatency },
  ];

  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Trade Execution Estimates</CardTitle>
        {status === 'connecting' && <p className="text-sm text-muted-foreground">Attempting to connect to WebSocket...</p>}
        {status === 'disconnected' && <p className="text-sm text-yellow-600 dark:text-yellow-400">WebSocket disconnected. Attempting to reconnect...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {stats.map((item, index) => (
          <React.Fragment key={index}>
            <div className="flex justify-between items-center py-1">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={cn(
                  "text-sm font-medium",
                  item.isPositiveCondition && typeof item.rawValue === 'number' && item.isPositiveCondition(item.rawValue) && status === 'connected' 
                    ? "text-green-600 dark:text-green-400" // Using Tailwind classes directly for accent
                    : "text-foreground"
                )}
              >
                {renderValue(item.value, typeof item.rawValue === 'number' ? item.rawValue : undefined)}
              </p>
            </div>
            {index < stats.length - 1 && <Separator />}
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
