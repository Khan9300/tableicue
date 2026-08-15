'use client';

import React, { useState } from 'react';
import { TournamentState } from '../../lib/tournament/engine';
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
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(1);
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refereeRequested, setRefereeRequested] = useState(false);

  const currentTable = state.tables.find((t) => t.table_number === selectedTableNumber);
  const currentMatch = state.matches.find(
    (m) => m.id === currentTable?.active_match_id && m.status === 'in_progress'
  );

  const teamA = currentMatch ? state.teams.find((t) => t.id === currentMatch.team_a_id) : null;
  const teamB = currentMatch ? state.teams.find((t) => t.id === currentMatch.team_b_id) : null;

  const handleDirectWinnerSubmission = async (winnerId: string) => {
    if (!currentMatch || !teamA || !teamB || !currentTable) return;

    const loserId = winnerId === teamA.id ? teamB.id : teamA.id;
    const winnerName = winnerId === teamA.id ? `${teamA.player_1_name} & ${teamA.player_2_name}` : `${teamB.player_1_name} & ${teamB.player_2_name}`;
    const loserName = winnerId === teamA.id ? `${teamB.player_1_name} & ${teamB.player_2_name}` : `${teamA.player_1_name} & ${teamA.player_2_name}`;

    const confirmed = window.confirm(
      `Submit Match Result?\n\n🏆 Winner: ${winnerName}\n❌ Loser (Loses 1 Chip): ${loserName}\n\nThis will update the live tournament standings and pull the next challenger to Table ${selectedTableNumber}.`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    sounds.playBallStrike();

    try {
      const result = await completeMatchAction({
        tournamentId: state.tournament.id,
        matchId: currentMatch.id,
        winnerTeamId: winnerId,
        loserTeamId: loserId,
        tableId: currentTable.id,
        autoPilot: state.tournament.auto_pilot,
      });

      if (result.success) {
        sounds.playVictory();
        setTeamAScore(0);
        setTeamBScore(0);
        setRefereeRequested(false);
        if (onMatchCompleted) onMatchCompleted();
      } else {
        alert(result.error || 'Failed to submit match result');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
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
    <div className="max-w-xl mx-auto p-6 space-y-6 font-sans">
      {/* Table Selector Header */}
      <div className="flex flex-col items-center space-y-3">
        <div className="text-xs uppercase font-mono tracking-widest text-[#888]">SELECT YOUR TABLE</div>
        <div className="flex gap-2 flex-wrap justify-center">
          {state.tables.map((tbl) => (
            <button
              key={tbl.id}
              onClick={() => {
                setSelectedTableNumber(tbl.table_number);
                setTeamAScore(0);
                setTeamBScore(0);
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

      {/* REFEREE CALL ALERT BANNER & BUTTON */}
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">👀</span>
          <div>
            <div className="text-xs font-bold text-white">Need a Referee for a Close Hit?</div>
            <div className="text-[10px] text-[#888]">Alert Tournament Director to watch the shot</div>
          </div>
        </div>

        {refereeRequested ? (
          <div className="flex items-center gap-2">
            <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs px-3 py-1.5 rounded-lg font-bold font-mono animate-pulse">
              🚨 Referee Called!
            </span>
            <button
              onClick={() => setRefereeRequested(false)}
              className="text-[11px] text-[#888] hover:text-white underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleCallReferee}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40 text-xs px-3 py-1.5 rounded-lg font-bold font-mono transition-all flex items-center gap-1.5 shadow"
          >
            <span>🙋‍♂️</span> Call Referee
          </button>
        )}
      </div>

      {currentMatch && teamA && teamB ? (
        <div className="space-y-6">
          {/* Active Game Info */}
          <div className="text-center space-y-1">
            <span className="text-xs bg-[#12B5CB]/20 text-[#12B5CB] border border-[#12B5CB]/40 font-bold px-3 py-1 rounded-full">
              LIVE RACK IN PLAY • TABLE {selectedTableNumber}
            </span>
            <h2 className="text-lg font-black text-white mt-2">
              {teamA.player_1_name} & {teamA.player_2_name} <span className="text-[#888] font-normal">vs</span> {teamB.player_1_name} & {teamB.player_2_name}
            </h2>
            <p className="text-xs text-[#888] font-mono">
              Scotch Doubles Chip Match • Winner stays on Table {selectedTableNumber}
            </p>
          </div>

          {/* Interactive Scoring and Direct Winner/Loser Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#181818] border border-[#2a2a2a] p-5 rounded-2xl shadow-2xl">
            {/* Pairing A Card */}
            <div className="p-4 rounded-xl border bg-[#121212] border-[#222] flex flex-col items-center space-y-3">
              <div className="text-center">
                <div className="font-bold text-sm text-white truncate max-w-[160px]">
                  {teamA.player_1_name} & {teamA.player_2_name}
                </div>
                <div className="text-[11px] text-[#12B5CB] font-mono font-bold">
                  SL {teamA.player_1_sl} + SL {teamA.player_2_sl} = Combined SL {teamA.combined_sl}
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

              <div className="w-full pt-2 border-t border-[#222] space-y-2">
                <button
                  onClick={() => handleDirectWinnerSubmission(teamA.id)}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold py-2 rounded-lg text-xs tracking-wider uppercase transition-all shadow"
                >
                  🏆 Mark as Winner
                </button>
                <button
                  onClick={() => handleDirectWinnerSubmission(teamB.id)}
                  disabled={isSubmitting}
                  className="w-full bg-[#222] hover:bg-red-950 text-[#888] hover:text-red-400 font-bold py-1.5 rounded-lg text-[11px] tracking-wider transition-all"
                >
                  ❌ Mark as Loser (-1 Chip)
                </button>
              </div>
            </div>

            {/* Pairing B Card */}
            <div className="p-4 rounded-xl border bg-[#121212] border-[#222] flex flex-col items-center space-y-3">
              <div className="text-center">
                <div className="font-bold text-sm text-white truncate max-w-[160px]">
                  {teamB.player_1_name} & {teamB.player_2_name}
                </div>
                <div className="text-[11px] text-[#12B5CB] font-mono font-bold">
                  SL {teamB.player_1_sl} + SL {teamB.player_2_sl} = Combined SL {teamB.combined_sl}
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

              <div className="w-full pt-2 border-t border-[#222] space-y-2">
                <button
                  onClick={() => handleDirectWinnerSubmission(teamB.id)}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold py-2 rounded-lg text-xs tracking-wider uppercase transition-all shadow"
                >
                  🏆 Mark as Winner
                </button>
                <button
                  onClick={() => handleDirectWinnerSubmission(teamA.id)}
                  disabled={isSubmitting}
                  className="w-full bg-[#222] hover:bg-red-950 text-[#888] hover:text-red-400 font-bold py-1.5 rounded-lg text-[11px] tracking-wider transition-all"
                >
                  ❌ Mark as Loser (-1 Chip)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#181818] border border-[#2a2a2a] rounded-2xl space-y-3">
          <div className="text-3xl">🎱</div>
          <h3 className="font-bold text-white">Table {selectedTableNumber} is Available</h3>
          <p className="text-xs text-[#888] max-w-xs mx-auto">
            Switch to the Director tab to assign a match or engage Auto-Pilot mode to pull waiting pairings from the queue.
          </p>
        </div>
      )}
    </div>
  );
};
