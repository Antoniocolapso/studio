
"use client";

import type { FC } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OrderBookData, DepthChartDataPoint } from '@/types';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MarketDepthChartProps {
  orderBook: OrderBookData | null;
  status: string;
  variant?: 'default' | 'collapsibleContent';
}

const processDataForDepthChart = (orderBook: OrderBookData | null): DepthChartDataPoint[] => {
  if (!orderBook || (!orderBook.bids.length && !orderBook.asks.length)) return [];

  const bids = orderBook.bids.map(b => [parseFloat(b[0]), parseFloat(b[1])]).sort((a, b) => b[0] - a[0]);
  const asks = orderBook.asks.map(a => [parseFloat(a[0]), parseFloat(a[1])]).sort((a, b) => a[0] - b[0]);

  const depthData: DepthChartDataPoint[] = [];
  let cumulativeBidVolume = 0;
  for (const [price, volume] of bids) {
    cumulativeBidVolume += volume;
    depthData.push({ price, bidVolume: cumulativeBidVolume, askVolume: 0 }); // Initialize askVolume
  }

  // To ensure asks are plotted correctly, we'll merge them into the bid data or add new points.
  // The data needs to be sorted by price for the chart.
  // For each ask, find its place or add it.
  let cumulativeAskVolume = 0;
  asks.forEach(([price, volume]) => {
    cumulativeAskVolume += volume;
    const existingPointIndex = depthData.findIndex(p => p.price === price);
    if (existingPointIndex !== -1) {
      depthData[existingPointIndex].askVolume = cumulativeAskVolume;
    } else {
      // Find insert position to keep sorted by price
      const insertIndex = depthData.findIndex(p => p.price > price);
      if (insertIndex !== -1) {
        depthData.splice(insertIndex, 0, { price, askVolume: cumulativeAskVolume, bidVolume: 0 });
      } else {
        depthData.push({ price, askVolume: cumulativeAskVolume, bidVolume: 0 });
      }
    }
  });
  
  depthData.sort((a, b) => a.price - b.price);

  // Fill in missing cumulative volumes by carrying forward
  // Bids accumulate from right-to-left (high price to low price on chart)
  // Asks accumulate from left-to-right (low price to high price on chart)
  let lastBidVol = 0;
  for (let i = depthData.length - 1; i >= 0; i--) {
    if (depthData[i].bidVolume && depthData[i].bidVolume! > 0) {
      lastBidVol = depthData[i].bidVolume!;
    } else if(lastBidVol > 0) {
      depthData[i].bidVolume = lastBidVol;
    }
  }
  
  let lastAskVol = 0;
  for (let i = 0; i < depthData.length; i++) {
    if (depthData[i].askVolume && depthData[i].askVolume! > 0) {
      lastAskVol = depthData[i].askVolume!;
    } else if(lastAskVol > 0) {
       depthData[i].askVolume = lastAskVol;
    }
  }

  // Filter to a reasonable range around the mid-price if too many points
  if (depthData.length > 100 && bids.length > 0 && asks.length > 0) {
      const midPrice = (bids[0][0] + asks[0][0]) / 2; // Using initial unsorted best bid/ask for rough mid
      const percentageRange = 0.1; // e.g., 10% around mid-price
      return depthData.filter(p => p.price >= midPrice * (1 - percentageRange) && p.price <= midPrice * (1 + percentageRange));
  }
  if (depthData.length > 60) { // General fallback limit
    const midIndex = Math.floor(depthData.length / 2);
    return depthData.slice(Math.max(0, midIndex - 30), Math.min(depthData.length, midIndex + 30));
  }

  return depthData;
};


const MarketDepthChart: FC<MarketDepthChartProps> = ({ orderBook, status, variant = 'default' }) => {
  const { theme } = useTheme();
  const chartData = processDataForDepthChart(orderBook);

  const strokeColor = theme === 'dark' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))'; 
  const gridColor = theme === 'dark' ? 'hsl(var(--border))' : 'hsl(var(--border))';
  const bidFillColor = theme === 'dark' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.5)'; 
  const askFillColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.5)';   
  const bidStrokeColor = theme === 'dark' ? '#10B981' : '#059669';
  const askStrokeColor = theme === 'dark' ? '#EF4444' : '#DC2626';

  const chartComponent = (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis 
          dataKey="price" 
          type="number" 
          domain={['dataMin', 'dataMax']}
          tickFormatter={(price) => price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          stroke={strokeColor}
          tick={{ fontSize: 10 }}
          dy={5}
        />
        <YAxis 
          yAxisId="left" 
          orientation="left" 
          stroke={bidStrokeColor} 
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => value.toFixed(2)}
          width={50}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right" 
          stroke={askStrokeColor} 
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => value.toFixed(2)}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: theme === 'dark' ? 'hsl(var(--popover))' : 'hsl(var(--popover))',
            borderColor: theme === 'dark' ? 'hsl(var(--border))' : 'hsl(var(--border))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: '12px',
            borderRadius: 'var(--radius)',
          }}
          formatter={(value: number, name: string) => [
            value.toFixed(4),
            name === 'bidVolume' ? 'Cumulative Bids' : 'Cumulative Asks',
          ]}
          labelFormatter={(label) => `Price: ${label.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
        />
        <Area yAxisId="left" type="stepAfter" dataKey="bidVolume" stroke={bidStrokeColor} fill={bidFillColor} strokeWidth={2} name="Bids" dot={false} activeDot={false} />
        <Area yAxisId="right" type="stepBefore" dataKey="askVolume" stroke={askStrokeColor} fill={askFillColor} strokeWidth={2} name="Asks" dot={false} activeDot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
  
  const loadingStateSkeleton = (
     <>
      {variant === 'default' && (
        <CardHeader>
            <CardTitle className="text-xl font-semibold">Market Depth</CardTitle>
            <CardDescription>Connecting to order book...</CardDescription>
        </CardHeader>
      )}
      <div className={cn("h-[300px] md:h-[400px]", variant === 'default' ? "p-6 pt-0" : "p-6")}>
         {variant === 'collapsibleContent' && (
             <div className="mb-4">
                 <Skeleton className="h-6 w-1/3 mb-1" /> {/* For Title placeholder */}
                 <Skeleton className="h-4 w-1/2" /> {/* For Description placeholder */}
             </div>
         )}
        <Skeleton className="h-full w-full" />
      </div>
    </>
  );

  const errorOrNoDataState = (
    <>
      {variant === 'default' && (
        <CardHeader>
            <CardTitle className="text-xl font-semibold">Market Depth</CardTitle>
            <CardDescription>
            {status === 'error' ? 'Error loading depth data.' : 'No depth data available to display chart.'}
            </CardDescription>
        </CardHeader>
      )}
      <div className={cn("h-[300px] md:h-[400px] flex items-center justify-center", variant === 'default' ? "p-6 pt-0" : "p-6")}>
        {variant === 'collapsibleContent' && status !== 'error' && (
             <p className="text-muted-foreground text-center">No depth data available to display chart.<br/>Waiting for data...</p>
         )}
         {variant === 'collapsibleContent' && status === 'error' && (
             <p className="text-destructive text-center">Error loading depth data.<br/>Please try again later.</p>
         )}
         {variant === 'default' && (
            <p className="text-muted-foreground">
                {status === 'error' ? 'Please try again later.' : 'Waiting for data...'}
            </p>
         )}
      </div>
    </>
  );

  const chartDisplay = (
    <>
      {variant === 'default' && (
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Market Depth: {orderBook?.symbol}</CardTitle>
          <CardDescription>Cumulative bid and ask volume by price level.</CardDescription>
        </CardHeader>
      )}
      {variant === 'collapsibleContent' && orderBook && (
         <div className="px-6 pt-4 pb-2 text-sm text-muted-foreground">
           Cumulative bid and ask volume by price level.
         </div>
      )}
      <div className={cn("h-[300px] md:h-[400px] p-2", variant === 'collapsibleContent' && "px-6 pb-6 pt-2")}>
        {chartComponent}
      </div>
    </>
  );


  if (variant === 'collapsibleContent') {
    if (status === 'connecting') return loadingStateSkeleton;
    if (status === 'error' || !chartData.length) return errorOrNoDataState;
    return <>{chartDisplay}</>;
  }


  // Default variant rendering (full Card)
  return (
    <Card className="w-full shadow-lg rounded-lg mt-6">
      {status === 'connecting' && loadingStateSkeleton}
      {(status === 'error' || (status !== 'connecting' && !chartData.length)) && errorOrNoDataState}
      {status === 'connected' && chartData.length > 0 && chartDisplay}
    </Card>
  );
};

export default MarketDepthChart;
