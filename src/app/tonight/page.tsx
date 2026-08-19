'use client';

import React, { useState, useMemo, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════════ */
/* Types                                                              */
/* ═══════════════════════════════════════════════════════════════════ */

interface Player {
  name: string;
  sl: number;
  wins: number;
  losses: number;
  wr: number;
  label?: string;
}

interface MatchResult {
  ourPlayer: Player;
  theirPlayer: Player;
  won: boolean | null; // null = in progress
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Rosters — from live Supabase scrape                                */
/* ═══════════════════════════════════════════════════════════════════ */

const OUR_FULL_ROSTER: Player[] = [
  { name: 'Jason Krepel',     label: 'Cowboy',  sl: 6, wins: 6, losses: 1, wr: 6 / 7 },
  { name: 'Felix Katz',       label: 'Felix',   sl: 6, wins: 4, losses: 3, wr: 4 / 7 },
  { name: 'Fahad Khan',       label: 'Fahad',   sl: 5, wins: 8, losses: 2, wr: 8 / 10 },
  { name: 'Tristen Waters',   label: 'Tristen', sl: 4, wins: 6, losses: 5, wr: 6 / 11 },
  { name: 'Mircea Marinescu', label: 'Mircea',  sl: 4, wins: 3, losses: 3, wr: 3 / 6 },
  { name: 'Umber Chohan',     label: 'Umber',   sl: 3, wins: 2, losses: 6, wr: 2 / 8 },
  { name: 'Bailey Watts',     label: 'Bailey',  sl: 3, wins: 2, losses: 2, wr: 2 / 4 },
];

const SOUTH_COASTERS: Player[] = [
  { name: 'Joseph Le',          sl: 7, wins: 3, losses: 3, wr: 3 / 6 },
  { name: 'Duff Lin',           sl: 7, wins: 3, losses: 3, wr: 3 / 6 },
  { name: 'Jordan Le',          sl: 5, wins: 5, losses: 2, wr: 5 / 7 },
  { name: 'Jordan Rahhal',      sl: 5, wins: 2, losses: 7, wr: 2 / 9 },
  { name: 'Juan Carlo Mallari', sl: 4, wins: 8, losses: 0, wr: 0.85 },
  { name: 'Sydney Lusche',      sl: 4, wins: 4, losses: 2, wr: 4 / 6 },
  { name: 'Jose Belmontes',     sl: 3, wins: 4, losses: 4, wr: 4 / 8 },
  { name: 'Florence Luu',       sl: 3, wins: 2, losses: 7, wr: 2 / 9 },
];

const SL_CAP = 23;

/* ═══════════════════════════════════════════════════════════════════ */
/* Utilities                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

function h2h(ourWr: number, theirWr: number): number {
  const total = ourWr + theirWr;
  return total === 0 ? 0.5 : ourWr / total;
}
function pctStr(n: number): string { return `${(n * 100).toFixed(0)}%`; }
function displayName(p: Player): string { return p.label || p.name.split(' ')[0]; }

function wrColor(pct: number): string {
  if (pct >= 0.55) return 'text-emerald-400';
  if (pct >= 0.45) return 'text-amber-400';
  return 'text-red-400';
}
function wrBadge(pct: number): string {
  if (pct >= 0.55) return '✅';
  if (pct >= 0.45) return '⚠️';
  return '❌';
}
function threatColor(wr: number): string {
  if (wr >= 0.70) return 'text-red-400';
  if (wr >= 0.55) return 'text-orange-400';
  if (wr >= 0.45) return 'text-amber-400';
  return 'text-emerald-400';
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Lineup builder — all legal 5-player combos ≤23 SL                  */
/* ═══════════════════════════════════════════════════════════════════ */

function buildLegalLineups(available: Player[]): Player[][] {
  const results: Player[][] = [];
  const n = available.length;
  const pick = (start: number, cur: Player[]) => {
    if (cur.length === 5) {
      if (cur.reduce((s, p) => s + p.sl, 0) <= SL_CAP) results.push([...cur]);
      return;
    }
    for (let i = start; i < n; i++) { cur.push(available[i]); pick(i + 1, cur); cur.pop(); }
  };
  pick(0, []);
  results.sort((a, b) => {
    const wA = a.reduce((s, p) => s + p.wr, 0) / 5;
    const wB = b.reduce((s, p) => s + p.wr, 0) / 5;
    return wB - wA;
  });
  return results;
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Counter-pick engine                                                */
/* ═══════════════════════════════════════════════════════════════════ */

function recommendCounter(
  their: Player,
  ours: Player[],
  theirRemaining: Player[],
) {
  if (ours.length === 0) return null;

  const theirRanked = [...theirRemaining].sort((a, b) => b.wr - a.wr);
  const rank = theirRanked.findIndex(p => p.name === their.name);
  const pool = theirRanked.length;
  const ourRanked = [...ours].sort((a, b) => b.wr - a.wr);
  const prop = pool > 1 ? rank / (pool - 1) : 0;
  const idx = Math.round(prop * (ourRanked.length - 1));
  const rec = ourRanked[Math.max(0, Math.min(idx, ourRanked.length - 1))];
  const pct = h2h(rec.wr, their.wr);

  let reasoning: string;
  if (rank === 0)          reasoning = 'Their strongest remaining. Send your best available.';
  else if (rank === pool - 1) reasoning = 'Their weakest remaining. Save your aces for later.';
  else                        reasoning = `Ranked #${rank + 1} of ${pool} remaining. Mirror-match strength.`;

  return { player: rec, h2hPct: pct, reasoning };
}

/* ═══════════════════════════════════════════════════════════════════ */
/* PlayerCard                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

const PlayerCard: React.FC<{
  player: Player;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  showH2h?: number;
}> = ({ player, onClick, selected, disabled, showH2h }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left rounded-xl border transition-all p-2.5
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'}
      ${selected
        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/10'
        : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#444]'}`}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0 w-7 h-7 rounded-lg bg-[#222] border border-[#333] flex items-center justify-center text-xs font-black font-mono text-cyan-400">
          {player.sl}
        </span>
        <div className="min-w-0">
          <div className="font-bold text-sm truncate">{displayName(player)}</div>
          <div className="text-[10px] text-[#666] font-mono truncate">{player.name}</div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-black font-mono ${threatColor(player.wr)}`}>{pctStr(player.wr)}</div>
        <div className="text-[10px] text-[#666] font-mono">{player.wins}-{player.losses}</div>
      </div>
    </div>
    {showH2h !== undefined && (
      <div className="mt-2 pt-2 border-t border-[#2a2a2a] flex items-center justify-between">
        <span className="text-[10px] text-[#888] uppercase font-mono">Win Prob</span>
        <span className={`text-sm font-black font-mono ${wrColor(showH2h)}`}>
          {wrBadge(showH2h)} {pctStr(showH2h)}
        </span>
      </div>
    )}
  </button>
);

/* ═══════════════════════════════════════════════════════════════════ */
/* Main Page                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

export default function TonightDashboard() {
  const [baileyHere, setBaileyHere]           = useState(false);
  const [selectedLineupIdx, setSelectedLineupIdx] = useState(0);
  const [matchResults, setMatchResults]       = useState<MatchResult[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<Player | null>(null);
  const [view, setView]                       = useState<'counter' | 'lineup' | 'score'>('counter');

  /* Available players (Kobe OUT) */
  const available = useMemo(
    () => OUR_FULL_ROSTER.filter(p => p.name !== 'Kobe Barredo' && (baileyHere || p.name !== 'Bailey Watts')),
    [baileyHere],
  );

  const lineups       = useMemo(() => buildLegalLineups(available), [available]);
  const activeLineup  = lineups[selectedLineupIdx] || lineups[0] || [];
  const lineupSL      = activeLineup.reduce((s, p) => s + p.sl, 0);

  const usedOurs   = useMemo(() => new Set(matchResults.filter(m => m.won !== null).map(m => m.ourPlayer.name)), [matchResults]);
  const usedTheirs = useMemo(() => new Set(matchResults.filter(m => m.won !== null).map(m => m.theirPlayer.name)), [matchResults]);

  const oursLeft   = useMemo(() => activeLineup.filter(p => !usedOurs.has(p.name)), [activeLineup, usedOurs]);
  const theirsLeft = useMemo(() => SOUTH_COASTERS.filter(p => !usedTheirs.has(p.name)), [usedTheirs]);

  const rec = useMemo(
    () => (selectedOpponent ? recommendCounter(selectedOpponent, oursLeft, theirsLeft) : null),
    [selectedOpponent, oursLeft, theirsLeft],
  );

  const ourWins    = matchResults.filter(m => m.won === true).length;
  const theirWins  = matchResults.filter(m => m.won === false).length;
  const inProgress = matchResults.find(m => m.won === null);
  const completed  = matchResults.filter(m => m.won !== null).length;

  /* Night-win probability */
  const nightProb = useMemo(() => {
    const rem = 5 - completed;
    if (rem === 0) return ourWins >= 3 ? 1 : 0;
    const avgO = oursLeft.length > 0 ? oursLeft.reduce((s, p) => s + p.wr, 0) / oursLeft.length : 0.5;
    const avgT = theirsLeft.length > 0 ? theirsLeft.reduce((s, p) => s + p.wr, 0) / theirsLeft.length : 0.5;
    const p = h2h(avgO, avgT);
    const need = 3 - ourWins;
    if (need <= 0) return 1;
    if (need > rem) return 0;
    let prob = 0;
    for (let k = need; k <= rem; k++) {
      const c = factorial(rem) / (factorial(k) * factorial(rem - k));
      prob += c * Math.pow(p, k) * Math.pow(1 - p, rem - k);
    }
    return prob;
  }, [ourWins, completed, oursLeft, theirsLeft]);

  const lockIn = useCallback(() => {
    if (!selectedOpponent || !rec) return;
    setMatchResults(prev => [...prev, { ourPlayer: rec.player, theirPlayer: selectedOpponent, won: null }]);
    setSelectedOpponent(null);
  }, [selectedOpponent, rec]);

  const record = useCallback((won: boolean) => {
    setMatchResults(prev => {
      const u = [...prev];
      const i = u.findIndex(m => m.won === null);
      if (i >= 0) u[i] = { ...u[i], won };
      return u;
    });
  }, []);

  const undo = useCallback(() => {
    setMatchResults(prev => {
      if (prev.length === 0) return prev;
      const u = [...prev];
      const lastDone = [...u].reverse().findIndex(m => m.won !== null);
      if (lastDone >= 0) u.splice(u.length - 1 - lastDone, 1);
      else u.pop();
      return u;
    });
  }, []);

  const reset = useCallback(() => {
    setBaileyHere(false);
    setSelectedLineupIdx(0);
    setMatchResults([]);
    setSelectedOpponent(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28">
      {/* ─── STICKY HEADER ─── */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-[#1a1a1a]">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black tracking-tight">🎱 Tonight</h1>
              <p className="text-[10px] text-[#666] font-mono">vs South Coasters &bull; Finale &bull; Lucky Cue 7pm</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center leading-none">
                <div className="text-2xl font-black font-mono text-cyan-400">{ourWins}</div>
                <div className="text-[7px] text-[#555] font-mono mt-0.5">TIC</div>
              </div>
              <div className="text-[#333] font-mono">:</div>
              <div className="text-center leading-none">
                <div className="text-2xl font-black font-mono text-red-400">{theirWins}</div>
                <div className="text-[7px] text-[#555] font-mono mt-0.5">SC</div>
              </div>
            </div>
          </div>
          {/* Win probability bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${nightProb * 100}%` }}
              />
            </div>
            <span className={`text-[11px] font-black font-mono ${wrColor(nightProb)}`}>
              {pctStr(nightProb)}
            </span>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex gap-1">
          {(['counter', 'lineup', 'score'] as const).map(t => (
            <button
              key={t}
              onClick={() => setView(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                view === t ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25' : 'text-[#555]'
              }`}
            >
              {t === 'counter' ? '🎯 Counter' : t === 'lineup' ? '📋 Lineups' : '📊 Score'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* ─── Bailey toggle ─── */}
        <div className="flex items-center justify-between p-3 bg-[#111] rounded-xl border border-[#222] mb-4">
          <div>
            <div className="text-sm font-bold">Bailey here?</div>
            <div className="text-[10px] text-[#555]">
              {baileyHere
                ? `✅ SL 3 • 2-2 • ${lineups.length} legal lineups`
                : `❌ Without her: ${lineups.length} legal lineups`}
            </div>
          </div>
          <button
            onClick={() => { setBaileyHere(!baileyHere); setSelectedLineupIdx(0); setMatchResults([]); setSelectedOpponent(null); }}
            className={`w-14 h-7 rounded-full transition-all relative ${baileyHere ? 'bg-emerald-500' : 'bg-[#333]'}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all ${baileyHere ? 'left-7' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Active lineup pill */}
        <div className="flex flex-wrap gap-1 mb-4">
          {activeLineup.sort((a, b) => b.sl - a.sl).map(p => (
            <span key={p.name} className={`text-[11px] px-2 py-1 rounded-lg font-mono font-bold border ${
              usedOurs.has(p.name) ? 'bg-[#111] border-[#222] text-[#444] line-through' : 'bg-[#141414] border-[#2a2a2a] text-white'
            }`}>
              {displayName(p)}<span className="text-[#666]">({p.sl})</span>
            </span>
          ))}
          <span className="text-[11px] px-2 py-1 rounded-lg font-mono text-[#555] bg-[#111] border border-[#1a1a1a]">
            SL {lineupSL}
          </span>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* COUNTER-PICK VIEW                                      */}
        {/* ═══════════════════════════════════════════════════════ */}
        {view === 'counter' && (
          <>
            {/* In-progress match */}
            {inProgress && (
              <div className="mb-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <div className="text-[10px] text-amber-400 font-mono font-bold uppercase mb-3">🔴 Match In Progress</div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center flex-1">
                    <div className="text-xl font-black text-cyan-400">{displayName(inProgress.ourPlayer)}</div>
                    <div className="text-[10px] text-[#888] font-mono">SL {inProgress.ourPlayer.sl} • {pctStr(inProgress.ourPlayer.wr)}</div>
                  </div>
                  <div className="text-xs text-[#444] font-mono">vs</div>
                  <div className="text-center flex-1">
                    <div className="text-xl font-black text-red-400">{displayName(inProgress.theirPlayer)}</div>
                    <div className="text-[10px] text-[#888] font-mono">SL {inProgress.theirPlayer.sl} • {pctStr(inProgress.theirPlayer.wr)}</div>
                  </div>
                </div>
                <div className="text-center mb-4">
                  <span className={`text-lg font-black font-mono ${wrColor(h2h(inProgress.ourPlayer.wr, inProgress.theirPlayer.wr))}`}>
                    {wrBadge(h2h(inProgress.ourPlayer.wr, inProgress.theirPlayer.wr))} {pctStr(h2h(inProgress.ourPlayer.wr, inProgress.theirPlayer.wr))} H2H
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => record(true)} className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-black transition-all active:scale-95">
                    ✅ WE WON
                  </button>
                  <button onClick={() => record(false)} className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-black transition-all active:scale-95">
                    ❌ THEY WON
                  </button>
                </div>
              </div>
            )}

            {/* Pick opponent */}
            {!inProgress && completed < 5 && (
              <>
                <div className="text-[10px] text-[#666] font-mono uppercase mb-2">
                  They put up → tap opponent ({theirsLeft.length} left)
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {theirsLeft.sort((a, b) => b.wr - a.wr).map(p => (
                    <PlayerCard
                      key={p.name}
                      player={p}
                      onClick={() => setSelectedOpponent(selectedOpponent?.name === p.name ? null : p)}
                      selected={selectedOpponent?.name === p.name}
                    />
                  ))}
                </div>

                {/* Recommendation panel */}
                {rec && selectedOpponent && (
                  <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 mb-4">
                    <div className="text-[10px] text-cyan-400 font-mono uppercase font-bold mb-3">🎯 Recommended Counter</div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center flex-1">
                        <div className="text-[10px] text-[#666] mb-1">SEND</div>
                        <div className="text-2xl font-black text-cyan-400">{displayName(rec.player)}</div>
                        <div className="text-[10px] text-[#888] font-mono">SL {rec.player.sl} &bull; {pctStr(rec.player.wr)} szn</div>
                      </div>
                      <div className="px-2 text-center">
                        <div className={`text-2xl font-black font-mono ${wrColor(rec.h2hPct)}`}>
                          {pctStr(rec.h2hPct)}
                        </div>
                        <div className="text-[8px] text-[#555] font-mono">H2H</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-[10px] text-[#666] mb-1">VS</div>
                        <div className="text-2xl font-black text-red-400">{displayName(selectedOpponent)}</div>
                        <div className="text-[10px] text-[#888] font-mono">SL {selectedOpponent.sl} &bull; {pctStr(selectedOpponent.wr)} szn</div>
                      </div>
                    </div>
                    <p className="text-xs text-[#999] italic mb-3">{rec.reasoning}</p>

                    {/* All options */}
                    <div className="text-[10px] text-[#555] font-mono uppercase mb-1.5">
                      All options vs {displayName(selectedOpponent)}
                    </div>
                    <div className="space-y-0.5 mb-3">
                      {oursLeft
                        .map(p => ({ p, pct: h2h(p.wr, selectedOpponent.wr) }))
                        .sort((a, b) => b.pct - a.pct)
                        .map(({ p, pct }) => (
                          <button
                            key={p.name}
                            onClick={() => {
                              /* allow manual override — swap recommendation */
                              setMatchResults(prev => prev); // keep state
                            }}
                            className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-left transition-all ${
                              p.name === rec.player.name
                                ? 'bg-cyan-500/10 border border-cyan-500/20'
                                : 'hover:bg-[#1a1a1a]'
                            }`}
                          >
                            <span className="text-xs font-mono">
                              {p.name === rec.player.name ? '→ ' : '   '}
                              {displayName(p)} <span className="text-[#666]">(SL {p.sl})</span>
                            </span>
                            <span className={`text-xs font-black font-mono ${wrColor(pct)}`}>
                              {wrBadge(pct)} {pctStr(pct)}
                            </span>
                          </button>
                        ))}
                    </div>

                    <button
                      onClick={lockIn}
                      className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
                    >
                      🔒 Lock {displayName(rec.player)} vs {displayName(selectedOpponent)}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Night complete */}
            {completed >= 5 && (
              <div className={`p-6 rounded-xl border text-center ${
                ourWins >= 3 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="text-5xl mb-2">{ourWins >= 3 ? '🏆' : '😤'}</div>
                <div className="text-xl font-black">{ourWins >= 3 ? 'NIGHT WON!' : 'Tough Night'}</div>
                <div className="text-sm text-[#888] mt-1">Final: {ourWins}-{theirWins} &bull; Season Total: {108 + ourWins} pts</div>
                <button onClick={reset} className="mt-4 text-xs text-[#666] hover:text-white transition-all">Reset</button>
              </div>
            )}

            {matchResults.length > 0 && completed < 5 && (
              <button onClick={undo} className="w-full mt-2 py-2 text-[11px] text-[#444] hover:text-red-400 transition-all">
                ↩ Undo last
              </button>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* LINEUP VIEW                                            */}
        {/* ═══════════════════════════════════════════════════════ */}
        {view === 'lineup' && (
          <>
            <div className="text-[10px] text-[#666] font-mono uppercase mb-2">
              {lineups.length} legal lineup{lineups.length !== 1 ? 's' : ''} under 23-rule
            </div>
            <div className="space-y-2 mb-6">
              {lineups.slice(0, 8).map((lu, idx) => {
                const sl = lu.reduce((s, p) => s + p.sl, 0);
                const avg = lu.reduce((s, p) => s + p.wr, 0) / 5;
                const active = idx === selectedLineupIdx;
                return (
                  <button
                    key={idx}
                    onClick={() => { setSelectedLineupIdx(idx); setMatchResults([]); setSelectedOpponent(null); }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      active ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-[#111] border-[#1a1a1a] hover:border-[#333]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-black">BEST</span>}
                        <span className="text-[10px] font-mono text-[#666]">SL {sl}</span>
                      </div>
                      <span className={`text-xs font-black font-mono ${wrColor(avg)}`}>{pctStr(avg)} avg</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {lu.sort((a, b) => b.sl - a.sl).map(p => (
                        <span key={p.name} className="text-[10px] bg-[#1a1a1a] px-2 py-0.5 rounded font-mono">
                          {displayName(p)}<span className="text-[#555]">({p.sl})</span>
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            {lineups.length > 8 && <div className="text-[10px] text-[#555] text-center mb-4">+ {lineups.length - 8} more</div>}

            <div className="text-[10px] text-[#666] font-mono uppercase mb-2">Selected Lineup Detail</div>
            <div className="space-y-2">
              {activeLineup.sort((a, b) => b.wr - a.wr).map(p => (
                <PlayerCard key={p.name} player={p} />
              ))}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SCOREBOARD VIEW                                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {view === 'score' && (
          <>
            {/* Big score */}
            <div className="text-center py-6 mb-4">
              <div className="flex items-center justify-center gap-8">
                <div>
                  <div className="text-5xl font-black font-mono text-cyan-400">{ourWins}</div>
                  <div className="text-xs text-[#888] mt-1">Table i-Cue</div>
                </div>
                <div className="text-2xl text-[#222] font-mono">—</div>
                <div>
                  <div className="text-5xl font-black font-mono text-red-400">{theirWins}</div>
                  <div className="text-xs text-[#888] mt-1">South Coasters</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-[#555]">Need 3 to win &bull; Projected: {108 + ourWins} pts</div>
            </div>

            {/* Match log */}
            <div className="text-[10px] text-[#666] font-mono uppercase mb-2">Match Log</div>
            {matchResults.length === 0 && (
              <div className="text-center py-10 text-[#333]">
                <div className="text-3xl mb-2">🎱</div>
                <div className="text-sm">No matches yet</div>
                <div className="text-[10px] text-[#444]">Use Counter-Pick tab to start</div>
              </div>
            )}
            <div className="space-y-2 mb-6">
              {matchResults.map((m, i) => (
                <div key={i} className={`p-3 rounded-xl border ${
                  m.won === true  ? 'bg-emerald-500/5 border-emerald-500/20' :
                  m.won === false ? 'bg-red-500/5 border-red-500/20'         :
                                    'bg-amber-500/5 border-amber-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{m.won === true ? '✅' : m.won === false ? '❌' : '🔴'}</span>
                      <div>
                        <div className="text-sm font-bold">{displayName(m.ourPlayer)} <span className="text-[#555] font-normal">vs</span> {displayName(m.theirPlayer)}</div>
                        <div className="text-[10px] text-[#666] font-mono">
                          SL{m.ourPlayer.sl} vs SL{m.theirPlayer.sl} &bull; H2H {pctStr(h2h(m.ourPlayer.wr, m.theirPlayer.wr))}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-black ${
                      m.won === true ? 'text-emerald-400' : m.won === false ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {m.won === true ? 'WIN' : m.won === false ? 'LOSS' : 'LIVE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live standings */}
            <div className="text-[10px] text-[#666] font-mono uppercase mb-2">Standings After Tonight</div>
            <div className="space-y-1">
              {[
                { team: 'Degens', pts: 108, ours: false },
                { team: 'Table i-Cue', pts: 108 + ourWins, ours: true },
                { team: 'Golden Oldies', pts: 107, ours: false },
                { team: "Betsy's Whammy Crew", pts: 106, ours: false },
                { team: 'Ma Cue-Lit Squad', pts: 103, ours: false },
                { team: 'South Coasters', pts: 100 + theirWins, ours: false },
              ].sort((a, b) => b.pts - a.pts).map((t, i) => (
                <div key={t.team} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
                  t.ours ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-[#111]'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#555] w-4">{i + 1}.</span>
                    <span className={`text-sm font-bold ${t.ours ? 'text-cyan-400' : ''}`}>{t.team}</span>
                  </div>
                  <span className="text-sm font-black font-mono">{t.pts}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
