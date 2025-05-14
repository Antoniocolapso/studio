
"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { OrderBookData, OrderBookLevel } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface LiveOrderBookTableProps {
  orderBook: OrderBookData | null;
  status: string;
}

const MAX_LEVELS_DISPLAY = 15; // Show top N levels

const formatPrice = (priceStr: string) => parseFloat(priceStr).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatQuantity = (quantityStr: string) => parseFloat(quantityStr).toFixed(4);

const LiveOrderBookTable: FC<LiveOrderBookTableProps> = ({ orderBook, status }) => {
  if (status === 'connecting') {
    return (
      <Card className="w-full shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Live Order Book</CardTitle>
          <CardDescription>Connecting to order book...</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'error' || !orderBook || (!orderBook.asks.length && !orderBook.bids.length)) {
    return (
      <Card className="w-full shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Live Order Book</CardTitle>
          <CardDescription>
            {status === 'error' ? 'Error loading order book data.' : 'No order book data available.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">
            {status === 'error' ? 'Please try again later.' : 'Waiting for data...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const bids = orderBook.bids.slice(0, MAX_LEVELS_DISPLAY);
  const asks = orderBook.asks.slice(0, MAX_LEVELS_DISPLAY).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])); // Asks are typically displayed lowest price first

  // Find spread
  const bestBid = bids.length > 0 ? parseFloat(bids[0][0]) : 0;
  const bestAsk = asks.length > 0 ? parseFloat(asks[0][0]) : 0;
  const spread = bestAsk > 0 && bestBid > 0 ? (bestAsk - bestBid).toFixed(2) : "N/A";
  const spreadPercentage = bestAsk > 0 && bestBid > 0 ? ((bestAsk - bestBid) / bestAsk * 100).toFixed(2) + "%" : "N/A";


  const renderRows = (levels: OrderBookLevel[], type: 'bid' | 'ask') => {
    let cumulativeQuantity = 0;
    return levels.map((level, index) => {
      const price = parseFloat(level[0]);
      const quantity = parseFloat(level[1]);
      cumulativeQuantity += quantity;
      return (
        <TableRow key={`${type}-${price}-${index}`} className={type === 'bid' ? 'bg-green-500/10 dark:bg-green-700/20' : 'bg-red-500/10 dark:bg-red-700/20'}>
          <TableCell className={`text-xs font-medium ${type === 'bid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatPrice(level[0])}
          </TableCell>
          <TableCell className="text-xs text-right">{formatQuantity(level[1])}</TableCell>
          <TableCell className="text-xs text-right text-muted-foreground">{cumulativeQuantity.toFixed(4)}</TableCell>
        </TableRow>
      );
    });
  };

  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Live Order Book: {orderBook.symbol}</CardTitle>
        <CardDescription>
          Spread: {spread} ({spreadPercentage})
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <ScrollArea className="h-[350px] md:h-[400px] border-r border-border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3 text-green-600 dark:text-green-400">Bid Price</TableHead>
                  <TableHead className="w-1/3 text-right">Quantity</TableHead>
                  <TableHead className="w-1/3 text-right">Cumulative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderRows(bids, 'bid')}
              </TableBody>
            </Table>
          </ScrollArea>
          <ScrollArea className="h-[350px] md:h-[400px]">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3 text-red-600 dark:text-red-400">Ask Price</TableHead>
                  <TableHead className="w-1/3 text-right">Quantity</TableHead>
                  <TableHead className="w-1/3 text-right">Cumulative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderRows(asks, 'ask')}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveOrderBookTable;
