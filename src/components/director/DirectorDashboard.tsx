'use client';

import React, { useState } from 'react';
import { TableICueEngine, TournamentState } from '../../lib/tournament/engine';
import { TypeaheadPlayerSearch } from './TypeaheadPlayerSearch';
import { VirtualChips } from '../score/VirtualChips';
import { registerTeamAction, completeMatchAction, adjustChipsAction, clearRefereeAction } from '../../lib/tournament/actions';
import { TOURNAMENT_SCENARIOS } from '../../lib/tournament/scenarios';
import { TournamentScenario } from '../../lib/types/tournament';

interface DirectorDashboardProps {
  initialState: TournamentState;
}

export const DirectorDashboard: React.FC<DirectorDashboardProps> = ({ initialState }) => {
  const [engine, setEngine] = useState(() => new TableICueEngine(initialState));
  const [state, setState] = useState<TournamentState>(() => engine.getState());
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  // Registration Form State
  const [player1Name, setPlayer1Name] = useState('');
  const [player1SL, setPlayer1SL] = useState<number>(3);
  const [player1Id, setPlayer1Id] = useState<string | undefined>();

  const [player2Name, setPlayer2Name] = useState('');
  const [player2SL, setPlayer2SL] = useState<number>(3);
  const [player2Id, setPlayer2Id] = useState<string | undefined>();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Re-sync local state after mutations
  const updateState = () => {
    setState({ ...engine.getState() });
  };

  const pulseStats = engine.getPulseStats();
  const refereeRequestedTables = state.tables.filter((t) => t.referee_requested);
  const isSinglesMode = state.tournament.format.includes('singles');

  const handleSelectScenario = (scenario: TournamentScenario) => {
    engine.applyScenario(scenario);
    updateState();
    setIsScenarioModalOpen(false);
  };

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!player1Name.trim()) {
      setErrorMsg('Please enter or select Player 1.');
      return;
    }
    if (!isSinglesMode && !player2Name.trim()) {
      setErrorMsg('Please enter or select Player 2 (or switch to a Singles scenario).');
      return;
    }

    const combinedName = isSinglesMode ? player1Name : `${player1Name} & ${player2Name}`;

    const result = engine.registerTeam({
      teamName: combinedName,
      player1Name: player1Name.trim(),
      player2Name: isSinglesMode ? undefined : player2Name.trim(),
      player1SL: player1SL || 3,
      player2SL: isSinglesMode ? undefined : (player2SL || 3),
      player1Id,
      player2Id,
    });

    if (!result.success) {
      setErrorMsg(result.error || 'Failed to register pairing');
      return;
    }

    // Reset Form
    setPlayer1Name('');
    setPlayer1SL(3);
    setPlayer1Id(undefined);

    setPlayer2Name('');
    setPlayer2SL(3);
    setPlayer2Id(undefined);
    updateState();

    registerTeamAction({
      tournamentId: state.tournament.id,
      teamName: combinedName,
      player1Name: player1Name.trim(),
      player2Name: player2Name.trim(),
      player1SL: player1SL || 3,
      player2SL: player2SL || 3,
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

  const handleClearReferee = (tableId: string) => {
    engine.clearReferee(tableId);
    updateState();
    clearRefereeAction(tableId);
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

  const combinedSkillLevel = (player1SL || 0) + (isSinglesMode ? 0 : (player2SL || 0));
  const isCapExceeded = !isSinglesMode && combinedSkillLevel > state.tournament.max_skill_cap;

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222] pb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl">🎱</span>
            <h1 className="text-2xl font-black tracking-tight">{state.tournament.name}</h1>
            <span className="bg-[#1A1A1A] text-[#12B5CB] text-xs px-2.5 py-1 rounded-md font-mono font-bold border border-[#2a2a2a]">
              Lucky Cue (Moorpark, CA) • 6 Tables
            </span>
          </div>
          <p className="text-xs text-[#888] mt-1 font-mono flex items-center gap-2">
            <span>{state.tournament.venue_name}</span>
            <span>•</span>
            <span className="text-[#12B5CB] font-bold">
              {state.tournament.game_type === '9_ball' ? '🟡 9-Ball' : '🎱 8-Ball'}
            </span>
            <span>•</span>
            <span>Max {state.tournament.max_skill_cap} Cap</span>
            <span>•</span>
            <span className="text-[#F538A0] font-bold">Winner Stays / Queue Pipeline</span>
          </p>
        </div>

        {/* Action Controls & Presets */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsScenarioModalOpen(true)}
            className="bg-[#1e1e1e] hover:bg-[#282828] border border-[#333] text-[#12B5CB] px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-colors shadow flex items-center gap-1.5"
          >
            <span>⚙️</span> Tournament Scenarios
          </button>

          <div className="flex items-center gap-3 bg-[#1A1A1A] border border-[#2a2a2a] px-3.5 py-2 rounded-xl">
            <div className="text-right">
              <div className="text-xs font-bold text-white">Auto-Pilot Pipeline</div>
              <div className="text-[10px] text-[#888]">
                {state.tournament.auto_pilot ? 'Winner racks for next opponent' : 'Manual queue'}
              </div>
            </div>
            <button
              onClick={toggleAutoPilot}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                state.tournament.auto_pilot ? 'bg-[#12B5CB]' : 'bg-[#333]'
              }`}
            >
              <div
                className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  state.tournament.auto_pilot ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* TOURNAMENT PULSE STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#181818] border border-[#2a2a2a] p-3.5 rounded-xl shadow">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#888]">Chips in Circulation</div>
          <div className="text-xl font-black font-mono text-[#F538A0] mt-1">
            {pulseStats.chipsRemaining} <span className="text-xs text-[#666]">/ {pulseStats.chipsTotal}</span>
          </div>
          <div className="text-[10px] text-[#777] mt-0.5 font-mono">
            {pulseStats.chipsTotal - pulseStats.chipsRemaining} chips eliminated
          </div>
        </div>

        <div className="bg-[#181818] border border-[#2a2a2a] p-3.5 rounded-xl shadow">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#888]">Playing Now</div>
          <div className="text-xl font-black font-mono text-[#12B5CB] mt-1">
            {pulseStats.playingNowCount}
          </div>
          <div className="text-[10px] text-[#777] mt-0.5 font-mono">
            across {pulseStats.activeMatchesCount} active tables (6 max)
          </div>
        </div>

        <div className="bg-[#181818] border border-[#2a2a2a] p-3.5 rounded-xl shadow">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#888]">Pipeline Queue</div>
          <div className="text-xl font-black font-mono text-yellow-400 mt-1">
            {pulseStats.waitingQueueCount}
          </div>
          <div className="text-[10px] text-[#777] mt-0.5 font-mono">pairings waiting on deck</div>
        </div>

        <div className="bg-[#181818] border border-[#2a2a2a] p-3.5 rounded-xl shadow">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#888]">Survivors</div>
          <div className="text-xl font-black font-mono text-white mt-1">
            {pulseStats.survivingPairings} <span className="text-xs text-[#666]">/ {pulseStats.totalPairings}</span>
          </div>
          <div className="text-[10px] text-[#777] mt-0.5 font-mono">
            {pulseStats.eliminatedPairings} eliminated
          </div>
        </div>

        <div className="bg-[#181818] border border-[#2a2a2a] p-3.5 rounded-xl shadow">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#888]">Avg Rack Time</div>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1">
            {pulseStats.avgMatchTimeMinutes}m
          </div>
          <div className="text-[10px] text-[#777] mt-0.5 font-mono">
            {pulseStats.completedMatchesCount} racks completed
          </div>
        </div>
      </div>

      {/* REFEREE CALL ALERT BANNER */}
      {refereeRequestedTables.length > 0 && (
        <div className="bg-red-950/40 border border-red-500 rounded-xl p-4 flex items-center justify-between animate-pulse shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <div className="font-bold text-sm text-red-300">
                REFEREE REQUESTED AT TABLE {refereeRequestedTables.map((t) => `#${t.table_number}`).join(', ')}
              </div>
              <div className="text-xs text-red-400">
                Players requested director assistance to watch a close hit / legal shot.
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {refereeRequestedTables.map((tbl) => (
              <button
                key={tbl.id}
                onClick={() => handleClearReferee(tbl.id)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow"
              >
                Clear Table {tbl.table_number} Alert ✓
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLUMNS: 6 ACTIVE VENUE TABLES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-[#12B5CB]">⚡</span> Lucky Cue Tables (1–6)
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

          {/* 6-Table Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {state.tables.slice(0, 6).map((table) => {
              const match = state.matches.find(
                (m) => m.id === table.active_match_id && m.status === 'in_progress'
              );
              const teamA = match ? state.teams.find((t) => t.id === match.team_a_id) : null;
              const teamB = match ? state.teams.find((t) => t.id === match.team_b_id) : null;

              return (
                <div
                  key={table.id}
                  className={`bg-[#181818] border rounded-xl p-4 flex flex-col justify-between shadow-lg transition-all ${
                    table.referee_requested ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-[#2a2a2a]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#222] pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-[#12B5CB]">
                        TABLE #{table.table_number}
                      </span>
                      {table.referee_requested && (
                        <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded animate-pulse">
                          REF!
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        table.status === 'in_use'
                          ? 'bg-[#12B5CB]/10 text-[#12B5CB] border border-[#12B5CB]/30'
                          : 'bg-green-500/10 text-green-400 border border-green-500/30'
                      }`}
                    >
                      {table.status === 'in_use' ? 'LIVE' : 'OPEN'}
                    </span>
                  </div>

                  {match && teamA && teamB ? (
                    <div className="space-y-2.5">
                      {/* Pairing A Card */}
                      <div className="p-2.5 bg-[#121212] rounded-lg border border-[#222] flex items-center justify-between">
                        <div className="truncate mr-2">
                          <div className="font-bold text-xs text-white truncate">
                            {teamA.player_1_name} {teamA.player_2_name ? `& ${teamA.player_2_name}` : ''}
                          </div>
                          <div className="text-[10px] text-[#888] font-mono">
                            SL {teamA.combined_sl} • {teamA.chips_remaining} Chips
                          </div>
                        </div>
                        <button
                          onClick={() => handleCompleteMatch(match.id, teamA.id)}
                          className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold text-[11px] px-2.5 py-1 rounded transition-all shadow"
                        >
                          Win 🏆
                        </button>
                      </div>

                      {/* Pairing B Card */}
                      <div className="p-2.5 bg-[#121212] rounded-lg border border-[#222] flex items-center justify-between">
                        <div className="truncate mr-2">
                          <div className="font-bold text-xs text-white truncate">
                            {teamB.player_1_name} {teamB.player_2_name ? `& ${teamB.player_2_name}` : ''}
                          </div>
                          <div className="text-[10px] text-[#888] font-mono">
                            SL {teamB.combined_sl} • {teamB.chips_remaining} Chips
                          </div>
                        </div>
                        <button
                          onClick={() => handleCompleteMatch(match.id, teamB.id)}
                          className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold text-[11px] px-2.5 py-1 rounded transition-all shadow"
                        >
                          Win 🏆
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-[#666] font-mono">
                      Table Open — Awaiting Next Queue Match
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* REGISTERED PAIRINGS & CHIP ADJUSTMENTS */}
          <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#A0A0A0] mb-4">
              Registered Roster & Chip Management ({state.teams.length})
            </h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {state.teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-[#121212] border border-[#222] rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {team.player_1_name} {team.player_2_name ? `& ${team.player_2_name}` : ''}
                      <span className="text-xs text-[#888] font-mono bg-[#222] px-2 py-0.5 rounded">
                        Combined SL {team.combined_sl}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#777] font-mono mt-0.5">
                      Record: {team.wins || 0} Wins • {team.losses || 0} Losses
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
                        className="bg-[#222] hover:bg-[#333] text-white px-2 py-0.5 rounded text-xs font-bold font-mono"
                        title="Deduct 1 Chip"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleAdjustChips(team.id, 1)}
                        className="bg-[#222] hover:bg-[#333] text-[#12B5CB] px-2 py-0.5 rounded text-xs font-bold font-mono"
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

        {/* RIGHT COLUMN: REGISTRATION */}
        <div className="space-y-6">
          <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>➕</span> {isSinglesMode ? 'Singles Entry' : 'Scotch Doubles Entry'}
              </h2>
              <span className="text-xs text-[#12B5CB] font-mono font-bold">
                {isSinglesMode ? 'SINGLES' : `MAX ${state.tournament.max_skill_cap} CAP`}
              </span>
            </div>

            <form onSubmit={handleRegisterTeam} className="space-y-5">
              <TypeaheadPlayerSearch
                label={isSinglesMode ? 'Player' : 'Player 1'}
                placeholder="Type name or select from APA..."
                playerName={player1Name}
                skillLevel={player1SL}
                onPlayerChange={(name, sl, id) => {
                  setPlayer1Name(name);
                  setPlayer1SL(sl);
                  setPlayer1Id(id);
                }}
              />

              {!isSinglesMode && (
                <TypeaheadPlayerSearch
                  label="Player 2"
                  placeholder="Type partner name or select..."
                  playerName={player2Name}
                  skillLevel={player2SL}
                  onPlayerChange={(name, sl, id) => {
                    setPlayer2Name(name);
                    setPlayer2SL(sl);
                    setPlayer2Id(id);
                  }}
                />
              )}

              {(player1Name || player2Name) && !isSinglesMode && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex justify-between items-center ${
                    isCapExceeded
                      ? 'bg-red-500/10 border-red-500/50 text-red-400'
                      : 'bg-[#12B5CB]/10 border-[#12B5CB]/30 text-[#12B5CB]'
                  }`}
                >
                  <div>
                    <div className="font-bold">Combined Team Handicap:</div>
                    <div className="text-[10px] text-[#888]">
                      Player 1 (SL {player1SL}) + Player 2 (SL {player2SL})
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base">
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
                disabled={isCapExceeded || !player1Name || (!isSinglesMode && !player2Name)}
                className="w-full bg-[#12B5CB] hover:bg-[#0fa0b4] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl transition-all shadow-lg text-sm tracking-wide"
              >
                Register & Enqueue in Pipeline
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* TOURNAMENT SCENARIO SELECTOR MODAL */}
      {isScenarioModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-[#333] rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">🏆 Select Tournament Scenario</h3>
                <p className="text-xs text-[#888]">Lucky Cue Billiards (Moorpark, CA) — 6 Table Formats</p>
              </div>
              <button
                onClick={() => setIsScenarioModalOpen(false)}
                className="text-[#888] hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {TOURNAMENT_SCENARIOS.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    state.tournament.name === sc.name
                      ? 'bg-[#12B5CB]/10 border-[#12B5CB]'
                      : 'bg-[#1a1a1a] border-[#2c2c2c] hover:border-[#444]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-sm text-white">{sc.name}</div>
                    <span className="text-[11px] bg-[#222] text-[#12B5CB] px-2 py-0.5 rounded font-mono font-bold">
                      {sc.gameType === '9_ball' ? '9-BALL' : '8-BALL'} • 6 TABLES
                    </span>
                  </div>
                  <p className="text-xs text-[#888]">{sc.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
