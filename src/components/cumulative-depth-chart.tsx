
"use client";

import type { OrderBookData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTheme } from "next-themes";
import { useMemo } from 'react';

interface CumulativeDepthChartProps {
  orderBook: OrderBookData | null;
}

const MAX_DATA_POINTS_DEPTH_CHART = 100; // Limit data points for performance

export default function CumulativeDepthChart({ orderBook }: CumulativeDepthChartProps) {
  const { theme } = useTheme();

  const chartData = useMemo(() => {
    if (!orderBook || (!orderBook.bids.length && !orderBook.asks.length)) {
      return [];
    }

    // Process Bids: cumulative quantity for prices >= P
    const bidsData = orderBook.bids
        .map(level => ({ price: parseFloat(level[0]), quantity: parseFloat(level[1]) }))
        .sort((a, b) => b.price - a.price); // Sort by price descending (e.g., $100, $99, $98)

    // Process Asks: cumulative quantity for prices <= P
    const asksData = orderBook.asks
        .map(level => ({ price: parseFloat(level[0]), quantity: parseFloat(level[1]) }))
        .sort((a, b) => a.price - b.price); // Sort by price ascending (e.g., $101, $102, $103)

    const allUniquePrices = Array.from(
      new Set([...bidsData.map(b => b.price), ...asksData.map(a => a.price)])
    ).sort((a, b) => a - b);
    
    if (allUniquePrices.length === 0) return [];

    // Introduce a sensible range for the chart, can be refined
    const priceSpread = allUniquePrices.length > 1 ? allUniquePrices[allUniquePrices.length -1] - allUniquePrices[0] : allUniquePrices[0] * 0.1;
    const minChartPrice = allUniquePrices[0] - priceSpread * 0.1;
    const maxChartPrice = allUniquePrices[allUniquePrices.length -1] + priceSpread * 0.1;
    
    const stepCount = Math.min(MAX_DATA_POINTS_DEPTH_CHART, allUniquePrices.length * 2 + 20); // Ensure enough steps
    const priceStep = (maxChartPrice - minChartPrice) / stepCount;

    const finalData: { price: number, bids: number | null, asks: number | null }[] = [];

    for (let i = 0; i <= stepCount; i++) {
        const currentPrice = minChartPrice + i * priceStep;
        let cumulativeBidsAtP = 0;
        for (const bid of bidsData) {
            if (bid.price >= currentPrice) {
                cumulativeBidsAtP += bid.quantity;
            }
        }

        let cumulativeAsksAtP = 0;
        for (const ask of asksData) {
            if (ask.price <= currentPrice) {
                cumulativeAsksAtP += ask.quantity;
            }
        }
        finalData.push({ price: currentPrice, bids: cumulativeBidsAtP || null, asks: cumulativeAsksAtP || null });
    }
    
    return finalData;

  }, [orderBook]);


  if (!orderBook || chartData.length === 0) {
    return (
      <Card className="w-full shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Cumulative Depth</CardTitle>
          <CardDescription>No data available to display chart.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Waiting for order book data...</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    bids: { color: "hsl(var(--chart-3))" }, // Greenish
    asks: { color: "hsl(var(--chart-5))" }, // Reddish/Pinkish
  };

  const axisAndGridColor = theme === 'dark' ? "hsl(var(--muted-foreground))" : "hsl(var(--muted-foreground))";
  const gridStrokeColor = theme === 'dark' ? "hsl(var(--border))" : "hsl(var(--border))";
  
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices.filter(p => p > 0));
  const maxPrice = Math.max(...prices);

  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Cumulative Order Book Depth</CardTitle>
        <CardDescription>Visualization of cumulative bid and ask volume across price levels.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[350px] w-full aspect-video">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
            <XAxis
              dataKey="price"
              type="number"
              domain={[minPrice, maxPrice]}
              tickFormatter={(value) => `$${Number(value).toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits: 0})}`}
              tick={{ fill: axisAndGridColor, fontSize: 12 }}
              axisLine={{ stroke: axisAndGridColor }}
              tickLine={{ stroke: axisAndGridColor }}
              name="Price"
            />
            <YAxis
              tickFormatter={(value) => Number(value).toFixed(3)}
              tick={{ fill: axisAndGridColor, fontSize: 12 }}
              axisLine={{ stroke: axisAndGridColor }}
              tickLine={{ stroke: axisAndGridColor }}
              name="Cumulative Quantity"
              width={70}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)'}}
              content={
                <ChartTooltipContent
                  formatter={(value, name, props) => {
                    if (value === null) return null;
                    const typeDisplay = name === 'bids' ? 'Cumulative Bids (at or above price)' : 'Cumulative Asks (at or below price)';
                    return [`${Number(value).toFixed(4)} BTC`, typeDisplay];
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0 && payload[0].payload) {
                       return `Price: $${payload[0].payload.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                    }
                    return "";
                  }}
                  itemStyle={{ color: axisAndGridColor }}
                  labelStyle={{ color: axisAndGridColor, fontWeight: 'bold' }}
                />
              }
            />
            <Area type="linear" dataKey="bids" stroke={chartConfig.bids.color} fillOpacity={0.3} fill={chartConfig.bids.color} name="Bids" strokeWidth={2} connectNulls={true} />
            <Area type="linear" dataKey="asks" stroke={chartConfig.asks.color} fillOpacity={0.3} fill={chartConfig.asks.color} name="Asks" strokeWidth={2} connectNulls={true} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

