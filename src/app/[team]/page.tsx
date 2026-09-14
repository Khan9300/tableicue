'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Player, TeamConfig, Availability, ThreatLevel, Outlook, Option, Mode } from '@/lib/engine/types';
import { rating, winProb, threat, canComplete, legalLineups, counterOptions, putUpOptions } from '@/lib/engine/core';
import { outlook8, strategy8, matchPoints8, race, RACE } from '@/lib/engine/engine8';
import { outlook9, strategy9, matchPoints9, POINT_TARGETS } from '@/lib/engine/engine9';
import { TEAMS, getTeamConfig } from '@/lib/data/teams';

type Side = 'us' | 'them';
type Tab = 'match' | 'plan' | 'players' | 'setup';

interface Round {
  declarer: Side;
  ourId: string | null;
  theirId: string | null;
  locked: boolean;
  racks: [number, number];
  winner: Side | null;
}

interface MatchState {
  opponent: string;
  tossWinner: Side | null;
  firstDeclarer: Side | null;
  rounds: Round[];
}

interface AppState {
  tab: Tab;
  match: MatchState;
  availability: Record<string, Availability>;
}

const DEFAULT_STATE: AppState = {
  tab: 'setup',
  match: { opponent: '', tossWinner: null, firstDeclarer: null, rounds: [] },
  availability: {},
};

const DISPLAY = 'font-[family-name:var(--font-display)]';
const CAP = 23;
const ROUNDS = 5;

export default function TeamMatchDay({ params }: { params: { team: string } }) {
  const teamKey = params.team;
  const teamConfig = getTeamConfig(teamKey) || TEAMS[teamKey];
  const is9Ball = teamConfig?.format === '9ball';
  
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!teamConfig) return;
    const date = new Date().toISOString().split('T')[0];
    const storageKey = `rackiq-${teamKey}-${date}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setState(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, [teamKey, teamConfig]);

  useEffect(() => {
    if (!loaded) return;
    const date = new Date().toISOString().split('T')[0];
    const storageKey = `rackiq-${teamKey}-${date}`;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, loaded, teamKey]);

  if (!teamConfig) return <div className="p-4 text-rack-white">Team {teamKey} not found</div>;

  const ours = teamConfig.players || [];
  const oppTeam = TEAMS[state.match.opponent] || { players: [] };
  const theirs = oppTeam.players || [];
  const everyone = [...ours, ...theirs];
  const byId = (id: string | null) => (id ? everyone.find((p) => p.id === id) ?? null : null);

  const setTab = (tab: Tab) => setState({ ...state, tab });
  const updateMatch = (fn: (m: MatchState) => MatchState) => setState({ ...state, match: fn(state.match) });

  const renderSetup = () => (
    <div className="p-4 space-y-4">
      <h2 className={`${DISPLAY} text-2xl text-rack-white`}>Setup</h2>
      <div>
        <label className="text-rack-white text-sm">Opponent</label>
        <select 
          className="w-full mt-1 bg-rack-charcoal text-rack-white rounded p-2"
          value={state.match.opponent}
          onChange={(e) => updateMatch(m => ({ ...m, opponent: e.target.value }))}
        >
          <option value="">Select Opponent...</option>
          {Object.keys(TEAMS).map(k => <option key={k} value={k}>{TEAMS[k].name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <h3 className={`${DISPLAY} text-xl text-rack-white mt-4`}>Availability</h3>
        {ours.map((p: Player) => {
          const avail = state.availability[p.id] || { present: true };
          return (
            <div key={p.id} className="flex items-center justify-between bg-rack-surface p-2 rounded">
              <span className="text-rack-white">{p.name} (SL {p.sl})</span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setState(s => ({...s, availability: {...s.availability, [p.id]: {present: !avail.present}}}))}
                  className={`px-3 py-1 rounded text-sm ${avail.present ? 'bg-rack-green text-rack-white' : 'bg-rack-charcoal text-rack-white'}`}
                >
                  {avail.present ? 'Here' : 'Absent'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMatch = () => (
    <div className="p-4 space-y-4">
      <div className="bg-rack-surface p-4 rounded-xl border border-rack-charcoal">
        <h3 className={`${DISPLAY} text-lg text-rack-white`}>Match Status</h3>
        <div className="flex justify-between mt-2 text-sm text-rack-white">
          <span>Ours: {state.match.rounds.filter(r => r.winner === 'us').length} wins</span>
          <span>Theirs: {state.match.rounds.filter(r => r.winner === 'them').length} wins</span>
        </div>
      </div>
      
      {/* Coin toss */}
      {!state.match.tossWinner && (
        <div className="bg-rack-surface p-4 rounded-xl border border-rack-charcoal">
          <h3 className={`${DISPLAY} text-lg text-rack-white mb-2`}>Coin Toss</h3>
          <div className="flex space-x-2">
            <button onClick={() => updateMatch(m => ({...m, tossWinner: 'us'}))} className="flex-1 bg-rack-gold text-rack-charcoal-dark font-bold py-2 rounded">We won</button>
            <button onClick={() => updateMatch(m => ({...m, tossWinner: 'them'}))} className="flex-1 bg-rack-charcoal text-rack-white py-2 rounded">They won</button>
          </div>
        </div>
      )}
      
      {state.match.tossWinner && !state.match.firstDeclarer && (
        <div className="bg-rack-surface p-4 rounded-xl border border-rack-charcoal">
          <h3 className={`${DISPLAY} text-lg text-rack-white mb-2`}>Who declares first?</h3>
          <div className="flex space-x-2">
            <button onClick={() => updateMatch(m => ({...m, firstDeclarer: 'us'}))} className="flex-1 bg-rack-charcoal text-rack-white py-2 rounded">Us</button>
            <button onClick={() => updateMatch(m => ({...m, firstDeclarer: 'them'}))} className="flex-1 bg-rack-charcoal text-rack-white py-2 rounded">Them</button>
          </div>
        </div>
      )}

      {/* Rounds list */}
      {state.match.firstDeclarer && (
        <div className="space-y-2">
          {state.match.rounds.map((r, i) => (
            <div key={i} className="bg-rack-surface p-3 rounded-lg flex justify-between items-center text-rack-white text-sm">
              <span>Round {i + 1}</span>
              <div className="flex space-x-4">
                <span>{byId(r.ourId)?.name || '?'} vs {byId(r.theirId)?.name || '?'}</span>
                {r.winner && <span className="font-bold text-rack-gold">{r.winner === 'us' ? 'We won' : 'They won'}</span>}
              </div>
            </div>
          ))}
          {state.match.rounds.length < ROUNDS && (
             <button 
               onClick={() => updateMatch(m => ({...m, rounds: [...m.rounds, { declarer: m.rounds.length % 2 === 0 ? m.firstDeclarer! : (m.firstDeclarer === 'us' ? 'them' : 'us'), ourId: null, theirId: null, locked: false, racks: [0,0], winner: null }]}))}
               className="w-full bg-rack-charcoal text-rack-white py-3 rounded-lg"
             >
               Start Next Round
             </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-rack-charcoal-dark pb-20">
      <header className="bg-rack-surface border-b border-rack-charcoal p-4 sticky top-0 z-10">
        <h1 className={`${DISPLAY} text-2xl font-bold text-rack-gold uppercase tracking-wider`}>
          {teamConfig.name} <span className="text-rack-white opacity-50 text-sm ml-2">{is9Ball ? '9-Ball' : '8-Ball'}</span>
        </h1>
      </header>

      <main>
        {state.tab === 'setup' && renderSetup()}
        {state.tab === 'match' && renderMatch()}
        {state.tab === 'plan' && <div className="p-4 text-rack-white">Plan Tab Coming Soon</div>}
        {state.tab === 'players' && <div className="p-4 text-rack-white">Players Tab Coming Soon</div>}
      </main>

      <nav className="fixed bottom-0 w-full bg-rack-surface border-t border-rack-charcoal flex">
        {(['match', 'plan', 'players', 'setup'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest ${state.tab === t ? 'text-rack-gold border-t-2 border-rack-gold -mt-[1px]' : 'text-rack-white opacity-50'}`}
          >
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
