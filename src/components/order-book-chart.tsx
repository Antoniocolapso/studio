"use client";

import type { OrderBookData, OrderBookLevel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts";
import { useTheme } from "next-themes";

interface OrderBookChartProps {
  orderBook: OrderBookData | null;
}

const  MAX_LEVELS_TO_DISPLAY = 5;

export default function OrderBookChart({ orderBook }: OrderBookChartProps) {
  const { theme } = useTheme();

  if (!orderBook || (!orderBook.asks.length && !orderBook.bids.length)) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Order Book Depth</CardTitle>
          <CardDescription>No data available to display chart.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Waiting for order book data...</p>
        </CardContent>
      </Card>>
    );
  }

  // Take top N asks (lowest price) and top N bids (highest price)
  const asks = orderBook.asks.slice(0, MAX_LEVELS_TO_DISPLAY).map((level: OrderBookLevel) => ({
    price: parseFloat(level[0]),
    quantity: parseFloat(level[1]),
    type: 'ask',
  })).sort((a,b) => a.price - b.price); // Sort asks by price ascending

  const bids = orderBook.bids.slice(0, MAX_LEVELS_TO_DISPLAY).map((level: OrderBookLevel) => ({
    price: parseFloat(level[0]),
    quantity: parseFloat(level[1]),
    type: 'bid',
  })).sort((a,b) => b.price - a.price); // Sort bids by price descending

  const chartData = [...bids, ...asks];

  const strokeColor = theme === 'dark' ? '#a0a0a0' : '#666666'; // Lighter for dark, darker for light

  const chartConfig = {
    quantity: {
      label: "Quantity",
    },
    bids: {
      label: "Bids",
      color: "hsl(var(--chart-3))", // Greenish
    },
    asks: {
      label: "Asks",
      color: "hsl(var(--chart-5))", // Reddish/Pinkish
    },
  };
  
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Order Book Depth (Top {MAX_LEVELS_TO_DISPLAY} Levels)</CardTitle>
        <CardDescription>Visualization of bid and ask quantities at different price levels.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={strokeColor} />
            <XAxis
              dataKey="price"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              tick={{ fill: strokeColor, fontSize: 12 }}
              axisLine={{ stroke: strokeColor }}
              tickLine={{ stroke: strokeColor }}
              name="Price"
            />
            <YAxis 
              dataKey="quantity" 
              tickFormatter={(value) => value.toFixed(3)}
              tick={{ fill: strokeColor, fontSize: 12 }}
              axisLine={{ stroke: strokeColor }}
              tickLine={{ stroke: strokeColor }}
              name="Quantity"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                labelFormatter={(value, payload) => `Price: $${payload?.[0]?.payload.price.toLocaleString()}`}
                formatter={(value, name, props) => [`${Number(props.payload.quantity).toFixed(4)} BTC`, props.payload.type === 'bid' ? 'Bid Quantity' : 'Ask Quantity']}
              />}
            />
            <Bar dataKey="quantity" radius={4}>
              {chartData.map((entry, index) => (
                <LabelList
                  key={`label-${index}`}
                  dataKey="quantity"
                  position="top"
                  offset={5}
                  formatter={(value: number) => value.toFixed(3)}
                  fontSize={10}
                  fill={entry.type === 'bid' ? chartConfig.bids.color : chartConfig.asks.color}
                />
              ))}
            </Bar>
             <Bar dataKey="quantity" name="Bids" fill="var(--color-bids)" stackId="stack">
              {bids.map((entry, index) => (
                <LabelList
                  key={`bid-label-${index}`}
                  dataKey="quantity"
                  position="top"
                  offset={5}
                  formatter={(value: number) => value.toFixed(3)}
                  fontSize={10}
                  fill={theme === 'dark' ? 'white' : 'black'}
                />
              ))}
            </Bar>
            <Bar dataKey="quantity" name="Asks" fill="var(--color-asks)" stackId="stack">
               {asks.map((entry, index) => (
                <LabelList
                  key={`ask-label-${index}`}
                  dataKey="quantity"
                  position="top"
                  offset={5}
                  formatter={(value: number) => value.toFixed(3)}
                  fontSize={10}
                  fill={theme === 'dark' ? 'white' : 'black'}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
