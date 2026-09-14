'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Player, TeamConfig, Availability, ThreatLevel, Outlook, Option, Mode, Format, Pairing } from '@/lib/engine/types';
import { rating, winProb, threat, canComplete, legalLineups as engineLegalLineups, combined, bestAssignment } from '@/lib/engine/core';
import { outlook8, strategy8, matchPoints8, race, RACE, getCounterOptions8, getPutUpOptions8 } from '@/lib/engine/engine8';
import { outlook9, strategy9, matchPoints9, POINT_TARGETS, getCounterOptions9, getPutUpOptions9 } from '@/lib/engine/engine9';
import { TEAMS, getTeamConfig } from '@/lib/data/teams';

type Side = 'us' | 'them';
type Tab = 'match' | 'plan' | 'players' | 'setup';

interface RoundState {
  declarer: Side;
  ourId: string | null;
  theirId: string | null;
  locked: boolean;
  racks: [number, number]; // [us, them] - in 9ball these are points
  winner: Side | null;
}

interface AppState {
  version: number;
  date: string;
  opponentName: string;
  opponentPlayers: Player[];
  tossWinner: Side | null;
  firstDeclarer: Side | null;
  rounds: RoundState[];
  availability: Record<string, Availability>;
  form: Record<string, 'hot' | 'cold' | undefined>;
  sl: Record<string, number>;
  eventType: 'regular' | 'playoffs' | 'tournament';
}

const CAP = 23;
const ROUNDS = 5;
const DISPLAY = 'font-display';

// Helpers
const other = (s: Side): Side => (s === 'us' ? 'them' : 'us');
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`;

// UI Components
function SL({ n, tone = 'dark' }: { n: number; tone?: 'dark' | 'turq' | 'gold' | 'red' }) {
  const tones = {
    dark: 'bg-[#1A1A1A] text-[#F5F5F5] ring-1 ring-[#2D2D2D]',
    turq: 'bg-[#2D7D4F] text-[#F5F5F5]',
    gold: 'bg-[#D4A843] text-[#1A1A1A]',
    red: 'bg-[#C44B4B] text-[#F5F5F5]',
  };
  return (
    <span className={`${DISPLAY} inline-flex shrink-0 items-center justify-center rounded-lg font-extrabold tabular-nums h-8 w-8 text-lg ${tones[tone]}`}>
      {n}
    </span>
  );
}

const THREAT_STYLE: Record<ThreatLevel, string> = {
  Max: 'bg-[#3A1414] text-[#C44B4B] ring-1 ring-[#6B2626]',
  High: 'bg-[#3A2D0E] text-[#D4A843] ring-1 ring-[#6B5418]',
  Medium: 'bg-[#153B26] text-[#2D7D4F] ring-1 ring-[#0E4E50]',
  Low: 'bg-[#1A1A1A] text-[#8FB0B0] ring-1 ring-[#2D2D2D]',
};

function ThreatBadge({ level }: { level: ThreatLevel }) {
  return (
    <span className={`${DISPLAY} rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${THREAT_STYLE[level]}`}>
      {level === 'Max' ? '🚨 Max' : `${level}`}
    </span>
  );
}

const MODE_STYLE: Record<Mode, string> = {
  Chase: 'bg-[#3A1414] text-[#C44B4B]',
  Balanced: 'bg-[#153B26] text-[#2D7D4F]',
  Protect: 'bg-[#3A2D0E] text-[#D4A843]',
  Clinched: 'bg-[#D4A843] text-[#1A1A1A]',
  Eliminated: 'bg-[#3A1414] text-[#C44B4B]',
  Final: 'bg-[#1A1A1A] text-[#F5F5F5]',
};

function ModeChip({ mode }: { mode: Mode }) {
  return <span className={`${DISPLAY} rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider ${MODE_STYLE[mode]}`}>{mode}</span>;
}

export default function MatchDay() {
  const params = useParams();
  const teamKey = params?.team as string;
  const config = getTeamConfig(teamKey);

  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('match');
  const [state, setState] = useState<AppState>({
    version: 1,
    date: new Date().toISOString().split('T')[0],
    opponentName: 'Opponent',
    opponentPlayers: [],
    tossWinner: null,
    firstDeclarer: null,
    rounds: [],
    availability: {},
    form: {},
    sl: {},
    eventType: 'regular',
  });
  
  const history = useRef<AppState[]>([]);
  const storageKey = `rackiq-${teamKey}-${state.date}`;

  // Local Storage Load
  useEffect(() => {
    if (!config) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed.version === 1) {
          setState(parsed);
        }
      } else {
        // Initialize availability
        const initialAvail: Record<string, Availability> = {};
        config.players.forEach(p => {
          initialAvail[p.id] = { present: true };
        });
        setState(s => ({ ...s, availability: initialAvail }));
      }
    } catch {}
    setLoaded(true);
  }, [config, storageKey]);

  // Local Storage Save
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  }, [state, loaded, storageKey]);

  if (!config) return <div className="p-4 text-rack-white">Team not found</div>;
  if (!loaded) return <div className="p-4 text-rack-white">Loading...</div>;

  const commit = (next: AppState) => {
    history.current = [...history.current.slice(-20), state];
    setState(next);
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) setState(prev);
  };

  const decorate = (p: Player, isOurs: boolean): Player => {
    return {
      ...p,
      sl: state.sl[p.id] ?? p.sl,
      form: state.form[p.id],
    };
  };

  const ours = config.players.map(p => decorate(p, true));
  const theirs = state.opponentPlayers.map(p => decorate(p, false));
  const everyone = [...ours, ...theirs];
  const byId = (id: string | null) => (id ? everyone.find((p) => p.id === id) ?? null : null);

  const format = config.format;
  const is8 = format === '8ball';

  // --- Match State ---
  const doneRounds = state.rounds.filter(r => r.winner);
  let usPts = 0;
  let themPts = 0;
  doneRounds.forEach(r => {
    const o = byId(r.ourId);
    const t = byId(r.theirId);
    if (!o || !t || !r.winner) return;
    if (is8) {
      const [u, th] = matchPoints8(r.winner, r.racks, race(o.sl, t.sl));
      usPts += u;
      themPts += th;
    } else {
      // 9ball
      const loserPts = r.winner === 'us' ? r.racks[1] : r.racks[0];
      const loserSL = r.winner === 'us' ? t.sl : o.sl;
      const [u, th] = matchPoints9(r.winner, loserPts, loserSL);
      usPts += u;
      themPts += th;
    }
  });

  const lastRound = state.rounds[state.rounds.length - 1];
  const current = lastRound && !lastRound.winner ? lastRound : null;
  const roundIndex = current ? state.rounds.length - 1 : state.rounds.length;
  const roundsLeft = ROUNDS - doneRounds.length;
  const matchOver = doneRounds.length >= ROUNDS;
  const roundsAfter = Math.max(0, ROUNDS - roundIndex - 1);
  const declarer = state.firstDeclarer ? (roundIndex % 2 === 0 ? state.firstDeclarer : other(state.firstDeclarer)) : null;

  const usedOurs = state.rounds.map(r => r.ourId).filter((x): x is string => !!x);
  const usedTheirs = state.rounds.map(r => r.theirId).filter((x): x is string => !!x);
  
  const ourSeniorsUsed = usedOurs.filter(id => (byId(id)?.sl ?? 0) >= 6).length;
  const theirSeniorsUsed = usedTheirs.filter(id => (byId(id)?.sl ?? 0) >= 6).length;

  const ourBudget = CAP - usedOurs.reduce((a, id) => a + (byId(id)?.sl ?? 0), 0);
  const theirBudget = CAP - usedTheirs.reduce((a, id) => a + (byId(id)?.sl ?? 0), 0);
  
  const ourAvailRaw = ours.filter(p => !usedOurs.includes(p.id) && state.availability[p.id]?.present);
  // Filter by fromRound/untilRound
  const ourAvail = ourAvailRaw.filter(p => {
    const a = state.availability[p.id];
    if (a?.fromRound !== undefined && roundIndex < a.fromRound) return false;
    if (a?.untilRound !== undefined && roundIndex > a.untilRound) return false;
    return true;
  });
  
  const theirAvail = theirs.filter(p => !usedTheirs.includes(p.id));
  
  const ourPick = byId(current?.ourId ?? null);
  const theirPick = byId(current?.theirId ?? null);
  const locked = !!current?.locked;
  
  const ourPoolNow = ourPick ? [...ourAvail, ourPick] : ourAvail;
  const ourBudgetNow = ourBudget + (ourPick?.sl ?? 0);
  const theirPoolNow = theirPick ? [...theirAvail, theirPick] : theirAvail;
  const theirBudgetNow = theirBudget + (theirPick?.sl ?? 0);

  const strat = is8 ? strategy8(usPts, themPts, roundsLeft) : strategy9(usPts, themPts, roundsLeft);

  const counters: Option[] = (declarer === 'them' && theirPick && !locked)
    ? (is8
        ? getCounterOptions8(ourPoolNow, theirAvail, theirPick, roundsAfter, ourBudgetNow, theirBudget, strat.weight, ourSeniorsUsed, theirSeniorsUsed)
        : getCounterOptions9(ourPoolNow, theirAvail, theirPick, roundsAfter, ourBudgetNow, theirBudget, strat.weight, ourSeniorsUsed, theirSeniorsUsed))
    : [];

  const putUps: Option[] = (declarer === 'us' && !locked && state.rounds.length <= ROUNDS)
    ? (is8
        ? getPutUpOptions8(ourPoolNow, theirPoolNow, roundsAfter, ourBudgetNow, theirBudgetNow, strat.weight, ourSeniorsUsed, theirSeniorsUsed)
        : getPutUpOptions9(ourPoolNow, theirPoolNow, roundsAfter, ourBudgetNow, theirBudgetNow, strat.weight, ourSeniorsUsed, theirSeniorsUsed))
    : [];

  // --- Actions ---
  const handleToss = (winner: Side) => commit({ ...state, tossWinner: winner });
  const handleFirstDeclarer = (first: Side) => commit({ ...state, firstDeclarer: first });

  const choose = (side: Side, id: string | null) => {
    const rounds = [...state.rounds];
    const lr = rounds[rounds.length - 1];
    if (lr && !lr.winner) {
      const next: RoundState = side === 'us' ? { ...lr, ourId: id, locked: false } : { ...lr, theirId: id, locked: false };
      if (!next.ourId && !next.theirId) rounds.pop();
      else rounds[rounds.length - 1] = next;
    } else if (id) {
      const i = rounds.length;
      const dec: Side = state.firstDeclarer ? (i % 2 === 0 ? state.firstDeclarer : other(state.firstDeclarer)) : 'them';
      rounds.push({ declarer: dec, ourId: side === 'us' ? id : null, theirId: side === 'them' ? id : null, locked: false, racks: [0, 0], winner: null });
    }
    commit({ ...state, rounds });
  };

  const setLocked = (value: boolean) => {
    const rounds = [...state.rounds];
    const lr = rounds[rounds.length - 1];
    if (!lr || lr.winner || !lr.ourId || !lr.theirId) return;
    rounds[rounds.length - 1] = { ...lr, locked: value };
    commit({ ...state, rounds });
  };

  const addRack = (side: Side, delta: 1 | -1) => {
    const rounds = [...state.rounds];
    const lr = rounds[rounds.length - 1];
    if (!lr || !lr.ourId || !lr.theirId) return;
    const o = byId(lr.ourId);
    const t = byId(lr.theirId);
    if (!o || !t) return;
    
    const idx = side === 'us' ? 0 : 1;
    const racks: [number, number] = [lr.racks[0], lr.racks[1]];
    
    if (is8) {
      const target = race(o.sl, t.sl);
      racks[idx] = Math.max(0, Math.min(target[idx], racks[idx] + delta));
    } else {
      const maxTarget = POINT_TARGETS[Math.max(1, Math.min(9, side === 'us' ? o.sl : t.sl))];
      racks[idx] = Math.max(0, Math.min(maxTarget, racks[idx] + delta));
    }
    rounds[rounds.length - 1] = { ...lr, racks };
    commit({ ...state, rounds });
  };

  const recordWin = (side: Side) => {
    const rounds = [...state.rounds];
    const lr = rounds[rounds.length - 1];
    if (!lr || !lr.ourId || !lr.theirId) return;
    
    if (is8) {
       // Just auto-fill winning racks if needed, but we assume user dialed them in.
       // For 8ball, just mark winner.
    } else {
       // 9ball: winner needs to reach their point target automatically
       const o = byId(lr.ourId)!;
       const t = byId(lr.theirId)!;
       const target = side === 'us' ? POINT_TARGETS[o.sl] : POINT_TARGETS[t.sl];
       const racks: [number, number] = [lr.racks[0], lr.racks[1]];
       racks[side === 'us' ? 0 : 1] = target;
       rounds[rounds.length - 1] = { ...lr, racks, winner: side };
       commit({ ...state, rounds });
       return;
    }
    
    rounds[rounds.length - 1] = { ...lr, winner: side };
    commit({ ...state, rounds });
  };

  const reopenLast = () => {
    const rounds = [...state.rounds];
    const lr = rounds[rounds.length - 1];
    if (!lr) return;
    rounds[rounds.length - 1] = { ...lr, winner: null };
    commit({ ...state, rounds });
  };

  const deleteLast = () => {
    commit({ ...state, rounds: state.rounds.slice(0, -1) });
  };

  const resetMatch = () => {
    if (window.confirm("Reset match? This clears the coin toss and all rounds.")) {
      commit({ ...state, tossWinner: null, firstDeclarer: null, rounds: [] });
    }
  };

  // --- Setup Actions ---
  const [addName, setAddName] = useState('');
  const [addSl, setAddSl] = useState(4);
  const [addW, setAddW] = useState('');
  const [addL, setAddL] = useState('');

  const addOpponentPlayer = () => {
    if (!addName.trim()) return;
    const p: Player = {
      id: `opp-${Date.now()}`,
      name: addName.trim(),
      sl: addSl,
      wins: addW ? Number(addW) : null,
      losses: addL ? Number(addL) : null,
    };
    commit({ ...state, opponentPlayers: [...state.opponentPlayers, p] });
    setAddName(''); setAddW(''); setAddL('');
  };

  // --- UI Renderers ---
  const renderMatchTab = () => {
    if (state.tossWinner === null) {
      return (
        <div className="p-4 space-y-4">
          <h2 className={`${DISPLAY} text-2xl text-rack-white font-bold`}>Coin Toss</h2>
          <p className="text-rack-white/80">Who won the toss?</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleToss('us')} className="bg-rack-green p-4 rounded-xl text-rack-white font-bold">We Won</button>
            <button onClick={() => handleToss('them')} className="bg-rack-charcoal p-4 rounded-xl text-rack-white font-bold">They Won</button>
          </div>
          <div className="bg-rack-surface p-4 rounded-xl mt-4 border border-rack-charcoal-light">
            <p className="text-sm text-rack-white/80">Strategy Tip: If we win, we usually make them put up first so we can counter in rounds 1, 3, and 5.</p>
          </div>
        </div>
      );
    }
    if (state.firstDeclarer === null) {
      return (
        <div className="p-4 space-y-4">
          <h2 className={`${DISPLAY} text-2xl text-rack-white font-bold`}>First Put-up</h2>
          <p className="text-rack-white/80">{state.tossWinner === 'us' ? 'We won the toss.' : 'They won the toss.'} Who declares first?</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleFirstDeclarer('us')} className="bg-rack-charcoal p-4 rounded-xl text-rack-white font-bold">We put up first</button>
            <button onClick={() => handleFirstDeclarer('them')} className="bg-rack-charcoal p-4 rounded-xl text-rack-white font-bold">They put up first</button>
          </div>
        </div>
      );
    }

    if (matchOver) {
      return (
        <div className="p-4 text-center">
          <h2 className={`${DISPLAY} text-3xl font-bold text-rack-white`}>Match Complete</h2>
          <p className="mt-2 text-rack-gold text-xl">{usPts} - {themPts}</p>
          <button onClick={reopenLast} className="mt-8 px-4 py-2 border border-rack-charcoal-light rounded-xl text-rack-white">Reopen Last Match</button>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        {/* Scoreboard */}
        <div className="bg-rack-surface p-4 rounded-xl border border-rack-charcoal-light">
          <div className="flex justify-between items-center mb-2">
            <span className={`${DISPLAY} font-bold text-rack-green text-xl`}>{config.name}</span>
            <span className={`${DISPLAY} font-bold text-rack-white text-3xl`}>{usPts} - {themPts}</span>
            <span className={`${DISPLAY} font-bold text-rack-gold text-xl`}>{state.opponentName}</span>
          </div>
          <div className="flex justify-between text-xs text-rack-white/60 mb-2">
             <span>SL: {CAP - ourBudget}/23</span>
             <ModeChip mode={strat.mode} />
             <span>SL: {CAP - theirBudget}/23</span>
          </div>
          <p className="text-xs text-center text-rack-white/80">{strat.headline}</p>
        </div>

        {/* Current Round Flow */}
        <div className="bg-rack-surface p-4 rounded-xl border border-rack-charcoal-light">
          <div className="flex justify-between items-center mb-4">
             <h3 className={`${DISPLAY} text-xl font-bold text-rack-white`}>Round {roundIndex + 1}</h3>
             <span className="text-sm text-rack-white/60">{declarer === 'us' ? 'We put up' : 'They put up'}</span>
          </div>
          
          {!locked ? (
            <div className="space-y-4">
              {declarer === 'them' && !theirPick && (
                <div className="text-center p-4">
                  <p className="text-rack-white mb-2">Who did they put up?</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {theirAvail.map(p => (
                      <button key={p.id} onClick={() => choose('them', p.id)} className="px-3 py-2 bg-rack-charcoal rounded-lg text-rack-white">
                        {p.name} <span className="text-rack-gold text-xs">{p.sl}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {declarer === 'them' && theirPick && (
                <div>
                  <div className="flex items-center justify-between bg-rack-charcoal p-3 rounded-lg mb-4">
                    <span className="text-rack-white">They chose: <strong>{theirPick.name}</strong> (SL {theirPick.sl})</span>
                    <button onClick={() => choose('them', null)} className="text-rack-red text-xs underline">Change</button>
                  </div>
                  <h4 className="text-rack-white/80 mb-2">Our Counter Options:</h4>
                  <div className="space-y-2">
                    {counters.map((o, idx) => (
                      <div key={o.player.id} 
                           className={`p-3 rounded-xl border ${ourPick?.id === o.player.id ? 'border-rack-gold bg-rack-charcoal-dark' : 'border-rack-charcoal bg-rack-charcoal'} ${!o.legal ? 'opacity-50' : ''}`}
                           onClick={() => o.legal && choose('us', o.player.id)}>
                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-2">
                             <SL n={o.player.sl} tone={idx === 0 && o.legal ? 'gold' : 'dark'} />
                             <span className="text-rack-white font-bold">{o.player.name}</span>
                           </div>
                           {o.o && (
                             <div className="text-right">
                               <div className={`${DISPLAY} font-bold text-rack-green`}>{pct(o.o.pWin)} win</div>
                               <div className="text-xs text-rack-white/60">Race: {o.o.race[0]}-{o.o.race[1]}</div>
                             </div>
                           )}
                        </div>
                        {!o.legal && <div className="text-rack-red text-xs mt-1">Breaks 23 cap or senior rule for remaining rounds</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {declarer === 'us' && !ourPick && (
                 <div>
                   <h4 className="text-rack-white/80 mb-2">Our Put-Up Options:</h4>
                   <div className="space-y-2">
                      {putUps.map((o, idx) => (
                        <div key={o.player.id} 
                             className={`p-3 rounded-xl border border-rack-charcoal bg-rack-charcoal ${!o.legal ? 'opacity-50' : ''}`}
                             onClick={() => o.legal && choose('us', o.player.id)}>
                         <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <SL n={o.player.sl} tone={idx === 0 && o.legal ? 'turq' : 'dark'} />
                              <span className="text-rack-white font-bold">{o.player.name}</span>
                            </div>
                            <div className="text-right text-xs text-rack-white/60">
                               {o.response ? `Worst response: ${o.response.name} (${o.response.sl})` : 'No answers left'}
                            </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
              )}
              {declarer === 'us' && ourPick && (
                <div>
                  <div className="flex items-center justify-between bg-rack-charcoal p-3 rounded-lg mb-4">
                    <span className="text-rack-white">We chose: <strong>{ourPick.name}</strong> (SL {ourPick.sl})</span>
                    <button onClick={() => choose('us', null)} className="text-rack-red text-xs underline">Change</button>
                  </div>
                  <h4 className="text-rack-white/80 mb-2">Who did they answer with?</h4>
                  <div className="flex flex-wrap gap-2">
                    {theirAvail.map(p => (
                      <button key={p.id} onClick={() => choose('them', p.id)} className={`px-3 py-2 rounded-lg text-rack-white ${theirPick?.id === p.id ? 'bg-rack-gold text-rack-charcoal-dark font-bold' : 'bg-rack-charcoal'}`}>
                        {p.name} <span className="text-xs opacity-80">{p.sl}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {ourPick && theirPick && (
                <button onClick={() => setLocked(true)} className="w-full mt-4 bg-rack-green text-rack-white font-bold py-3 rounded-xl">
                  Lock In Matchup
                </button>
              )}
            </div>
          ) : (
            // SCORING MODE
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-rack-charcoal p-3 rounded-lg">
                  <div className="text-center w-1/2 border-r border-rack-charcoal-light">
                     <SL n={ourPick!.sl} />
                     <p className="text-rack-white font-bold mt-1">{ourPick!.name}</p>
                     <p className="text-rack-white/60 text-xs">Race to {is8 ? race(ourPick!.sl, theirPick!.sl)[0] : POINT_TARGETS[ourPick!.sl]}</p>
                  </div>
                  <div className="text-center w-1/2">
                     <SL n={theirPick!.sl} tone="red" />
                     <p className="text-rack-white font-bold mt-1">{theirPick!.name}</p>
                     <p className="text-rack-white/60 text-xs">Race to {is8 ? race(ourPick!.sl, theirPick!.sl)[1] : POINT_TARGETS[theirPick!.sl]}</p>
                  </div>
               </div>
               
               <div className="flex justify-between items-center px-4">
                  <div className="flex flex-col items-center">
                    <button onClick={() => addRack('us', 1)} className="w-16 h-16 bg-rack-charcoal rounded-xl text-rack-white text-3xl font-bold mb-2">+</button>
                    <span className="text-4xl text-rack-green font-bold">{current?.racks[0] || 0}</span>
                    <button onClick={() => addRack('us', -1)} className="w-16 h-12 bg-rack-charcoal-dark rounded-xl text-rack-white text-xl mt-2">-</button>
                  </div>
                  <div className="text-rack-white/40 text-xl font-bold">VS</div>
                  <div className="flex flex-col items-center">
                    <button onClick={() => addRack('them', 1)} className="w-16 h-16 bg-rack-charcoal rounded-xl text-rack-white text-3xl font-bold mb-2">+</button>
                    <span className="text-4xl text-rack-red font-bold">{current?.racks[1] || 0}</span>
                    <button onClick={() => addRack('them', -1)} className="w-16 h-12 bg-rack-charcoal-dark rounded-xl text-rack-white text-xl mt-2">-</button>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4 mt-4">
                  <button onClick={() => recordWin('us')} className="bg-rack-green p-3 rounded-xl text-rack-white font-bold">Record Win (Us)</button>
                  <button onClick={() => recordWin('them')} className="bg-rack-red p-3 rounded-xl text-rack-white font-bold">Record Win (Them)</button>
               </div>
               
               <button onClick={() => setLocked(false)} className="w-full mt-2 text-rack-white/60 text-sm underline text-center">Unlock Matchup</button>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 justify-center">
          <button onClick={undo} className="px-4 py-2 text-sm text-rack-white/60 underline">Undo Last Action</button>
          <button onClick={resetMatch} className="px-4 py-2 text-sm text-rack-red underline">Reset Match</button>
        </div>
      </div>
    );
  };

  const renderPlanTab = () => {
    const pool = ours.filter(p => state.availability[p.id]?.present);
    const lineups = engineLegalLineups(pool, format);
    
    // Matrix
    const outlookFn = is8 ? outlook8 : outlook9;
    
    return (
      <div className="p-4 space-y-6">
        <h2 className={`${DISPLAY} text-2xl text-rack-white font-bold`}>Match Plan</h2>
        
        <section className="bg-rack-surface p-4 rounded-xl border border-rack-charcoal-light">
           <h3 className={`${DISPLAY} text-xl text-rack-gold mb-2`}>Legal Lineups ({lineups.length})</h3>
           <div className="max-h-48 overflow-y-auto space-y-2">
             {lineups.sort((a,b) => b.reduce((s,x)=>s+x.sl,0) - a.reduce((s,x)=>s+x.sl,0)).map((l, i) => (
               <div key={i} className="flex gap-1 text-xs bg-rack-charcoal p-2 rounded">
                 <span className="text-rack-green font-bold w-6">{l.reduce((s,x)=>s+x.sl,0)}</span>
                 {l.map((p, i) => <span key={p.id} className="text-rack-white/80">{i > 0 ? ', ' : ''}{p.name.split(' ')[0]}</span>)}
               </div>
             ))}
           </div>
        </section>
        
        <section className="bg-rack-surface p-4 rounded-xl border border-rack-charcoal-light">
           <h3 className={`${DISPLAY} text-xl text-rack-gold mb-2`}>Matchup Matrix</h3>
           <div className="overflow-x-auto">
             <table className="w-full text-xs text-center border-collapse">
               <thead>
                 <tr>
                   <th className="p-1 border border-rack-charcoal-light text-left text-rack-white/60">Us \ Them</th>
                   {theirs.map(t => <th key={t.id} className="p-1 border border-rack-charcoal-light text-rack-white">{t.name.split(' ')[0]} <br/><span className="text-rack-gold">{t.sl}</span></th>)}
                 </tr>
               </thead>
               <tbody>
                 {ours.map(o => (
                   <tr key={o.id}>
                     <th className="p-1 border border-rack-charcoal-light text-left text-rack-white whitespace-nowrap">{o.name.split(' ')[0]} <span className="text-rack-green">{o.sl}</span></th>
                     {theirs.map(t => {
                       const out = outlookFn(o, t);
                       const color = out.pWin > 0.55 ? 'bg-rack-green/20 text-rack-green' : out.pWin < 0.45 ? 'bg-rack-red/20 text-rack-red' : 'bg-rack-charcoal text-rack-gold';
                       return <td key={t.id} className={`p-1 border border-rack-charcoal-light font-bold ${color}`}>{pct(out.pWin)}</td>
                     })}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </section>
      </div>
    );
  };

  const renderPlayersTab = () => {
    return (
      <div className="p-4 space-y-6">
        <h2 className={`${DISPLAY} text-2xl text-rack-white font-bold`}>Rosters</h2>
        
        <section>
          <h3 className={`${DISPLAY} text-xl text-rack-green mb-3`}>Our Team</h3>
          <div className="grid gap-3">
            {ours.sort((a,b)=>b.sl-a.sl).map(p => {
              const c = combined(p);
              return (
              <div key={p.id} className="bg-rack-surface p-3 rounded-xl border border-rack-charcoal-light flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SL n={p.sl} tone="turq" />
                  <div>
                    <div className="text-rack-white font-bold">{p.name}</div>
                    <div className="text-xs text-rack-white/60">{c ? `${c.w}-${c.l}` : 'No record'} · Rating: {(rating(p)*100).toFixed(0)}</div>
                  </div>
                </div>
                <button onClick={() => commit({...state, form: {...state.form, [p.id]: state.form[p.id] === 'hot' ? 'cold' : state.form[p.id] === 'cold' ? undefined : 'hot'}})} 
                        className={`text-xl p-2 rounded-lg ${state.form[p.id] === 'hot' ? 'bg-rack-gold text-black' : state.form[p.id] === 'cold' ? 'bg-[#00D8D8] text-black' : 'bg-rack-charcoal opacity-50'}`}>
                  {state.form[p.id] === 'hot' ? '🔥' : state.form[p.id] === 'cold' ? '❄️' : '➖'}
                </button>
              </div>
            )})}
          </div>
        </section>

        <section>
          <h3 className={`${DISPLAY} text-xl text-rack-gold mb-3`}>Their Team</h3>
          <div className="grid gap-3">
            {theirs.sort((a,b)=>threat(b).localeCompare(threat(a))).map(p => {
              const c = combined(p);
              return (
              <div key={p.id} className="bg-rack-surface p-3 rounded-xl border border-rack-charcoal-light flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SL n={p.sl} tone="dark" />
                  <div>
                    <div className="text-rack-white font-bold">{p.name}</div>
                    <div className="text-xs text-rack-white/60">{c ? `${c.w}-${c.l}` : 'No record'} · Rating: {(rating(p)*100).toFixed(0)}</div>
                  </div>
                </div>
                <ThreatBadge level={threat(p)} />
              </div>
            )})}
          </div>
        </section>
      </div>
    );
  };

  const renderSetupTab = () => {
    return (
      <div className="p-4 space-y-6 pb-24">
        <h2 className={`${DISPLAY} text-2xl text-rack-white font-bold`}>Setup</h2>
        
        <section className="bg-rack-surface p-4 rounded-xl border border-rack-charcoal-light space-y-4">
          <h3 className={`${DISPLAY} text-xl text-rack-gold`}>Opponent Details</h3>
          <div>
            <label className="text-xs text-rack-white/60 uppercase">Opponent Name</label>
            <input type="text" value={state.opponentName} onChange={e => commit({...state, opponentName: e.target.value})} className="w-full bg-rack-charcoal text-rack-white p-3 rounded-lg mt-1 border border-rack-charcoal-light" />
          </div>
          
          <div className="border-t border-rack-charcoal-light pt-4 space-y-2">
            <h4 className="text-rack-white font-bold text-sm">Add Opponent Player</h4>
            <input type="text" placeholder="Name" value={addName} onChange={e => setAddName(e.target.value)} className="w-full bg-rack-charcoal text-rack-white p-2 rounded border border-rack-charcoal-light text-sm" />
            <div className="flex gap-2">
              <select value={addSl} onChange={e => setAddSl(Number(e.target.value))} className="bg-rack-charcoal text-rack-white p-2 rounded border border-rack-charcoal-light text-sm w-1/3">
                {[2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>SL {n}</option>)}
              </select>
              <input type="number" placeholder="Wins" value={addW} onChange={e => setAddW(e.target.value)} className="bg-rack-charcoal text-rack-white p-2 rounded border border-rack-charcoal-light text-sm w-1/3" />
              <input type="number" placeholder="Losses" value={addL} onChange={e => setAddL(e.target.value)} className="bg-rack-charcoal text-rack-white p-2 rounded border border-rack-charcoal-light text-sm w-1/3" />
            </div>
            <button onClick={addOpponentPlayer} className="w-full bg-rack-charcoal-light text-rack-white p-2 rounded font-bold text-sm">Add Player</button>
          </div>
        </section>

        <section className="bg-rack-surface p-4 rounded-xl border border-rack-charcoal-light space-y-3">
          <h3 className={`${DISPLAY} text-xl text-rack-green`}>Our Availability</h3>
          {ours.map(p => (
            <div key={p.id} className="flex justify-between items-center">
              <span className="text-rack-white text-sm">{p.name}</span>
              <button 
                onClick={() => commit({...state, availability: {...state.availability, [p.id]: {present: !state.availability[p.id]?.present}}})}
                className={`px-3 py-1 rounded text-xs font-bold ${state.availability[p.id]?.present ? 'bg-rack-green text-rack-white' : 'bg-rack-red text-rack-white'}`}>
                {state.availability[p.id]?.present ? 'Available' : 'Absent'}
              </button>
            </div>
          ))}
        </section>
        
        <section className="bg-rack-surface p-4 rounded-xl border border-rack-charcoal-light">
           <h3 className={`${DISPLAY} text-xl text-rack-white mb-2`}>Event Settings</h3>
           <select value={state.eventType} onChange={e => commit({...state, eventType: e.target.value as any})} className="w-full bg-rack-charcoal text-rack-white p-3 rounded-lg border border-rack-charcoal-light">
             <option value="regular">Regular Session</option>
             <option value="playoffs">Playoffs</option>
             <option value="tournament">Tournament</option>
           </select>
        </section>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-rack-charcoal-dark pb-20 font-body">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-rack-surface/95 backdrop-blur border-b border-rack-charcoal-light px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-rack-white/60 hover:text-rack-white text-sm font-semibold flex items-center gap-1">
            ← Hub
          </Link>
          <span className="text-rack-charcoal-light">|</span>
          <span className={`${DISPLAY} text-lg font-bold text-rack-gold tracking-wide`}>
            {config.name}
          </span>
        </div>
        <Link 
          href="/fees" 
          className="text-xs bg-rack-charcoal border border-rack-charcoal-light text-rack-gold px-2.5 py-1.5 rounded-lg hover:border-rack-gold transition-colors flex items-center gap-1 font-semibold"
        >
          💰 Fees
        </Link>
      </header>

      {tab === 'match' && renderMatchTab()}
      {tab === 'plan' && renderPlanTab()}
      {tab === 'players' && renderPlayersTab()}
      {tab === 'setup' && renderSetupTab()}
      
      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-rack-surface border-t border-rack-charcoal-light flex justify-around p-2 pb-safe">
        {(['match', 'plan', 'players', 'setup'] as Tab[]).map(t => (
          <button 
            key={t}
            onClick={() => setTab(t)} 
            className={`flex-1 p-2 text-center text-xs font-bold uppercase tracking-wider ${DISPLAY} ${tab === t ? 'text-rack-gold' : 'text-rack-white/60'}`}
          >
            {t}
          </button>
        ))}
      </nav>
    </main>
  );
}
