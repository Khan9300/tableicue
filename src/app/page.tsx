'use client';

import React, { useState } from 'react';
import { TournamentState } from '../lib/tournament/engine';
import { DirectorDashboard } from '../components/director/DirectorDashboard';
import { BroadcastView } from '../components/tv/BroadcastView';
import { useTableICueRealtime } from '../lib/supabase/useRealtime';
import { SimiValleyRosterView } from '../components/directory/SimiValleyRosterView';
import { TableScoreboardView } from '../components/score/TableScoreboardView';
import { ShareModal } from '../components/ui/ShareModal';

// Mock initial tournament state for Lucky Cue Billiards (Moorpark, CA) — 6 Tables Setup
const initialMockState: TournamentState = {
  tournament: {
    id: 'tourney-lucky-cue-01',
    name: '🎱 Lucky Cue 8-Ball Scotch Doubles (Winner Stays)',
    format: 'winner_stays_queue',
    game_type: '8_ball',
    max_skill_cap: 10,
    starting_chips_policy: 'handicap_matrix',
    venue_name: 'Lucky Cue Billiards (Moorpark, CA)',
    status: 'in_progress',
    auto_pilot: true,
    table_count: 6,
    created_at: new Date().toISOString(),
  },
  tables: [
    { id: 'tbl-1', tournament_id: 'tourney-lucky-cue-01', table_number: 1, label: 'Table 1', status: 'in_use', active_match_id: 'm-101' },
    { id: 'tbl-2', tournament_id: 'tourney-lucky-cue-01', table_number: 2, label: 'Table 2', status: 'in_use', active_match_id: 'm-102' },
    { id: 'tbl-3', tournament_id: 'tourney-lucky-cue-01', table_number: 3, label: 'Table 3', status: 'in_use', active_match_id: 'm-103' },
    { id: 'tbl-4', tournament_id: 'tourney-lucky-cue-01', table_number: 4, label: 'Table 4', status: 'open' },
    { id: 'tbl-5', tournament_id: 'tourney-lucky-cue-01', table_number: 5, label: 'Table 5', status: 'open' },
    { id: 'tbl-6', tournament_id: 'tourney-lucky-cue-01', table_number: 6, label: 'Table 6', status: 'open' },
  ],
  teams: [
    {
      id: 't-1',
      tournament_id: 'tourney-lucky-cue-01',
      team_name: 'Umber C & Fahad K',
      player_1_name: 'Umber C',
      player_2_name: 'Fahad K',
      player_1_sl: 4,
      player_2_sl: 6,
      combined_sl: 10,
      starting_chips: 5,
      chips_remaining: 5,
      status: 'active',
      wins: 2,
      losses: 0,
    },
    {
      id: 't-2',
      tournament_id: 'tourney-lucky-cue-01',
      team_name: 'Mike Johnson & Carlos Rodriguez',
      player_1_name: 'Mike Johnson',
      player_2_name: 'Carlos Rodriguez',
      player_1_sl: 4,
      player_2_sl: 5,
      combined_sl: 9,
      starting_chips: 6,
      chips_remaining: 5,
      status: 'active',
      wins: 1,
      losses: 1,
    },
    {
      id: 't-3',
      tournament_id: 'tourney-lucky-cue-01',
      team_name: 'Sarah Miller & Alex Wang',
      player_1_name: 'Sarah Miller',
      player_2_name: 'Alex Wang',
      player_1_sl: 3,
      player_2_sl: 6,
      combined_sl: 9,
      starting_chips: 6,
      chips_remaining: 6,
      status: 'active',
      wins: 1,
      losses: 0,
    },
    {
      id: 't-4',
      tournament_id: 'tourney-lucky-cue-01',
      team_name: 'David Chen & Jessica Taylor',
      player_1_name: 'David Chen',
      player_2_name: 'Jessica Taylor',
      player_1_sl: 5,
      player_2_sl: 4,
      combined_sl: 9,
      starting_chips: 6,
      chips_remaining: 4,
      status: 'active',
      wins: 0,
      losses: 2,
    },
    {
      id: 't-5',
      tournament_id: 'tourney-lucky-cue-01',
      team_name: 'Robert Gomez & Amanda White',
      player_1_name: 'Robert Gomez',
      player_2_name: 'Amanda White',
      player_1_sl: 5,
      player_2_sl: 2,
      combined_sl: 7,
      starting_chips: 7,
      chips_remaining: 7,
      status: 'active',
      wins: 1,
      losses: 0,
    },
    {
      id: 't-6',
      tournament_id: 'tourney-lucky-cue-01',
      team_name: 'Raffy Mendoza & Reb Mendoza',
      player_1_name: 'Raffy Mendoza',
      player_2_name: 'Reb Mendoza',
      player_1_sl: 4,
      player_2_sl: 5,
      combined_sl: 9,
      starting_chips: 6,
      chips_remaining: 5,
      status: 'active',
      wins: 0,
      losses: 1,
    },
    {
      id: 't-7',
      tournament_id: 'tourney-lucky-cue-01',
      team_name: 'Josh K & Alexis G',
      player_1_name: 'Josh K',
      player_2_name: 'Alexis G',
      player_1_sl: 7,
      player_2_sl: 5,
      combined_sl: 12,
      starting_chips: 4,
      chips_remaining: 4,
      status: 'active',
      wins: 0,
      losses: 0,
    },
  ],
  matches: [
    {
      id: 'm-101',
      tournament_id: 'tourney-lucky-cue-01',
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
      tournament_id: 'tourney-lucky-cue-01',
      table_id: 'tbl-2',
      team_a_id: 't-3',
      team_b_id: 't-4',
      team_a_score: 0,
      team_b_score: 0,
      race_to: 1,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    },
    {
      id: 'm-103',
      tournament_id: 'tourney-lucky-cue-01',
      table_id: 'tbl-3',
      team_a_id: 't-5',
      team_b_id: 't-6',
      team_a_score: 0,
      team_b_score: 0,
      race_to: 1,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    },
  ],
  queue: [
    {
      id: 'q-101',
      tournament_id: 'tourney-lucky-cue-01',
      team_id: 't-7',
      status: 'waiting',
      entered_queue_at: new Date().toISOString(),
    },
  ],
};

export default function TableICueApp() {
  const [activeTab, setActiveTab] = useState<'director' | 'tv' | 'mobile_score' | 'roster'>('director');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Connect to Supabase Realtime Stream
  const { state: liveState } = useTableICueRealtime('a0000000-0000-0000-0000-000000000001');
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
            <div className="text-[10px] text-[#888] font-mono -mt-1">
              LUCKY CUE BILLIARDS (MOORPARK, CA) • 6 TABLES
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
              Table Scoreboard (1–6)
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
