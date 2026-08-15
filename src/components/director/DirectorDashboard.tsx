'use client';

import React, { useState } from 'react';
import { TableICueEngine, TournamentState } from '../../lib/tournament/engine';
import { Player } from '../../lib/types/tournament';
import { TypeaheadPlayerSearch } from './TypeaheadPlayerSearch';
import { VirtualChips } from '../score/VirtualChips';
import { registerTeamAction, completeMatchAction, adjustChipsAction } from '../../lib/tournament/actions';

interface DirectorDashboardProps {
  initialState: TournamentState;
}

export const DirectorDashboard: React.FC<DirectorDashboardProps> = ({ initialState }) => {
  const [engine, setEngine] = useState(() => new TableICueEngine(initialState));
  const [state, setState] = useState<TournamentState>(() => engine.getState());

  // Registration Form State
  const [teamName, setTeamName] = useState('');
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Re-sync local state after mutations
  const updateState = () => {
    setState({ ...engine.getState() });
  };

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!teamName.trim()) {
      setErrorMsg('Please enter a team name.');
      return;
    }
    if (!player1 || !player2) {
      setErrorMsg('Please select both Player 1 and Player 2.');
      return;
    }

    const p1SL = player1.skill_level_8ball || 3;
    const p2SL = player2.skill_level_8ball || 3;

    const result = engine.registerTeam({
      teamName,
      player1Name: player1.full_name,
      player2Name: player2.full_name,
      player1SL: p1SL,
      player2SL: p2SL,
      player1Id: player1.id,
      player2Id: player2.id,
    });

    if (!result.success) {
      setErrorMsg(result.error || 'Failed to register team');
      return;
    }

    // Optimistic Reset
    setTeamName('');
    setPlayer1(null);
    setPlayer2(null);
    updateState();

    // Async Supabase Sync
    registerTeamAction({
      tournamentId: state.tournament.id,
      teamName,
      player1Name: player1.full_name,
      player2Name: player2.full_name,
      player1SL: p1SL,
      player2SL: p2SL,
      maxCap: state.tournament.max_skill_cap,
    }).catch((err) => console.error('Supabase async sync warning:', err));
  };

  const handleCompleteMatch = (matchId: string, winnerId: string) => {
    const match = state.matches.find((m) => m.id === matchId);
    const loserId = match?.team_a_id === winnerId ? match?.team_b_id : match?.team_a_id;
    const tableId = match?.table_id;

    const res = engine.completeMatch(matchId, winnerId);
    if (!res.success) {
      alert(res.error);
    } else {
      updateState();

      if (loserId && tableId) {
        completeMatchAction({
          tournamentId: state.tournament.id,
          matchId,
          winnerTeamId: winnerId,
          loserTeamId: loserId,
          tableId,
          autoPilot: state.tournament.auto_pilot,
        }).catch((err) => console.error('Supabase completeMatch sync warning:', err));
      }
    }
  };

  const handleAdjustChips = (teamId: string, delta: number) => {
    engine.adjustChips(teamId, delta);
    updateState();
    adjustChipsAction(teamId, delta).catch((err) => console.error('Supabase adjustChips sync warning:', err));
  };

  const toggleAutoPilot = () => {
    state.tournament.auto_pilot = !state.tournament.auto_pilot;
    if (state.tournament.auto_pilot) {
      engine.autoAssignTables();
    }
    updateState();
  };

  const combinedSkillLevel = (player1?.skill_level_8ball || 0) + (player2?.skill_level_8ball || 0);
  const isCapExceeded = combinedSkillLevel > state.tournament.max_skill_cap;

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎱</span>
            <h1 className="text-2xl font-black tracking-tight">{state.tournament.name}</h1>
            <span className="bg-[#1A1A1A] text-[#12B5CB] text-xs px-2.5 py-1 rounded-md font-mono font-bold border border-[#2a2a2a]">
              Director Control Panel
            </span>
          </div>
          <p className="text-xs text-[#888] mt-1 font-mono">
            {state.tournament.venue_name} • Max {state.tournament.max_skill_cap} Scotch Doubles
          </p>
        </div>

        {/* Auto-Pilot Mode Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-[#1A1A1A] border border-[#2a2a2a] px-4 py-2 rounded-xl">
            <div className="text-right">
              <div className="text-xs font-bold text-white">Auto-Pilot Mode</div>
              <div className="text-[10px] text-[#888]">
                {state.tournament.auto_pilot ? 'System auto-assigns next queue team' : 'Manual match assignments'}
              </div>
            </div>
            <button
              onClick={toggleAutoPilot}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                state.tournament.auto_pilot ? 'bg-[#12B5CB]' : 'bg-[#333]'
              }`}
            >
              <div
                className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  state.tournament.auto_pilot ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLUMNS: ACTIVE TABLES & MATCHES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-[#12B5CB]">⚡</span> Active Tables
            </h2>
            <button
              onClick={() => {
                engine.autoAssignTables();
                updateState();
              }}
              className="text-xs bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] px-3 py-1.5 rounded-lg text-white font-mono transition-colors"
            >
              Auto-Assign Open Tables
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.tables.map((table) => {
              const match = state.matches.find(
                (m) => m.id === table.active_match_id && m.status === 'in_progress'
              );
              const teamA = match ? state.teams.find((t) => t.id === match.team_a_id) : null;
              const teamB = match ? state.teams.find((t) => t.id === match.team_b_id) : null;

              return (
                <div
                  key={table.id}
                  className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-4 flex flex-col justify-between shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-[#222] pb-2 mb-3">
                    <span className="font-mono font-black text-sm text-[#12B5CB]">
                      TABLE #{table.table_number}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        table.status === 'in_use'
                          ? 'bg-[#12B5CB]/10 text-[#12B5CB] border border-[#12B5CB]/30'
                          : 'bg-green-500/10 text-green-400 border border-green-500/30'
                      }`}
                    >
                      {table.status === 'in_use' ? 'LIVE MATCH' : 'AVAILABLE'}
                    </span>
                  </div>

                  {match && teamA && teamB ? (
                    <div className="space-y-3">
                      {/* Team A Card */}
                      <div className="p-3 bg-[#121212] rounded-lg border border-[#222] flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-white">{teamA.team_name}</div>
                          <div className="text-xs text-[#888]">
                            {teamA.player_1_name} & {teamA.player_2_name} (SL{teamA.combined_sl})
                          </div>
                        </div>
                        <button
                          onClick={() => handleCompleteMatch(match.id, teamA.id)}
                          className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-md transition-all shadow"
                        >
                          Winner 🏆
                        </button>
                      </div>

                      {/* Team B Card */}
                      <div className="p-3 bg-[#121212] rounded-lg border border-[#222] flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-white">{teamB.team_name}</div>
                          <div className="text-xs text-[#888]">
                            {teamB.player_1_name} & {teamB.player_2_name} (SL{teamB.combined_sl})
                          </div>
                        </div>
                        <button
                          onClick={() => handleCompleteMatch(match.id, teamB.id)}
                          className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-md transition-all shadow"
                        >
                          Winner 🏆
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-[#666] font-mono">
                      Ready for next match assignment
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* TEAMS & CHIP ADJUSTMENTS */}
          <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#A0A0A0] mb-4">
              Registered Teams & Chip Management ({state.teams.length})
            </h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {state.teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-[#121212] border border-[#222] rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {team.team_name}
                      <span className="text-xs text-[#888] font-mono">
                        (SL{team.combined_sl})
                      </span>
                    </div>
                    <div className="text-xs text-[#666]">
                      {team.player_1_name} & {team.player_2_name}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <VirtualChips
                      total={team.starting_chips}
                      remaining={team.chips_remaining}
                      size="sm"
                      showLabel={false}
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAdjustChips(team.id, -1)}
                        className="bg-[#222] hover:bg-[#333] text-white px-2 py-0.5 rounded text-xs font-bold"
                        title="Deduct 1 Chip"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleAdjustChips(team.id, 1)}
                        className="bg-[#222] hover:bg-[#333] text-[#12B5CB] px-2 py-0.5 rounded text-xs font-bold"
                        title="Add 1 Chip"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INSTANT TEAM REGISTRATION (WITH APA TYPEAHEAD) */}
        <div className="space-y-6">
          <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>➕</span> Fast Team Entry
              </h2>
              <span className="text-xs text-[#12B5CB] font-mono">APA VERIFIED</span>
            </div>

            <form onSubmit={handleRegisterTeam} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Cue Masters, Lucky Shots"
                  className="w-full mt-1 bg-[#121212] border border-[#333] focus:border-[#12B5CB] focus:outline-none text-white px-3.5 py-2 rounded-lg text-sm"
                />
              </div>

              {/* Player 1 Autocomplete */}
              <TypeaheadPlayerSearch
                label="Player 1 (Lead)"
                selectedPlayer={player1}
                onSelectPlayer={setPlayer1}
                onClear={() => setPlayer1(null)}
              />

              {/* Player 2 Autocomplete */}
              <TypeaheadPlayerSearch
                label="Player 2 (Partner)"
                selectedPlayer={player2}
                onSelectPlayer={setPlayer2}
                onClear={() => setPlayer2(null)}
              />

              {/* Combined Skill Level & Cap Indicator */}
              {(player1 || player2) && (
                <div
                  className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                    isCapExceeded
                      ? 'bg-red-500/10 border-red-500/50 text-red-400'
                      : 'bg-[#12B5CB]/10 border-[#12B5CB]/30 text-[#12B5CB]'
                  }`}
                >
                  <span className="font-bold">Combined Skill Level:</span>
                  <span className="font-mono font-bold text-sm">
                    SL {combinedSkillLevel} / Max {state.tournament.max_skill_cap}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-900/30 border border-red-500 rounded-lg text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isCapExceeded}
                className="w-full bg-[#12B5CB] hover:bg-[#0fa0b4] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2.5 rounded-lg transition-all shadow-lg text-sm"
              >
                Register & Enqueue Team
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
