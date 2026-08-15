'use client';

import React from 'react';
import { TournamentState } from '../../lib/tournament/engine';
import { VirtualChips } from '../score/VirtualChips';

interface BroadcastViewProps {
  state: TournamentState;
}

export const BroadcastView: React.FC<BroadcastViewProps> = ({ state }) => {
  const { tournament, tables, teams, matches, queue } = state;

  const activeMatches = tables.map((tbl) => {
    const match = matches.find((m) => m.id === tbl.active_match_id && m.status === 'in_progress');
    const teamA = match ? teams.find((t) => t.id === match.team_a_id) : null;
    const teamB = match ? teams.find((t) => t.id === match.team_b_id) : null;
    return {
      table: tbl,
      match,
      teamA,
      teamB,
    };
  });

  const waitingQueue = queue
    .filter((q) => q.status === 'waiting')
    .map((q) => {
      const team = teams.find((t) => t.id === q.team_id);
      return { queueItem: q, team };
    });

  const survivingTeams = [...teams]
    .filter((t) => t.status === 'active')
    .sort((a, b) => b.chips_remaining - a.chips_remaining);

  const eliminatedTeams = [...teams]
    .filter((t) => t.status === 'eliminated')
    .sort((a, b) => (a.elimination_rank || 999) - (b.elimination_rank || 999));

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white p-6 font-sans select-none flex flex-col justify-between">
      {/* Header Bar */}
      <header className="border-b border-[#222] pb-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#12B5CB] to-[#F538A0] flex items-center justify-center font-black text-xl text-black shadow-lg">
            🎱
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#E0E0E0] to-[#A0A0A0]">
              {tournament.name}
            </h1>
            <div className="text-xs text-[#888] flex items-center gap-3 font-mono mt-0.5">
              <span>{tournament.venue_name}</span>
              <span>•</span>
              <span className="text-[#12B5CB]">MAX {tournament.max_skill_cap} SCOTCH DOUBLES</span>
              <span>•</span>
              <span className="text-[#F538A0]">{survivingTeams.length} PAIRINGS REMAINING</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#1A1A1A] border border-[#2a2a2a] px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#12B5CB] animate-pulse"></span>
            LIVE BROADCAST MODE
          </div>
        </div>
      </header>

      {/* 3-Column Broadcast Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* COLUMN 1: ACTIVE TABLES & MATCHES */}
        <section className="bg-[#141414] border border-[#222] rounded-2xl p-5 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[#12B5CB] font-bold text-lg">⚡</span>
              <h2 className="font-extrabold tracking-wider text-sm uppercase text-[#E0E0E0]">
                Active Tables ({tables.filter((t) => t.status === 'in_use').length}/{tables.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-[#888]">RACK IN PLAY</span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {activeMatches.map(({ table, match, teamA, teamB }) => (
              <div
                key={table.id}
                className="bg-[#1A1A1A] border border-[#2c2c2c] rounded-xl p-4 transition-all hover:border-[#12B5CB]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-[#12B5CB] text-black font-black text-xs px-2.5 py-1 rounded-md">
                    TABLE {table.table_number}
                  </span>
                  <span className="text-xs font-mono text-[#A0A0A0]">
                    {table.status === 'in_use' ? 'LIVE' : 'OPEN'}
                  </span>
                </div>

                {match && teamA && teamB ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#0e0e0e] rounded-lg border border-[#222]">
                      <div className="truncate">
                        <div className="font-bold text-sm text-white truncate">
                          {teamA.player_1_name} <span className="text-[#12B5CB] font-mono text-xs">(SL{teamA.player_1_sl})</span> & {teamA.player_2_name} <span className="text-[#12B5CB] font-mono text-xs">(SL{teamA.player_2_sl})</span>
                        </div>
                        <div className="text-xs text-[#888] font-mono">Combined SL {teamA.combined_sl}</div>
                      </div>
                      <div className="text-right ml-2">
                        <span className="text-xs text-[#F538A0] font-mono font-bold">{teamA.chips_remaining} Chips</span>
                      </div>
                    </div>

                    <div className="text-center text-xs font-black text-[#555] tracking-widest">VS</div>

                    <div className="flex items-center justify-between p-3 bg-[#0e0e0e] rounded-lg border border-[#222]">
                      <div className="truncate">
                        <div className="font-bold text-sm text-white truncate">
                          {teamB.player_1_name} <span className="text-[#12B5CB] font-mono text-xs">(SL{teamB.player_1_sl})</span> & {teamB.player_2_name} <span className="text-[#12B5CB] font-mono text-xs">(SL{teamB.player_2_sl})</span>
                        </div>
                        <div className="text-xs text-[#888] font-mono">Combined SL {teamB.combined_sl}</div>
                      </div>
                      <div className="text-right ml-2">
                        <span className="text-xs text-[#F538A0] font-mono font-bold">{teamB.chips_remaining} Chips</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-[#666] font-mono">Table Open — Awaiting Assignment</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* COLUMN 2: UP NEXT QUEUE */}
        <section className="bg-[#141414] border border-[#222] rounded-2xl p-5 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[#F538A0] font-bold text-lg">⏳</span>
              <h2 className="font-extrabold tracking-wider text-sm uppercase text-[#E0E0E0]">
                Up Next Queue ({waitingQueue.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-[#888]">FIFO LINEUP</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {waitingQueue.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#666] font-mono">No pairings currently waiting in queue.</div>
            ) : (
              waitingQueue.map(({ queueItem, team }, idx) => (
                <div
                  key={queueItem.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    idx === 0
                      ? 'bg-[#1e1924] border-[#F538A0] shadow-[0_0_12px_rgba(245,56,160,0.2)]'
                      : 'bg-[#1A1A1A] border-[#2c2c2c]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                        idx === 0 ? 'bg-[#F538A0] text-white' : 'bg-[#262626] text-[#888]'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-white">
                        {team?.player_1_name} <span className="text-[#12B5CB] text-xs font-mono">(SL{team?.player_1_sl})</span> & {team?.player_2_name} <span className="text-[#12B5CB] text-xs font-mono">(SL{team?.player_2_sl})</span>
                      </div>
                      <div className="text-xs text-[#888] font-mono">
                        Combined SL {team?.combined_sl}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-[#222] text-[#F538A0] px-2.5 py-1 rounded-md font-mono font-bold">
                      {team?.chips_remaining} Chips
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* COLUMN 3: CHIP LEADERBOARD & ELIMINATIONS */}
        <section className="bg-[#141414] border border-[#222] rounded-2xl p-5 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-bold text-lg">🏆</span>
              <h2 className="font-extrabold tracking-wider text-sm uppercase text-[#E0E0E0]">
                Chip Standings
              </h2>
            </div>
            <span className="text-xs font-mono text-[#888]">SURVIVOR STATUS</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {survivingTeams.map((team, idx) => (
              <div
                key={team.id}
                className="bg-[#1A1A1A] border border-[#2c2c2c] rounded-xl p-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black font-mono text-[#A0A0A0] w-5 text-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-sm text-white">
                      {team.player_1_name} <span className="text-[#12B5CB] text-xs font-mono">(SL{team.player_1_sl})</span> & {team.player_2_name} <span className="text-[#12B5CB] text-xs font-mono">(SL{team.player_2_sl})</span>
                    </div>
                    <div className="text-xs text-[#888] font-mono">Combined SL {team.combined_sl}</div>
                  </div>
                </div>
                <div>
                  <VirtualChips
                    total={team.starting_chips}
                    remaining={team.chips_remaining}
                    size="sm"
                    showLabel={false}
                  />
                </div>
              </div>
            ))}

            {eliminatedTeams.length > 0 && (
              <div className="pt-4 border-t border-[#222] mt-4">
                <h3 className="text-xs uppercase font-bold tracking-wider text-[#D93025] mb-2">
                  Eliminated Pairings ({eliminatedTeams.length})
                </h3>
                <div className="space-y-1.5 opacity-60">
                  {eliminatedTeams.map((team) => (
                    <div key={team.id} className="text-xs flex justify-between py-1 border-b border-[#1c1c1c] text-[#777]">
                      <span className="line-through">{team.player_1_name} & {team.player_2_name}</span>
                      <span className="font-mono text-[#D93025]">OUT ({team.starting_chips} Chips Lost)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Ticker */}
      <footer className="mt-6 pt-3 border-t border-[#222] flex items-center justify-between text-xs text-[#666] font-mono">
        <div>TABLE I-CUE • SCOTCH DOUBLES CHIP TOURNAMENT</div>
        <div>SIMI VALLEY & VENTURA COUNTY LEAGUES</div>
      </footer>
    </div>
  );
};
