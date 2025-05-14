
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { OrderBookData, WebSocketStatus } from '@/types';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
const RECONNECT_DELAY = 5000; // 5 seconds

export function useOrderbook() {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    setError(null);

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    socketRef.current = new WebSocket(WEBSOCKET_URL);

    socketRef.current.onopen = () => {
      setStatus('connected');
      setError(null);
    };

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as OrderBookData;
        setOrderBook(data);
      } catch (e) {
        console.error('Failed to parse order book data:', e);
        setError('Failed to parse order book data.');
      }
    };

    socketRef.current.onerror = (event) => {
      console.error('WebSocket error:', event);
      setStatus('error');
      setError('WebSocket connection error. Check console for details.');
      // Automatic reconnection is handled by onclose
    };

    socketRef.current.onclose = () => {
      setStatus('disconnected');
      if (document.visibilityState === 'visible') { // Only attempt to reconnect if tab is active
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };
  }, []);

  useEffect(() => {
    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
          connect();
        }
      } else {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return { orderBook, status, error };
}
