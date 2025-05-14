
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Using Input for consistent styling, but disabled
import type { OutputParameters } from '@/types';
import { cn } from "@/lib/utils";

interface OutputDisplayPanelProps {
  outputParams: OutputParameters;
  status: string;
  error: string | null;
}

// Helper to format currency
const formatCurrency = (value: number) => {
  if (isNaN(value) || !isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
};

// Helper to format latency
const formatLatency = (value: number) => {
  if (isNaN(value) || !isFinite(value)) return "0 ms";
  return `${value.toFixed(2)} ms`;
};

export default function OutputDisplayPanel({ outputParams, status, error }: OutputDisplayPanelProps) {
  const renderValue = (value: string) => {
    if (status === 'connecting') return "Connecting...";
    if (status === 'error') return "Error";
    if (status === 'disconnected') return "Disconnected";
    if (value === "$NaN" || value.includes("NaN")) return "Calculating..."; // Handles initial state or bad calc
    return value;
  };
  
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Estimated Costs & Impact</CardTitle>
        {status === 'connecting' && <p className="text-sm text-muted-foreground">Attempting to connect to WebSocket...</p>}
        {status === 'disconnected' && <p className="text-sm text-yellow-600 dark:text-yellow-400">WebSocket disconnected. Attempting to reconnect...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardHeader>
      <CardContent className="space-y-6">
        {[
          { label: "Expected Slippage", value: formatCurrency(outputParams.expectedSlippage), isPositive: outputParams.expectedSlippage <=0.01 && outputParams.expectedSlippage >=0 },
          { label: "Expected Fees", value: formatCurrency(outputParams.expectedFees) },
          { label: "Expected Market Impact", value: formatCurrency(outputParams.expectedMarketImpact) },
          { label: "Net Cost", value: formatCurrency(outputParams.netCost) },
          { label: "Maker/Taker Proportion", value: outputParams.makerTakerProportion || "N/A" },
          { label: "Internal Latency (Processing Time)", value: formatLatency(outputParams.internalLatency) },
        ].map((item, index) => (
          <div className="space-y-2" key={index}>
            <Label htmlFor={`output-${index}`}>{item.label}</Label>
            <Input 
              id={`output-${index}`} 
              value={renderValue(item.value)} 
              disabled 
              className={cn({ "text-green-600 dark:text-green-400": item.isPositive && status === 'connected' })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
