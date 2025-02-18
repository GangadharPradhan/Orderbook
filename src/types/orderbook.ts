export interface OrderbookEntry {
  price: string;
  size: string;
  total?: string;
}

export interface OrderbookUpdate {
  bids: [string, string][];
  asks: [string, string][];
  sequence: number;
}

export interface OrderbookState {
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  sequence: number;
}

export interface ValueChange {
  side: 'bid' | 'ask';
  price: string;
  oldSize: string;
  newSize: string;
  timestamp: number;
}