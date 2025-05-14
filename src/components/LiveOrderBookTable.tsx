
"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { OrderBookData, OrderBookLevel } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LiveOrderBookTableProps {
  orderBook: OrderBookData | null;
  status: string;
  variant?: 'default' | 'collapsibleContent';
}

const MAX_LEVELS_DISPLAY = 15;

const formatPrice = (priceStr: string) => parseFloat(priceStr).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatQuantity = (quantityStr: string) => parseFloat(quantityStr).toFixed(4);

const LiveOrderBookTable: FC<LiveOrderBookTableProps> = ({ orderBook, status, variant = 'default' }) => {
  const bids = orderBook?.bids.slice(0, MAX_LEVELS_DISPLAY) ?? [];
  const asks = orderBook?.asks.slice(0, MAX_LEVELS_DISPLAY).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])) ?? [];

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

  const loadingStateSkeleton = (
    <>
      {variant === 'default' && (
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Live Order Book</CardTitle>
          <CardDescription>Connecting to order book...</CardDescription>
        </CardHeader>
      )}
       <div className={cn("h-[400px]", variant === 'default' ? "p-6 pt-0" : "p-6")}>
        {variant === 'collapsibleContent' && (
            <div className="mb-4">
                <Skeleton className="h-6 w-1/3 mb-1" /> {/* For Title placeholder */}
                <Skeleton className="h-4 w-1/2" /> {/* For Description placeholder */}
            </div>
        )}
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    </>
  );

  const errorOrNoDataState = (
    <>
      {variant === 'default' && (
         <CardHeader>
          <CardTitle className="text-xl font-semibold">Live Order Book</CardTitle>
          <CardDescription>
            {status === 'error' ? 'Error loading order book data.' : 'No order book data available.'}
          </CardDescription>
        </CardHeader>
      )}
      <div className={cn("h-[400px] flex items-center justify-center", variant === 'default' ? "p-6 pt-0" : "p-6")}>
         {variant === 'collapsibleContent' && status !== 'error' && !orderBook && (
             <p className="text-muted-foreground text-center">No order book data available.<br/>Waiting for data...</p>
         )}
         {variant === 'collapsibleContent' && status === 'error' && (
             <p className="text-destructive text-center">Error loading order book data.<br/>Please try again later.</p>
         )}
         {variant === 'default' && (
            <p className="text-muted-foreground">
                {status === 'error' ? 'Please try again later.' : 'Waiting for data...'}
            </p>
         )}
      </div>
    </>
  );
  
  const tableContent = (
    <>
      {variant === 'default' && (
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Live Order Book: {orderBook?.symbol}</CardTitle>
          <CardDescription>
            Spread: {spread} ({spreadPercentage})
          </CardDescription>
        </CardHeader>
      )}
      {variant === 'collapsibleContent' && orderBook && (
         <div className="px-6 pt-4 pb-2 text-sm text-muted-foreground">
           Spread: {spread} ({spreadPercentage})
         </div>
      )}
      <div className={cn("p-0", variant === 'collapsibleContent' && "px-6 pb-6 pt-2")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <ScrollArea className="h-[350px] md:h-[400px] md:border-r md:border-border">
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
      </div>
    </>
  );

  if (variant === 'collapsibleContent') {
    if (status === 'connecting') return loadingStateSkeleton;
    if (status === 'error' || !orderBook || (!orderBook.asks.length && !orderBook.bids.length)) return errorOrNoDataState;
    return <>{tableContent}</>;
  }

  // Default variant rendering (full Card)
  return (
    <Card className="w-full shadow-lg rounded-lg">
      {status === 'connecting' && loadingStateSkeleton}
      {(status === 'error' || (status !== 'connecting' && (!orderBook || (!orderBook.asks.length && !orderBook.bids.length)))) && errorOrNoDataState}
      {status === 'connected' && orderBook && (orderBook.asks.length > 0 || orderBook.bids.length > 0) && tableContent}
    </Card>
  );
};

export default LiveOrderBookTable;
