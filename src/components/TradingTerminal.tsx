
"use client";
import type { FC } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import the chart component to ensure it's client-side only
const TradingViewChartInternal = dynamic(
  () => import('./TradingViewChartInternal'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[450px] flex flex-col space-y-2 p-4">
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-8 w-1/4" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <Skeleton className="flex-1 w-full" />
      </div>
    )
  }
);

const TradingTerminal: FC = () => {
  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Trading Chart</CardTitle>
        <CardDescription>
          Interactive financial chart. Current data is illustrative sample data.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-2"> {/* Remove padding on small screens for chart */}
        <TradingViewChartInternal />
      </CardContent>
    </Card>
  );
};

export default TradingTerminal;
