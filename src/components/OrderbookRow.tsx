import React, { useEffect, useState } from 'react';
import { OrderbookEntry } from '../types/orderbook';

interface OrderbookRowProps {
  order: OrderbookEntry;
  side: 'bid' | 'ask';
  maxTotal: string;
}

export const OrderbookRow: React.FC<OrderbookRowProps> = ({ order, side, maxTotal }) => {
  const [flash, setFlash] = useState(false);
  const [prevPrice, setPrevPrice] = useState(order.price);
  const [prevSize, setPrevSize] = useState(order.size);
  const [displayPrice, setDisplayPrice] = useState(order.price);
  const [displaySize, setDisplaySize] = useState(order.size);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (order.price !== prevPrice || order.size !== prevSize) {
      setFlash(true);
      timeout = setTimeout(() => {
        setFlash(false);
        setDisplayPrice(order.price);
        setDisplaySize(order.size);
        setPrevPrice(order.price);
        setPrevSize(order.size);
      }, 300);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [order.price, order.size, prevPrice, prevSize]);

  const percentage = (parseFloat(order.total || '0') / parseFloat(maxTotal)) * 100;
  const bgColor = side === 'bid' ? 'bg-[#0B2337]' : 'bg-[#370B1A]';
  const textColor = side === 'bid' ? 'text-[#00C582]' : 'text-[#FF5B5B]';
  const flashColor = side === 'bid' ? 'bg-[#00C582]/20' : 'bg-[#FF5B5B]/20';

  return (
    <div className={`relative grid grid-cols-3 py-[2px] text-sm hover:bg-[#1E2C3D] transition-all duration-500 ${flash ? flashColor : ''}`}>
      <div
        className={`absolute top-0 right-0 h-full ${bgColor} z-0 opacity-40 transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
      <div className={`relative z-10 text-left ${textColor} transition-all duration-500`}>
        {parseFloat(displayPrice).toFixed(3)}
      </div>
      <div className="relative z-10 text-right transition-all duration-500">
        {parseFloat(displaySize).toFixed(4)}
      </div>
      <div className="relative z-10 text-right transition-all duration-500">
        {parseFloat(order.total || '0').toFixed(4)}
      </div>
    </div>
  );
};