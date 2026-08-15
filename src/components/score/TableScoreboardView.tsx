'use client';

import React, { useState } from 'react';
import { TournamentState, TableICueEngine } from '../../lib/tournament/engine';
import { AnimatedFlipCounter } from './AnimatedFlipCounter';
import { VirtualChips } from './VirtualChips';
import { sounds } from '../../lib/audio/soundEffects';
import { completeMatchAction, callRefereeAction } from '../../lib/tournament/actions';

interface TableScoreboardViewProps {
  state: TournamentState;
  onMatchCompleted?: () => void;
  onRequestReferee?: (tableNumber: number) => void;
}

export const TableScoreboardView: React.FC<TableScoreboardViewProps> = ({
  state,
  onMatchCompleted,
  onRequestReferee,
}) => {
  const [engine, setEngine] = useState(() => new TableICueEngine(state));
  const [localState, setLocalState] = useState<TournamentState>(() => engine.getState());
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(1);
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refereeRequested, setRefereeRequested] = useState(false);
  const [teamAVote, setTeamAVote] = useState<string | null>(null);
  const [teamBVote, setTeamBVote] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const currentTable = localState.tables.find((t) => t.table_number === selectedTableNumber);
  const currentMatch = localState.matches.find(
    (m) => m.id === currentTable?.active_match_id && m.status === 'in_progress'
  );

  const teamA = currentMatch ? localState.teams.find((t) => t.id === currentMatch.team_a_id) : null;
  const teamB = currentMatch ? localState.teams.find((t) => t.id === currentMatch.team_b_id) : null;

  const updateState = () => {
    setLocalState({ ...engine.getState() });
  };

  const handleTeamScoreSubmit = (reportingTeamId: string, reportedWinnerId: string) => {
    if (!currentMatch || !teamA || !teamB) return;

    sounds.playBallStrike();

    let newTeamAVote = teamAVote;
    let newTeamBVote = teamBVote;

    if (reportingTeamId === teamA.id) {
      newTeamAVote = reportedWinnerId;
      setTeamAVote(reportedWinnerId);
    } else {
      newTeamBVote = reportedWinnerId;
      setTeamBVote(reportedWinnerId);
    }

    // Check if both teams have voted
    if (newTeamAVote && newTeamBVote) {
      if (newTeamAVote === newTeamBVote) {
        // Agreement reached! Finalize match!
        const winnerId = newTeamAVote;
        const loserId = winnerId === teamA.id ? teamB.id : teamA.id;
        const winnerName = winnerId === teamA.id ? `${teamA.player_1_name} & ${teamA.player_2_name}` : `${teamB.player_1_name} & ${teamB.player_2_name}`;

        setIsSubmitting(true);
        sounds.playVictory();

        engine.completeMatch(currentMatch.id, winnerId);
        updateState();

        setTeamAVote(null);
        setTeamBVote(null);
        setTeamAScore(0);
        setTeamBScore(0);
        setStatusNotice(`🏆 Match verified! Winner: ${winnerName} retains Table ${selectedTableNumber}.`);
        setIsSubmitting(false);

        if (currentTable) {
          completeMatchAction({
            tournamentId: localState.tournament.id,
            matchId: currentMatch.id,
            winnerTeamId: winnerId,
            loserTeamId: loserId,
            tableId: currentTable.id,
            autoPilot: localState.tournament.auto_pilot,
          }).catch((err) => console.error(err));
        }

        if (onMatchCompleted) onMatchCompleted();
      } else {
        // Disagreement: Dispute!
        sounds.playRefereeCall();
        setRefereeRequested(true);
        setStatusNotice('⚠️ Score Dispute: Both teams reported different results! Referee has been alerted.');
        if (currentTable) {
          callRefereeAction(currentTable.id, selectedTableNumber);
        }
      }
    } else {
      setStatusNotice('✅ 1 of 2 teams confirmed. Waiting for opposing team to tap their result...');
    }
  };

  const handleDirectorInstantOverride = (winnerId: string) => {
    if (!currentMatch || !teamA || !teamB || !currentTable) return;
    const loserId = winnerId === teamA.id ? teamB.id : teamA.id;

    sounds.playVictory();
    engine.completeMatch(currentMatch.id, winnerId);
    updateState();

    setTeamAVote(null);
    setTeamBVote(null);
    setTeamAScore(0);
    setTeamBScore(0);
    setStatusNotice('🏆 Director Override: Match result finalized.');

    completeMatchAction({
      tournamentId: localState.tournament.id,
      matchId: currentMatch.id,
      winnerTeamId: winnerId,
      loserTeamId: loserId,
      tableId: currentTable.id,
      autoPilot: localState.tournament.auto_pilot,
    }).catch((err) => console.error(err));

    if (onMatchCompleted) onMatchCompleted();
  };

  const handleUndoLastMatch = () => {
    if (!currentTable) return;

    const res = engine.undoLastMatch(currentTable.id);
    if (res.success) {
      updateState();
      setTeamAVote(null);
      setTeamBVote(null);
      setStatusNotice('↩️ Match Result Undone! Previous match and chip counts have been restored.');
      sounds.playBallStrike();
    } else {
      alert(res.error || 'No recent match to undo on this table.');
    }
  };

  const handleCallReferee = () => {
    sounds.playRefereeCall();
    setRefereeRequested(true);
    if (onRequestReferee) onRequestReferee(selectedTableNumber);
    if (currentTable) {
      callRefereeAction(currentTable.id, selectedTableNumber);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 font-sans">
      {/* Table Selector Header (1 to 6) */}
      <div className="flex flex-col items-center space-y-3">
        <div className="text-xs uppercase font-mono tracking-widest text-[#888]">SELECT TABLE SCOREBOARD</div>
        <div className="flex gap-2 flex-wrap justify-center">
          {localState.tables.slice(0, 6).map((tbl) => (
            <button
              key={tbl.id}
              onClick={() => {
                setSelectedTableNumber(tbl.table_number);
                setTeamAScore(0);
                setTeamBScore(0);
                setTeamAVote(null);
                setTeamBVote(null);
                setStatusNotice(null);
                setRefereeRequested(tbl.referee_requested || false);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                selectedTableNumber === tbl.table_number
                  ? 'bg-[#12B5CB] text-black shadow-lg scale-105'
                  : 'bg-[#1A1A1A] border border-[#2c2c2c] text-[#A0A0A0] hover:text-white'
              }`}
            >
              TABLE {tbl.table_number}
              {tbl.referee_requested && <span className="ml-1 text-red-400 animate-pulse">●</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Top Action Bar: Referee & Undo Buttons */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* REFEREE CALL */}
        {refereeRequested ? (
          <div className="flex items-center gap-2">
            <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs px-3 py-1.5 rounded-lg font-bold font-mono animate-pulse">
              🚨 Referee Called
            </span>
            <button
              onClick={() => setRefereeRequested(false)}
              className="text-[11px] text-[#888] hover:text-white underline"
            >
              Clear
            </button>
          </div>
        ) : (
          <button
            onClick={handleCallReferee}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40 text-xs px-3 py-1.5 rounded-lg font-bold font-mono transition-all flex items-center gap-1.5 shadow"
          >
            <span>🙋‍♂️</span> Call Referee / Watch Shot
          </button>
        )}

        {/* UNDO BUTTON */}
        <button
          onClick={handleUndoLastMatch}
          className="bg-[#222] hover:bg-[#333] text-white border border-[#444] text-xs px-3 py-1.5 rounded-lg font-bold font-mono transition-all flex items-center gap-1.5 shadow"
          title="Revert accidental winner/loser submission"
        >
          <span>↩️</span> Undo Last Match
        </button>
      </div>

      {/* STATUS NOTICE BANNER */}
      {statusNotice && (
        <div className="p-3 bg-[#1e1e1e] border border-[#12B5CB] rounded-xl text-xs text-white font-mono flex items-center justify-between">
          <span>{statusNotice}</span>
          <button onClick={() => setStatusNotice(null)} className="text-[#888] hover:text-white ml-2">✕</button>
        </div>
      )}

      {currentMatch && teamA && teamB ? (
        <div className="space-y-6">
          {/* Active Game Header */}
          <div className="text-center space-y-1">
            <span className="text-xs bg-[#12B5CB]/20 text-[#12B5CB] border border-[#12B5CB]/40 font-bold px-3 py-1 rounded-full">
              LIVE RACK IN PLAY • TABLE {selectedTableNumber}
            </span>
            <h2 className="text-lg font-black text-white mt-2">
              {teamA.player_1_name} {teamA.player_2_name ? `& ${teamA.player_2_name}` : ''} <span className="text-[#888] font-normal">vs</span> {teamB.player_1_name} {teamB.player_2_name ? `& ${teamB.player_2_name}` : ''}
            </h2>
            <p className="text-xs text-[#888] font-mono">
              Dual Team Confirmation • Both teams tap to verify the result
            </p>
          </div>

          {/* Interactive Scoring and Both Teams Verification Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#181818] border border-[#2a2a2a] p-5 rounded-2xl shadow-2xl">
            {/* Pairing A Card */}
            <div className="p-4 rounded-xl border bg-[#121212] border-[#222] flex flex-col items-center space-y-3">
              <div className="text-center">
                <div className="font-bold text-sm text-white truncate max-w-[180px]">
                  {teamA.player_1_name} {teamA.player_2_name ? `& ${teamA.player_2_name}` : ''}
                </div>
                <div className="text-[11px] text-[#12B5CB] font-mono font-bold">
                  Combined SL {teamA.combined_sl}
                </div>
              </div>

              <AnimatedFlipCounter
                value={teamAScore}
                size="lg"
                interactive={true}
                onIncrement={() => setTeamAScore((s) => s + 1)}
                onDecrement={() => setTeamAScore((s) => Math.max(0, s - 1))}
              />

              <VirtualChips total={teamA.starting_chips} remaining={teamA.chips_remaining} size="sm" showLabel={true} />

              {/* Team A Voting Section */}
              <div className="w-full pt-3 border-t border-[#222] space-y-2">
                <div className="text-[10px] text-center uppercase tracking-wider text-[#777] font-bold font-mono">
                  {teamA.player_1_name}'s Team Action
                </div>

                {teamAVote ? (
                  <div className="bg-[#1e1e1e] border border-green-500/40 text-green-400 text-center py-2 rounded-lg text-xs font-bold font-mono">
                    ✓ Confirmed: {teamAVote === teamA.id ? 'We Won' : 'We Lost'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTeamScoreSubmit(teamA.id, teamA.id)}
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold py-2 rounded-lg text-xs transition-all shadow"
                    >
                      🏆 We Won
                    </button>
                    <button
                      onClick={() => handleTeamScoreSubmit(teamA.id, teamB.id)}
                      disabled={isSubmitting}
                      className="bg-[#222] hover:bg-red-950 text-[#888] hover:text-red-400 font-bold py-2 rounded-lg text-xs transition-all"
                    >
                      ❌ We Lost
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pairing B Card */}
            <div className="p-4 rounded-xl border bg-[#121212] border-[#222] flex flex-col items-center space-y-3">
              <div className="text-center">
                <div className="font-bold text-sm text-white truncate max-w-[180px]">
                  {teamB.player_1_name} {teamB.player_2_name ? `& ${teamB.player_2_name}` : ''}
                </div>
                <div className="text-[11px] text-[#12B5CB] font-mono font-bold">
                  Combined SL {teamB.combined_sl}
                </div>
              </div>

              <AnimatedFlipCounter
                value={teamBScore}
                size="lg"
                interactive={true}
                onIncrement={() => setTeamBScore((s) => s + 1)}
                onDecrement={() => setTeamBScore((s) => Math.max(0, s - 1))}
              />

              <VirtualChips total={teamB.starting_chips} remaining={teamB.chips_remaining} size="sm" showLabel={true} />

              {/* Team B Voting Section */}
              <div className="w-full pt-3 border-t border-[#222] space-y-2">
                <div className="text-[10px] text-center uppercase tracking-wider text-[#777] font-bold font-mono">
                  {teamB.player_1_name}'s Team Action
                </div>

                {teamBVote ? (
                  <div className="bg-[#1e1e1e] border border-green-500/40 text-green-400 text-center py-2 rounded-lg text-xs font-bold font-mono">
                    ✓ Confirmed: {teamBVote === teamB.id ? 'We Won' : 'We Lost'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTeamScoreSubmit(teamB.id, teamB.id)}
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold py-2 rounded-lg text-xs transition-all shadow"
                    >
                      🏆 We Won
                    </button>
                    <button
                      onClick={() => handleTeamScoreSubmit(teamB.id, teamA.id)}
                      disabled={isSubmitting}
                      className="bg-[#222] hover:bg-red-950 text-[#888] hover:text-red-400 font-bold py-2 rounded-lg text-xs transition-all"
                    >
                      ❌ We Lost
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Director Quick 1-Tap Override */}
          <div className="p-3 bg-[#141414] border border-[#222] rounded-xl flex items-center justify-between text-xs text-[#888]">
            <span>Staff 1-Tap Override:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleDirectorInstantOverride(teamA.id)}
                className="text-xs bg-[#222] hover:bg-green-800 text-white px-2.5 py-1 rounded"
              >
                Mark {teamA.player_1_name} Won
              </button>
              <button
                onClick={() => handleDirectorInstantOverride(teamB.id)}
                className="text-xs bg-[#222] hover:bg-green-800 text-white px-2.5 py-1 rounded"
              >
                Mark {teamB.player_1_name} Won
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#181818] border border-[#2a2a2a] rounded-2xl space-y-3">
          <div className="text-3xl">🎱</div>
          <h3 className="font-bold text-white">Table {selectedTableNumber} is Open</h3>
          <p className="text-xs text-[#888] max-w-xs mx-auto">
            Ready for next match assignment. The winner from the previous rack will stay on this table.
          </p>
        </div>
      )}
    </div>
  );
};
