'use client';

import React, { useState } from 'react';

interface PlayerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (playerInfo: { name: string; memberId?: string; role: 'player' | 'director' }) => void;
}

export const PlayerLoginModal: React.FC<PlayerLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<'player' | 'director'>('player');
  const [searchQuery, setSearchQuery] = useState('');
  const [directorPin, setDirectorPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePlayerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setErrorMsg('Please enter your name or APA Member ID');
      return;
    }

    if (onLoginSuccess) {
      onLoginSuccess({
        name: searchQuery.trim(),
        role: 'player',
      });
    }
    onClose();
  };

  const handleDirectorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default demo Director PIN or environment PIN
    if (directorPin === '1234' || directorPin === '9300') {
      if (onLoginSuccess) {
        onLoginSuccess({
          name: 'Tournament Director',
          role: 'director',
        });
      }
      onClose();
    } else {
      setErrorMsg('Incorrect Director PIN. (Hint: Try 1234)');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#161616] border border-[#333] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎱</span>
            <div>
              <h3 className="font-bold text-white text-base">Table i-Cue Sign In</h3>
              <p className="text-[11px] text-[#888]">Lucky Cue Billiards (Moorpark, CA)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#888] hover:text-white text-lg">
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#121212] p-1 rounded-xl border border-[#222]">
          <button
            onClick={() => {
              setActiveMode('player');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'player'
                ? 'bg-[#12B5CB] text-black shadow'
                : 'text-[#888] hover:text-white'
            }`}
          >
            👤 Player Quick Look-Up
          </button>
          <button
            onClick={() => {
              setActiveMode('director');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'director'
                ? 'bg-[#12B5CB] text-black shadow'
                : 'text-[#888] hover:text-white'
            }`}
          >
            🔑 Director PIN
          </button>
        </div>

        {/* Forms */}
        {activeMode === 'player' ? (
          <form onSubmit={handlePlayerLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#A0A0A0] block mb-1.5">
                Player Name or APA Member ID
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Fahad Khan, Umber C, or 8-digit ID"
                className="w-full bg-[#121212] border border-[#2c2c2c] focus:border-[#12B5CB] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                autoFocus
              />
              <p className="text-[10px] text-[#777] mt-1">
                No password required. Connects to your live match scoreboard and career stats.
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-950/40 border border-red-500 rounded-lg text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#12B5CB] hover:bg-[#0fa0b4] text-black font-black py-2.5 rounded-xl transition-all shadow text-xs tracking-wider uppercase"
            >
              Sign In & View My Stats
            </button>
          </form>
        ) : (
          <form onSubmit={handleDirectorLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#A0A0A0] block mb-1.5">
                Tournament Director PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={directorPin}
                onChange={(e) => setDirectorPin(e.target.value)}
                placeholder="Enter 4-digit PIN (default: 1234)"
                className="w-full bg-[#121212] border border-[#2c2c2c] focus:border-[#12B5CB] rounded-xl px-4 py-2.5 text-sm text-center text-white tracking-widest font-mono focus:outline-none"
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-950/40 border border-red-500 rounded-lg text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#12B5CB] hover:bg-[#0fa0b4] text-black font-black py-2.5 rounded-xl transition-all shadow text-xs tracking-wider uppercase"
            >
              Unlock Director Controls
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
