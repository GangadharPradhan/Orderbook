import React from 'react';
import { ValueChange } from '../types/orderbook';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ValueChangesListProps {
  changes: ValueChange[];
}

export const ValueChangesList: React.FC<ValueChangesListProps> = ({ changes }) => {
  const getSizeChange = (oldSize: string, newSize: string) => {
    const oldVal = parseFloat(oldSize);
    const newVal = parseFloat(newSize);
    return {
      increased: newVal > oldVal,
      decreased: newVal < oldVal,
      difference: Math.abs(newVal - oldVal).toFixed(4)
    };
  };

  return (
    <div className="mt-4 bg-[#0B1118] text-gray-100 p-4 rounded-lg w-[480px] font-mono">
      <h3 className="text-sm font-semibold mb-2">Live Order Updates</h3>
      <div className="h-[300px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-800">
        {changes.map((change, index) => {
          const sizeChange = getSizeChange(change.oldSize, change.newSize);
          const isNew = Date.now() - change.timestamp < 500;
          return (
            <div
              key={`${change.timestamp}-${index}`}
              className={`text-xs py-1.5 px-3 rounded flex items-center justify-between
                ${isNew ? 'bg-gray-800/30 animate-pulse' : ''}
                ${change.side === 'bid' ? 'hover:bg-[#0B2337]/30' : 'hover:bg-[#370B1A]/30'}
                transition-all duration-200`}
            >
              <div className="flex items-center space-x-2">
                <span className={`font-semibold ${change.side === 'bid' ? 'text-[#00C582]' : 'text-[#FF5B5B]'}`}>
                  {change.side.toUpperCase()}
                </span>
                <span className="text-gray-400">
                  {parseFloat(change.price).toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center min-w-[80px] justify-end">
                  {sizeChange.increased ? (
                    <ArrowUpRight className="w-3 h-3 text-[#00C582] mr-1" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-[#FF5B5B] mr-1" />
                  )}
                  <span className={`${sizeChange.increased ? 'text-[#00C582]' : 'text-[#FF5B5B]'}`}>
                    {sizeChange.difference}
                  </span>
                </div>
                <span className="text-gray-500 text-[10px] min-w-[60px] text-right">
                  {new Date(change.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: false
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};