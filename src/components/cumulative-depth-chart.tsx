
// This file is no longer used and can be safely deleted.
// The charting functionality has been replaced by L2 order book specific visualizations:
// LiveOrderBookTable.tsx and MarketDepthChart.tsx.
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CumulativeDepthChart_DEPRECATED() {
  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Cumulative Depth (Deprecated)</CardTitle>
        <CardDescription>This chart is no longer in use.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">This component has been replaced.</p>
      </CardContent>
    </Card>
  );
}
