import React, { useMemo } from 'react';
import { useOrderbook } from '../hooks/useOrderbook';
import { OrderbookRow } from './OrderbookRow';
import { ValueChangesList } from './ValueChangesList';
import { ArrowUpDown } from 'lucide-react';

export const Orderbook: React.FC = () => {
  const { bids, asks, changes } = useOrderbook();

  const maxTotal = useMemo(() => {
    const bidMax = bids[bids.length - 1]?.total || '0';
    const askMax = asks[asks.length - 1]?.total || '0';
    return Math.max(parseFloat(bidMax), parseFloat(askMax)).toString();
  }, [bids, asks]);

  const midPrice = useMemo(() => {
    if (asks[0] && bids[0]) {
      const askPrice = parseFloat(asks[0].price);
      const bidPrice = parseFloat(bids[0].price);
      return ((askPrice + bidPrice) / 2).toFixed(3);
    }
    return '0.000';
  }, [asks, bids]);

  const spreadPrice = useMemo(() => {
    if (asks[0] && bids[0]) {
      const askPrice = parseFloat(asks[0].price);
      const bidPrice = parseFloat(bids[0].price);
      const spread = askPrice - bidPrice;
      const spreadPercentage = (spread / askPrice) * 100;
      return {
        spread: spread.toFixed(4),
        percentage: spreadPercentage.toFixed(2)
      };
    }
    return { spread: '0.00', percentage: '0.00' };
  }, [asks, bids]);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-[#0B1118] text-gray-100 p-4 rounded-lg w-[480px] font-mono">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Orderbook</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">SOL-USD</span>
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-3 text-xs text-gray-500 mb-2 uppercase">
          <div className="text-left">Price USD</div>
          <div className="text-right">Amount SOL</div>
          <div className="text-right">Total SOL</div>
        </div>

        <div className="space-y-[1px] mb-4">
          {asks.slice().reverse().map((ask) => (
            <OrderbookRow
              key={ask.price}
              order={ask}
              side="ask"
              maxTotal={maxTotal}
            />
          ))}
        </div>

        <div className="text-center py-2 space-y-1 border-y border-gray-800">
          <div className="text-xl font-semibold text-gray-300 transition-all duration-300">
            {midPrice}
          </div>
          <div className="text-xs text-gray-500">
            Spread: {spreadPrice.spread} ({spreadPrice.percentage}%)
          </div>
        </div>

        <div className="space-y-[1px] mt-4">
          {bids.map((bid) => (
            <OrderbookRow
              key={bid.price}
              order={bid}
              side="bid"
              maxTotal={maxTotal}
            />
          ))}
        </div>
      </div>
      
      <ValueChangesList changes={changes} />
    </div>
  );
};