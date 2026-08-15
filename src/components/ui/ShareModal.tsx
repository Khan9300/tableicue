'use client';

import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tablesCount?: number;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, tablesCount = 4 }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tableicue.app';
  const tvUrl = `${origin}/tv`;

  const copyToClipboard = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📺</span>
            <h3 className="text-lg font-bold text-white">Broadcast & Table Links</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#888] hover:text-white font-mono text-lg px-2"
          >
            ✕
          </button>
        </div>

        {/* TV Environmental Display Link */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#12B5CB]">
            TV Display Mode (Pool Hall Monitors)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={tvUrl}
              className="bg-[#121212] border border-[#333] text-white text-xs px-3.5 py-2.5 rounded-lg flex-1 font-mono select-all"
            />
            <button
              onClick={() => copyToClipboard(tvUrl, 'tv')}
              className="bg-[#12B5CB] hover:bg-[#0fa0b4] text-black font-bold px-4 py-2 rounded-lg text-xs transition-colors"
            >
              {copiedKey === 'tv' ? 'Copied! ✓' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-[#888]">
            Open this URL on Fire TV, Apple TV, or Smart TV browsers for the 3-column live environmental view.
          </p>
        </div>

        {/* Table Specific Mobile Scoreboard Links */}
        <div className="space-y-3 pt-2 border-t border-[#222]">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#F538A0]">
            Table Mobile Scoreboard Links
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: tablesCount }).map((_, idx) => {
              const tableNum = idx + 1;
              const tableUrl = `${origin}?table=${tableNum}&tab=mobile_score`;
              return (
                <div
                  key={tableNum}
                  className="bg-[#121212] border border-[#222] p-3 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-white">Table #{tableNum}</div>
                    <div className="text-[10px] text-[#888] font-mono">Mobile Scoreboard</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(tableUrl, `tbl-${tableNum}`)}
                    className="text-xs bg-[#222] hover:bg-[#333] text-[#12B5CB] px-2.5 py-1 rounded font-mono font-bold"
                  >
                    {copiedKey === `tbl-${tableNum}` ? '✓' : 'Copy'}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#888]">
            Print table QR codes with these URLs so players can tap and score directly at their table.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#242424] hover:bg-[#333] text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
