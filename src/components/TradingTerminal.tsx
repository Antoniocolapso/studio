
// This file is no longer used and can be safely deleted.
// The charting functionality has been replaced by L2 order book specific visualizations:
// LiveOrderBookTable.tsx and MarketDepthChart.tsx.
"use client";
import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const TradingTerminal_DEPRECATED: FC = () => {
  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Trading Chart (Deprecated)</CardTitle>
        <CardDescription>
          This component has been replaced by L2 order book visualizations.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-2 h-[450px] flex items-center justify-center">
        <p className="text-muted-foreground">Component no longer in use.</p>
      </CardContent>
    </Card>
  );
};

export default TradingTerminal_DEPRECATED;
