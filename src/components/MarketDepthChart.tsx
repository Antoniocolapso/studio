
"use client";

import type { FC } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OrderBookData, DepthChartDataPoint } from '@/types';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';

interface MarketDepthChartProps {
  orderBook: OrderBookData | null;
  status: string;
}

const processDataForDepthChart = (orderBook: OrderBookData | null): DepthChartDataPoint[] => {
  if (!orderBook || (!orderBook.bids.length && !orderBook.asks.length)) return [];

  const bids = orderBook.bids.map(b => [parseFloat(b[0]), parseFloat(b[1])]).sort((a, b) => b[0] - a[0]); // Sort descending for cumulative sum
  const asks = orderBook.asks.map(a => [parseFloat(a[0]), parseFloat(a[1])]).sort((a, b) => a[0] - b[0]); // Sort ascending for cumulative sum

  const depthData: DepthChartDataPoint[] = [];
  let cumulativeBidVolume = 0;
  for (const [price, volume] of bids) {
    cumulativeBidVolume += volume;
    depthData.push({ price, bidVolume: cumulativeBidVolume });
  }

  let cumulativeAskVolume = 0;
  for (const [price, volume] of asks) {
    cumulativeAskVolume += volume;
    // To align asks on the same side of y-axis for volume, we can add them after bids or merge carefully.
    // For simplicity, we'll add them such that they are distinct if prices overlap, or can merge if price points are unique.
    // A common approach is to plot them on separate Y-axes or transform data to plot around a mid-price.
    // Here, we'll ensure asks appear "after" bids in the price scale if needed, or merge if prices distinct.
    const existingPoint = depthData.find(p => p.price === price);
    if (existingPoint) {
      existingPoint.askVolume = cumulativeAskVolume;
    } else {
      depthData.push({ price, askVolume: cumulativeAskVolume });
    }
  }
  
  // Sort by price for the X-axis
  return depthData.sort((a, b) => a.price - b.price)
    // Fill missing bid/ask volumes by carrying forward the last known cumulative volume
    .map((point, index, arr) => {
      if (index > 0) {
        if (point.bidVolume === undefined && arr[index-1].bidVolume !== undefined) {
          point.bidVolume = arr[index-1].bidVolume;
        }
        if (point.askVolume === undefined && arr[index-1].askVolume !== undefined) {
           // For asks, if current point is an ask point, it's fine. If it's a bid point without an ask, 
           // we need to find the ask volume for prices *greater* than this.
           // This simple forward fill isn't perfect for asks, a more robust merge is needed for perfect visual.
           // However, for typical depth charts, asks accumulate from low to high prices.
        }
      }
      return point;
    })
    // Filter out points that don't have at least one volume type, and ensure they are within a reasonable range of mid-price
    .filter(p => p.bidVolume !== undefined || p.askVolume !== undefined)
    .filter((_,i,arr) => { // Limit to a reasonable number of points around spread
        if (arr.length <= 60) return true;
        const midIndex = Math.floor(arr.length / 2);
        return i >= midIndex - 30 && i <= midIndex + 30;
    });
};

const MarketDepthChart: FC<MarketDepthChartProps> = ({ orderBook, status }) => {
  const { theme } = useTheme();
  const chartData = processDataForDepthChart(orderBook);

  const strokeColor = theme === 'dark' ? '#A0AEC0' : '#4A5568'; // Muted foreground
  const gridColor = theme === 'dark' ? 'hsl(var(--border))' : 'hsl(var(--border))';
  const bidFillColor = theme === 'dark' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.5)'; // Green
  const askFillColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.5)';   // Red
  const bidStrokeColor = theme === 'dark' ? '#10B981' : '#059669';
  const askStrokeColor = theme === 'dark' ? '#EF4444' : '#DC2626';

  if (status === 'connecting') {
    return (
      <Card className="w-full shadow-lg rounded-lg mt-6">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Market Depth</CardTitle>
          <CardDescription>Connecting to order book...</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] md:h-[400px]">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (status === 'error' || !chartData.length) {
    return (
      <Card className="w-full shadow-lg rounded-lg mt-6">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Market Depth</CardTitle>
          <CardDescription>
             {status === 'error' ? 'Error loading depth data.' : 'No depth data available to display chart.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] md:h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">
             {status === 'error' ? 'Please try again later.' : 'Waiting for data...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg rounded-lg mt-6">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Market Depth: {orderBook?.symbol}</CardTitle>
        <CardDescription>Cumulative bid and ask volume by price level.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] md:h-[400px] p-2">
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
            />
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              stroke={bidStrokeColor} 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke={askStrokeColor} 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => value.toFixed(2)}
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
            <Area yAxisId="left" type="stepAfter" dataKey="bidVolume" stroke={bidStrokeColor} fill={bidFillColor} strokeWidth={2} name="Bids" />
            <Area yAxisId="right" type="stepBefore" dataKey="askVolume" stroke={askStrokeColor} fill={askFillColor} strokeWidth={2} name="Asks" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MarketDepthChart;
