'use client';

import React from 'react';

interface VirtualChipsProps {
  total: number;
  remaining: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const VirtualChips: React.FC<VirtualChipsProps> = ({
  total,
  remaining,
  size = 'md',
  showLabel = true,
}) => {
  const sizeMap = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  return (
    <div className="flex flex-col gap-1.5">
      {showLabel && (
        <div className="flex items-center justify-between text-xs font-semibold text-[#A0A0A0]">
          <span>VIRTUAL CHIPS</span>
          <span className="text-[#F538A0] font-mono">{remaining} / {total}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 items-center">
        {Array.from({ length: total }).map((_, index) => {
          const isAlive = index < remaining;
          return (
            <div
              key={index}
              className={`rounded-full flex items-center justify-center font-bold font-mono transition-all duration-300 border-2 ${sizeMap} ${
                isAlive
                  ? 'bg-gradient-to-br from-[#F538A0] to-[#b31b6e] text-white border-[#ff7bc4] shadow-[0_0_8px_rgba(245,56,160,0.4)]'
                  : 'bg-[#1e1e1e] text-[#444] border-[#2c2c2c] opacity-35 scale-90'
              }`}
            >
              {isAlive ? '●' : '×'}
            </div>
          );
        })}
      </div>
    </div>
  );
};
