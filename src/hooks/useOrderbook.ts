import { useState, useEffect, useCallback, useRef } from 'react';
import { Centrifuge } from 'centrifuge';
import Decimal from 'decimal.js';
import { OrderbookState, OrderbookUpdate, OrderbookEntry, ValueChange } from '../types/orderbook';

const WEBSOCKET_URL = 'wss://api.prod.rabbitx.io/ws';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MDAwMDAwMDAwIiwiZXhwIjo2NTQ4NDg3NTY5fQ.o_qBZltZdDHBH3zHPQkcRhVBQCtejIuyq8V1yj5kYq8';
const CHANNEL = 'orderbook:SOL-USD';
const MAX_ENTRIES = 25;
const MAX_CHANGES = 50;
const RECONNECT_DELAY = 3000;
const UPDATE_THROTTLE = 500; // Add throttle to slow down updates

export const useOrderbook = () => {
  const [orderbook, setOrderbook] = useState<OrderbookState>({
    bids: [],
    asks: [],
    sequence: 0
  });
  const [changes, setChanges] = useState<ValueChange[]>([]);

  const centrifuge = useRef<Centrifuge | null>(null);
  const subscription = useRef<any>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const isConnecting = useRef(false);
  const lastUpdateTime = useRef<number>(0);
  const pendingUpdate = useRef<OrderbookUpdate | null>(null);
  const previousOrders = useRef<{ bids: Map<string, string>, asks: Map<string, string> }>({
    bids: new Map(),
    asks: new Map()
  });

  const trackChanges = useCallback((side: 'bid' | 'ask', price: string, oldSize: string, newSize: string) => {
    const oldVal = parseFloat(oldSize);
    const newVal = parseFloat(newSize);
    if (Math.abs(newVal - oldVal) > 0.0001) {
      setChanges(prev => {
        const newChange: ValueChange = {
          side,
          price,
          oldSize,
          newSize,
          timestamp: Date.now()
        };
        return [newChange, ...prev].slice(0, MAX_CHANGES);
      });
    }
  }, []);

  const processOrders = useCallback((orders: [string, string][], side: 'bid' | 'ask'): OrderbookEntry[] => {
    if (!Array.isArray(orders)) return [];
    
    const prevOrders = side === 'bid' ? previousOrders.current.bids : previousOrders.current.asks;
    const newOrdersMap = new Map(orders);

    newOrdersMap.forEach((size, price) => {
      const prevSize = prevOrders.get(price);
      if (prevSize !== undefined && prevSize !== size) {
        trackChanges(side, price, prevSize, size);
      }
    });

    prevOrders.forEach((size, price) => {
      if (!newOrdersMap.has(price)) {
        trackChanges(side, price, size, '0');
      }
    });

    if (side === 'bid') {
      previousOrders.current.bids = newOrdersMap;
    } else {
      previousOrders.current.asks = newOrdersMap;
    }
    
    return orders
      .filter(order => Array.isArray(order) && order.length === 2)
      .map(([price, size]) => ({
        price: price || '0',
        size: size || '0',
        total: '0'
      }))
      .filter(order => parseFloat(order.size) > 0)
      .sort((a, b) => new Decimal(b.price).minus(a.price).toNumber())
      .slice(0, MAX_ENTRIES);
  }, [trackChanges]);

  const calculateTotals = useCallback((orders: OrderbookEntry[]): OrderbookEntry[] => {
    let runningTotal = new Decimal(0);
    return orders.map(order => {
      runningTotal = runningTotal.plus(order.size);
      return {
        ...order,
        total: runningTotal.toString()
      };
    });
  }, []);

  const updateOrderbook = useCallback((update: OrderbookUpdate) => {
    if (!update || typeof update.sequence !== 'number') {
      console.warn('Invalid update received:', update);
      return;
    }

    const now = Date.now();
    if (now - lastUpdateTime.current < UPDATE_THROTTLE) {
      pendingUpdate.current = update;
      return;
    }

    setOrderbook(prev => {
      if (update.sequence <= prev.sequence) {
        return prev;
      }

      try {
        const newBids = processOrders(update.bids, 'bid');
        const newAsks = processOrders(update.asks, 'ask');

        if (!newBids.length && !newAsks.length) {
          return prev;
        }

        lastUpdateTime.current = now;
        return {
          bids: calculateTotals(newBids),
          asks: calculateTotals(newAsks),
          sequence: update.sequence
        };
      } catch (error) {
        console.error('Error processing orderbook update:', error);
        return prev;
      }
    });
  }, [processOrders, calculateTotals]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingUpdate.current && Date.now() - lastUpdateTime.current >= UPDATE_THROTTLE) {
        updateOrderbook(pendingUpdate.current);
        pendingUpdate.current = null;
      }
    }, UPDATE_THROTTLE);

    return () => clearInterval(interval);
  }, [updateOrderbook]);

  const connect = useCallback(() => {
    if (isConnecting.current) return;
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);

    isConnecting.current = true;

    if (centrifuge.current) {
      try {
        centrifuge.current.disconnect();
      } catch (error) {
        console.warn('Error disconnecting:', error);
      }
    }

    try {
      centrifuge.current = new Centrifuge(WEBSOCKET_URL, {
        token: JWT_TOKEN,
        timeout: 3000,
        maxRetry: 10,
        debug: false
      });

      centrifuge.current.on('connected', () => {
        console.log('Connected to websocket');
        isConnecting.current = false;
      });

      centrifuge.current.on('disconnected', () => {
        console.log('Disconnected from websocket');
        isConnecting.current = false;
        
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, RECONNECT_DELAY);
      });

      subscription.current = centrifuge.current.newSubscription(CHANNEL);

      subscription.current.on('publication', (ctx: any) => {
        if (ctx && ctx.data) {
          updateOrderbook(ctx.data as OrderbookUpdate);
        }
      });

      subscription.current.on('error', (err: Error) => {
        console.error('Subscription error:', err);
        isConnecting.current = false;
      });

      centrifuge.current.connect();
      subscription.current.subscribe();
    } catch (error) {
      console.error('Error during connection setup:', error);
      isConnecting.current = false;
      
      reconnectTimeout.current = setTimeout(() => {
        console.log('Attempting to reconnect after error...');
        connect();
      }, RECONNECT_DELAY);
    }
  }, [updateOrderbook]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      if (subscription.current) {
        try {
          subscription.current.unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing:', error);
        }
      }

      if (centrifuge.current) {
        try {
          centrifuge.current.disconnect();
        } catch (error) {
          console.warn('Error disconnecting:', error);
        }
      }
    };
  }, [connect]);

  return { ...orderbook, changes };
};