'use client';

import React, { useState } from 'react';
import { TournamentState } from '../../lib/tournament/engine';
import { AnimatedFlipCounter } from './AnimatedFlipCounter';
import { VirtualChips } from './VirtualChips';
import { sounds } from '../../lib/audio/soundEffects';
import { completeMatchAction } from '../../lib/tournament/actions';

interface TableScoreboardViewProps {
  state: TournamentState;
  onMatchCompleted?: () => void;
}

export const TableScoreboardView: React.FC<TableScoreboardViewProps> = ({ state, onMatchCompleted }) => {
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(1);
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTable = state.tables.find((t) => t.table_number === selectedTableNumber);
  const currentMatch = state.matches.find(
    (m) => m.id === currentTable?.active_match_id && m.status === 'in_progress'
  );

  const teamA = currentMatch ? state.teams.find((t) => t.id === currentMatch.team_a_id) : null;
  const teamB = currentMatch ? state.teams.find((t) => t.id === currentMatch.team_b_id) : null;

  const handleSubmitMatch = async () => {
    if (!currentMatch || !teamA || !teamB || !selectedWinnerId || !currentTable) {
      alert('Please select the winning pairing before submitting the rack.');
      return;
    }

    setIsSubmitting(true);
    sounds.playBallStrike();

    const loserId = selectedWinnerId === teamA.id ? teamB.id : teamA.id;

    try {
      const result = await completeMatchAction({
        tournamentId: state.tournament.id,
        matchId: currentMatch.id,
        winnerTeamId: selectedWinnerId,
        loserTeamId: loserId,
        tableId: currentTable.id,
        autoPilot: state.tournament.auto_pilot,
      });

      if (result.success) {
        sounds.playVictory();
        setSelectedWinnerId(null);
        setTeamAScore(0);
        setTeamBScore(0);
        if (onMatchCompleted) onMatchCompleted();
      } else {
        alert(result.error || 'Failed to submit match');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6 font-sans">
      {/* Table Selector Pills */}
      <div className="flex flex-col items-center space-y-3">
        <div className="text-xs uppercase font-mono tracking-widest text-[#888]">SELECT YOUR TABLE</div>
        <div className="flex gap-2">
          {state.tables.map((tbl) => (
            <button
              key={tbl.id}
              onClick={() => {
                setSelectedTableNumber(tbl.table_number);
                setSelectedWinnerId(null);
                setTeamAScore(0);
                setTeamBScore(0);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                selectedTableNumber === tbl.table_number
                  ? 'bg-[#12B5CB] text-black shadow-lg scale-105'
                  : 'bg-[#1A1A1A] border border-[#2c2c2c] text-[#A0A0A0] hover:text-white'
              }`}
            >
              TABLE {tbl.table_number}
            </button>
          ))}
        </div>
      </div>

      {currentMatch && teamA && teamB ? (
        <div className="space-y-6">
          {/* Active Game Info */}
          <div className="text-center space-y-1">
            <span className="text-xs bg-[#12B5CB]/20 text-[#12B5CB] border border-[#12B5CB]/40 font-bold px-3 py-1 rounded-full">
              LIVE RACK IN PLAY
            </span>
            <h2 className="text-lg font-black text-white mt-2">
              {teamA.player_1_name} & {teamA.player_2_name} <span className="text-[#888] font-normal">vs</span> {teamB.player_1_name} & {teamB.player_2_name}
            </h2>
            <p className="text-xs text-[#888] font-mono">
              Scotch Doubles • Winner retains Table {selectedTableNumber}
            </p>
          </div>

          {/* Interactive Digital Flip Counters */}
          <div className="grid grid-cols-2 gap-4 bg-[#181818] border border-[#2a2a2a] p-5 rounded-2xl shadow-2xl">
            {/* Pairing A Counter Card */}
            <div
              onClick={() => setSelectedWinnerId(teamA.id)}
              className={`p-4 rounded-xl border flex flex-col items-center space-y-3 cursor-pointer transition-all ${
                selectedWinnerId === teamA.id
                  ? 'bg-[#1a292c] border-[#12B5CB] glow-cyan'
                  : 'bg-[#121212] border-[#222] hover:border-[#333]'
              }`}
            >
              <div className="text-center">
                <div className="font-bold text-sm text-white truncate max-w-[140px]">
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

              <VirtualChips total={teamA.starting_chips} remaining={teamA.chips_remaining} size="sm" showLabel={false} />

              <div
                className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                  selectedWinnerId === teamA.id
                    ? 'bg-[#12B5CB] text-black'
                    : 'bg-[#222] text-[#888]'
                }`}
              >
                {selectedWinnerId === teamA.id ? 'SELECTED WINNER 🏆' : 'Mark as Winner'}
              </div>
            </div>

            {/* Pairing B Counter Card */}
            <div
              onClick={() => setSelectedWinnerId(teamB.id)}
              className={`p-4 rounded-xl border flex flex-col items-center space-y-3 cursor-pointer transition-all ${
                selectedWinnerId === teamB.id
                  ? 'bg-[#1a292c] border-[#12B5CB] glow-cyan'
                  : 'bg-[#121212] border-[#222] hover:border-[#333]'
              }`}
            >
              <div className="text-center">
                <div className="font-bold text-sm text-white truncate max-w-[140px]">
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

              <VirtualChips total={teamB.starting_chips} remaining={teamB.chips_remaining} size="sm" showLabel={false} />

              <div
                className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                  selectedWinnerId === teamB.id
                    ? 'bg-[#12B5CB] text-black'
                    : 'bg-[#222] text-[#888]'
                }`}
              >
                {selectedWinnerId === teamB.id ? 'SELECTED WINNER 🏆' : 'Mark as Winner'}
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            onClick={handleSubmitMatch}
            disabled={!selectedWinnerId || isSubmitting}
            className="w-full bg-[#F538A0] hover:bg-[#d62687] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-all text-sm tracking-wide"
          >
            {isSubmitting ? 'Submitting Rack...' : 'Submit Match Winner & Dequeue Next Pairing'}
          </button>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#181818] border border-[#2a2a2a] rounded-2xl space-y-3">
          <div className="text-3xl">🎱</div>
          <h3 className="font-bold text-white">Table {selectedTableNumber} is Currently Available</h3>
          <p className="text-xs text-[#888] max-w-xs mx-auto">
            Switch to the Director tab to assign a match or engage Auto-Pilot mode to pull waiting pairings from the queue.
          </p>
        </div>
      )}
    </div>
  );
};
