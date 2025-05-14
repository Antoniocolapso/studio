
"use client";

import type { OrderBookData, OrderBookLevel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, Cell } from "recharts";
import { useTheme } from "next-themes";

interface OrderBookChartProps {
  orderBook: OrderBookData | null;
}

const MAX_LEVELS_TO_DISPLAY = 5;

export default function OrderBookChart({ orderBook }: OrderBookChartProps) {
  const { theme } = useTheme();

  if (!orderBook || (!orderBook.asks.length && !orderBook.bids.length)) {
    return (
      <Card className="w-full shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Order Book Levels</CardTitle>
          <CardDescription>No data available to display chart.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Waiting for order book data...</p>
        </CardContent>
      </Card>
    );
  }

  const asks = orderBook.asks
    .slice(0, MAX_LEVELS_TO_DISPLAY)
    .map((level: OrderBookLevel) => ({
      price: parseFloat(level[0]),
      quantity: parseFloat(level[1]),
      type: 'ask',
    }))
    .sort((a, b) => a.price - b.price); // Sort asks by price ascending

  const bids = orderBook.bids
    .slice(0, MAX_LEVELS_TO_DISPLAY)
    .map((level: OrderBookLevel) => ({
      price: parseFloat(level[0]),
      quantity: parseFloat(level[1]),
      type: 'bid',
    }))
    .sort((a, b) => b.price - a.price); // Sort bids by price descending

  const chartData = [...bids, ...asks];

  const chartConfig = {
    bids: {
      label: "Bids",
      color: "hsl(var(--chart-3))", // Greenish (theme variable)
    },
    asks: {
      label: "Asks",
      color: "hsl(var(--chart-5))", // Reddish/Pinkish (theme variable)
    },
    label: { // For label text color
      color: theme === 'dark' ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
    }
  };

  const axisAndGridColor = theme === 'dark' ? "hsl(var(--muted-foreground))" : "hsl(var(--muted-foreground))";
  const gridStrokeColor = theme === 'dark' ? "hsl(var(--border))" : "hsl(var(--border))";
  const labelFillColor = theme === 'dark' ? 'hsl(var(--card-foreground))' : 'hsl(var(--card-foreground))';


  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Top {MAX_LEVELS_TO_DISPLAY} Order Book Levels</CardTitle>
        <CardDescription>Visualization of bid and ask quantities at different price levels.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[350px] w-full aspect-video">
          <BarChart
            data={chartData}
            margin={{ top: 30, right: 20, left: 5, bottom: 20 }} // Increased top margin for labels
            accessibilityLayer
            barGap={4} // Add a small gap between bars
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={gridStrokeColor} />
            <XAxis
              dataKey="price"
              type="number"
              domain={['dataMin - 10', 'dataMax + 10']} // Add some padding to domain
              tickFormatter={(value) => `$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}
              tick={{ fill: axisAndGridColor, fontSize: 12 }}
              axisLine={{ stroke: axisAndGridColor }}
              tickLine={{ stroke: axisAndGridColor }}
              name="Price"
            />
            <YAxis
              dataKey="quantity"
              tickFormatter={(value) => Number(value).toFixed(3)}
              tick={{ fill: axisAndGridColor, fontSize: 12 }}
              axisLine={{ stroke: axisAndGridColor }}
              tickLine={{ stroke: axisAndGridColor }}
              name="Quantity"
              width={70} // Give YAxis a bit more space
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)'}}
              content={
                <ChartTooltipContent
                  labelFormatter={(value, payload) => `Price: $${payload?.[0]?.payload.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                  formatter={(value, name, props) => {
                    const typeDisplay = props.payload.type === 'bid' ? 'Bid Quantity' : 'Ask Quantity';
                    return [`${Number(props.payload.quantity).toFixed(4)} BTC`, typeDisplay];
                  }}
                  itemStyle={{ color: axisAndGridColor }}
                  labelStyle={{ color: axisAndGridColor, fontWeight: 'bold' }}
                />
              }
            />
            <Bar dataKey="quantity" radius={[4, 4, 0, 0]} maxBarSize={80}> {/* Increased maxBarSize */}
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.type === 'bid' ? chartConfig.bids.color : chartConfig.asks.color} />
              ))}
              <LabelList
                dataKey="quantity"
                position="top"
                offset={7} // Adjusted offset
                formatter={(value: number) => Number(value).toFixed(4)}
                fontSize={10}
                fill={labelFillColor} 
                fontWeight="500"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
