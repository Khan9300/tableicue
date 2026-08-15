'use client';

import React, { useState, useEffect } from 'react';
import { sounds } from '../../lib/audio/soundEffects';

interface AnimatedFlipCounterProps {
  value: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onIncrement?: () => void;
  onDecrement?: () => void;
  interactive?: boolean;
}

export const AnimatedFlipCounter: React.FC<AnimatedFlipCounterProps> = ({
  value,
  label,
  size = 'lg',
  onIncrement,
  onDecrement,
  interactive = false,
}) => {
  const [currentVal, setCurrentVal] = useState(value);
  const [prevVal, setPrevVal] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value !== currentVal) {
      setPrevVal(currentVal);
      setCurrentVal(value);
      setIsFlipping(true);
      sounds.playFlipClick();
      const timer = setTimeout(() => setIsFlipping(false), 450);
      return () => clearTimeout(timer);
    }
  }, [value, currentVal]);

  const sizeClasses = {
    sm: 'text-2xl w-14 h-18 py-2',
    md: 'text-4xl w-20 h-24 py-3',
    lg: 'text-6xl w-28 h-36 py-4',
    xl: 'text-8xl w-36 h-48 py-6',
  }[size];

  return (
    <div className="flex flex-col items-center select-none">
      {label && <span className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-2">{label}</span>}
      <div className="relative group">
        <div
          className={`relative bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl flex items-center justify-center font-mono font-bold text-white shadow-2xl overflow-hidden ${sizeClasses} ${
            isFlipping ? 'border-[#12B5CB] glow-cyan' : ''
          }`}
        >
          {/* Top Half Split Line */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#222222] z-10" />

          {/* Value Display */}
          <span className={`transition-transform duration-300 ${isFlipping ? 'scale-110 text-[#12B5CB]' : 'text-white'}`}>
            {currentVal}
          </span>
        </div>

        {interactive && (
          <div className="flex gap-2 mt-3 justify-center">
            <button
              onClick={onDecrement}
              className="bg-[#1A1A1A] hover:bg-[#252525] active:scale-95 text-white border border-[#333] px-4 py-1.5 rounded-lg text-lg font-bold transition-all"
            >
              -
            </button>
            <button
              onClick={onIncrement}
              className="bg-[#12B5CB] hover:bg-[#0fa0b4] active:scale-95 text-black px-4 py-1.5 rounded-lg text-lg font-bold transition-all"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
