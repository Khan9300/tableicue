'use client';

import React, { useState } from 'react';
import { TournamentState } from '../lib/tournament/engine';
import { DirectorDashboard } from '../components/director/DirectorDashboard';
import { BroadcastView } from '../components/tv/BroadcastView';
import { AnimatedFlipCounter } from '../components/score/AnimatedFlipCounter';
import { VirtualChips } from '../components/score/VirtualChips';

// Mock initial tournament state for instant live preview
const initialMockState: TournamentState = {
  tournament: {
    id: 'tourney-sv-01',
    name: 'Simi Valley Scotch Doubles Chip Tournament',
    format: 'scotch_doubles_chip',
    game_type: '8_ball',
    max_skill_cap: 10,
    starting_chips_policy: 'handicap_matrix',
    venue_name: 'Lucky Cue Moorpark / Plush Pocket',
    status: 'in_progress',
    auto_pilot: true,
    created_at: new Date().toISOString(),
  },
  tables: [
    { id: 'tbl-1', tournament_id: 'tourney-sv-01', table_number: 1, status: 'in_use', active_match_id: 'm-101' },
    { id: 'tbl-2', tournament_id: 'tourney-sv-01', table_number: 2, status: 'in_use', active_match_id: 'm-102' },
    { id: 'tbl-3', tournament_id: 'tourney-sv-01', table_number: 3, status: 'open' },
    { id: 'tbl-4', tournament_id: 'tourney-sv-01', table_number: 4, status: 'open' },
  ],
  teams: [
    {
      id: 't-1',
      tournament_id: 'tourney-sv-01',
      team_name: 'Fahad Khan & Sarah Miller',
      player_1_name: 'Fahad Khan',
      player_2_name: 'Sarah Miller',
      player_1_sl: 6,
      player_2_sl: 3,
      combined_sl: 9,
      starting_chips: 6,
      chips_remaining: 6,
      status: 'active',
    },
    {
      id: 't-2',
      tournament_id: 'tourney-sv-01',
      team_name: 'Mike Johnson & Carlos Rodriguez',
      player_1_name: 'Mike Johnson',
      player_2_name: 'Carlos Rodriguez',
      player_1_sl: 4,
      player_2_sl: 5,
      combined_sl: 9,
      starting_chips: 6,
      chips_remaining: 5,
      status: 'active',
    },
    {
      id: 't-3',
      tournament_id: 'tourney-sv-01',
      team_name: 'David Chen & Jessica Taylor',
      player_1_name: 'David Chen',
      player_2_name: 'Jessica Taylor',
      player_1_sl: 5,
      player_2_sl: 4,
      combined_sl: 9,
      starting_chips: 6,
      chips_remaining: 4,
      status: 'active',
    },
    {
      id: 't-4',
      tournament_id: 'tourney-sv-01',
      team_name: 'Robert Gomez & Amanda White',
      player_1_name: 'Robert Gomez',
      player_2_name: 'Amanda White',
      player_1_sl: 5,
      player_2_sl: 2,
      combined_sl: 7,
      starting_chips: 7,
      chips_remaining: 7,
      status: 'active',
    },
  ],
  matches: [
    {
      id: 'm-101',
      tournament_id: 'tourney-sv-01',
      table_id: 'tbl-1',
      team_a_id: 't-1',
      team_b_id: 't-2',
      team_a_score: 0,
      team_b_score: 0,
      race_to: 1,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    },
    {
      id: 'm-102',
      tournament_id: 'tourney-sv-01',
      table_id: 'tbl-2',
      team_a_id: 't-3',
      team_b_id: 't-4',
      team_a_score: 0,
      team_b_score: 0,
      race_to: 1,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    },
  ],
  queue: [],
};

import { useTableICueRealtime } from '../lib/supabase/useRealtime';
import { SimiValleyRosterView } from '../components/directory/SimiValleyRosterView';
import { TableScoreboardView } from '../components/score/TableScoreboardView';
import { ShareModal } from '../components/ui/ShareModal';

export default function TableICueApp() {
  const [activeTab, setActiveTab] = useState<'director' | 'tv' | 'mobile_score' | 'roster'>('director');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Connect to Supabase Realtime Stream
  const { state: liveState, isLoading } = useTableICueRealtime('a0000000-0000-0000-0000-000000000001');
  const currentState = liveState || initialMockState;

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col">
      {/* Top Navigation Header */}
      <nav className="bg-[#0e0e0e] border-b border-[#222] px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#12B5CB] to-[#F538A0] flex items-center justify-center font-bold text-black text-sm shadow-md">
            🎱
          </div>
          <div>
            <div className="font-black text-lg tracking-tight">
              TABLE <span className="text-[#12B5CB]">i-CUE</span>
            </div>
          </div>
        </div>

        {/* View Mode Selector & Tools */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-[#181818] p-1 rounded-xl border border-[#2a2a2a]">
            <button
              onClick={() => setActiveTab('director')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'director'
                  ? 'bg-[#12B5CB] text-black shadow-md'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              Director Control
            </button>
            <button
              onClick={() => setActiveTab('tv')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'tv'
                  ? 'bg-[#12B5CB] text-black shadow-md'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              TV Broadcast (3-Col)
            </button>
            <button
              onClick={() => setActiveTab('mobile_score')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'mobile_score'
                  ? 'bg-[#12B5CB] text-black shadow-md'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              Scoreboard
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'roster'
                  ? 'bg-[#12B5CB] text-black shadow-md'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              APA League Roster
            </button>
          </div>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="bg-[#1e1e1e] hover:bg-[#282828] border border-[#333] text-[#12B5CB] px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-colors"
          >
            <span>📺</span> Cast & Links
          </button>
        </div>
      </nav>

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'director' && <DirectorDashboard initialState={currentState} />}
        {activeTab === 'tv' && <BroadcastView state={currentState} />}
        {activeTab === 'roster' && <SimiValleyRosterView />}
        {activeTab === 'mobile_score' && <TableScoreboardView state={currentState} />}
      </main>

      {/* Share / Cast Links Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tablesCount={currentState.tables.length}
      />
    </div>
  );
}
