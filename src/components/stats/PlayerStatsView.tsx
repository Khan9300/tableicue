'use client';

import React, { useState } from 'react';
import { Player } from '../../lib/types/tournament';

// Mock high-tier player stats from Simi Valley & Moorpark leagues
const mockHallOfFamePlayers: (Player & { winRate: number; favoritePartner: string })[] = [
  {
    id: 'p-1',
    member_id: '80921441',
    first_name: 'Fahad',
    last_name: 'Khan',
    full_name: 'Fahad Khan',
    skill_level_8ball: 6,
    skill_level_9ball: 6,
    tournaments_played: 14,
    tournaments_won: 5,
    podium_finishes: 11,
    matches_won: 38,
    matches_lost: 12,
    total_chips_defended: 42,
    total_chips_lost: 12,
    career_winnings: 1450,
    winRate: 76.0,
    favoritePartner: 'Umber C (SL 4)',
  },
  {
    id: 'p-2',
    member_id: '80921442',
    first_name: 'Umber',
    last_name: 'C',
    full_name: 'Umber C',
    skill_level_8ball: 4,
    skill_level_9ball: 4,
    tournaments_played: 12,
    tournaments_won: 4,
    podium_finishes: 9,
    matches_won: 30,
    matches_lost: 10,
    total_chips_defended: 35,
    total_chips_lost: 10,
    career_winnings: 1100,
    winRate: 75.0,
    favoritePartner: 'Fahad K (SL 6)',
  },
  {
    id: 'p-3',
    member_id: '80921443',
    first_name: 'Mike',
    last_name: 'Johnson',
    full_name: 'Mike Johnson',
    skill_level_8ball: 5,
    skill_level_9ball: 5,
    tournaments_played: 18,
    tournaments_won: 3,
    podium_finishes: 10,
    matches_won: 44,
    matches_lost: 19,
    total_chips_defended: 48,
    total_chips_lost: 19,
    career_winnings: 950,
    winRate: 69.8,
    favoritePartner: 'Carlos R (SL 5)',
  },
  {
    id: 'p-4',
    member_id: '80921444',
    first_name: 'Josh',
    last_name: 'K',
    full_name: 'Josh K',
    skill_level_8ball: 7,
    skill_level_9ball: 8,
    tournaments_played: 20,
    tournaments_won: 6,
    podium_finishes: 14,
    matches_won: 58,
    matches_lost: 16,
    total_chips_defended: 62,
    total_chips_lost: 16,
    career_winnings: 2100,
    winRate: 78.3,
    favoritePartner: 'Alexis G (SL 5)',
  },
  {
    id: 'p-5',
    member_id: '80921445',
    first_name: 'Sarah',
    last_name: 'Miller',
    full_name: 'Sarah Miller',
    skill_level_8ball: 3,
    skill_level_9ball: 4,
    tournaments_played: 10,
    tournaments_won: 2,
    podium_finishes: 6,
    matches_won: 22,
    matches_lost: 11,
    total_chips_defended: 24,
    total_chips_lost: 11,
    career_winnings: 620,
    winRate: 66.7,
    favoritePartner: 'Alex W (SL 6)',
  },
];

const mockPastTournaments = [
  {
    date: 'Friday, Aug 14, 2026',
    name: 'Lucky Cue Friday Night 8-Ball Scotch Doubles',
    venue: 'Lucky Cue Billiards (Moorpark, CA)',
    teamsCount: 18,
    chipsCirculation: '78 Chips',
    champion: 'Fahad Khan & Umber C',
    runnerUp: 'Josh K & Alexis G',
    thirdPlace: 'Mike Johnson & Carlos Rodriguez',
    payout: '$900 Prize Pool',
  },
  {
    date: 'Friday, Aug 7, 2026',
    name: 'Lucky Cue 9-Ball Sudden Death Chip Survivor',
    venue: 'Lucky Cue Billiards (Moorpark, CA)',
    teamsCount: 22,
    chipsCirculation: '94 Chips',
    champion: 'Josh K & Alexis G',
    runnerUp: 'Sarah Miller & Alex Wang',
    thirdPlace: 'David Chen & Jessica Taylor',
    payout: '$1,100 Prize Pool',
  },
];

export const PlayerStatsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<(typeof mockHallOfFamePlayers)[0] | null>(null);

  const filteredPlayers = mockHallOfFamePlayers.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.member_id.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 font-sans">
      {/* Top Banner */}
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h1 className="text-2xl font-black text-white">Player Stats & Hall of Fame</h1>
              <p className="text-xs text-[#888] font-mono">
                Lucky Cue Billiards (Moorpark, CA) • Lifetime Records & Career Wins
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search player or APA ID..."
            className="w-full bg-[#121212] border border-[#333] focus:border-[#12B5CB] rounded-xl px-4 py-2 text-xs text-white placeholder-[#666] focus:outline-none"
          />
        </div>
      </div>

      {/* 2-Column Layout: Leaderboard & Player Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEADERBOARD COLUMN (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#A0A0A0] mb-4 flex items-center justify-between">
              <span>Top Career Champions (Win % Leaders)</span>
              <span className="text-xs text-[#12B5CB] font-mono">LUCKY CUE LEADERBOARD</span>
            </h2>

            <div className="space-y-3">
              {filteredPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedPlayer?.id === player.id
                      ? 'bg-[#12B5CB]/10 border-[#12B5CB]'
                      : 'bg-[#121212] border-[#222] hover:border-[#444]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                        idx === 0
                          ? 'bg-yellow-500 text-black'
                          : idx === 1
                          ? 'bg-gray-300 text-black'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-[#222] text-[#888]'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        {player.full_name}
                        <span className="text-xs text-[#12B5CB] font-mono font-bold">
                          (SL {player.skill_level_8ball})
                        </span>
                      </div>
                      <div className="text-[11px] text-[#888] font-mono">
                        {player.matches_won}W - {player.matches_lost}L • {player.tournaments_won} Titles ({player.podium_finishes} Podiums)
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-emerald-400">
                      {player.winRate}%
                    </div>
                    <div className="text-[10px] text-[#777] font-mono">
                      ${player.career_winnings} Won
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PAST TOURNAMENT ARCHIVES */}
          <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#A0A0A0] flex items-center justify-between">
              <span>Recent Tournament Archives</span>
              <span className="text-xs text-[#888] font-mono">FRIDAY NIGHTS</span>
            </h2>

            <div className="space-y-3">
              {mockPastTournaments.map((t, idx) => (
                <div key={idx} className="bg-[#121212] border border-[#222] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-white">{t.name}</div>
                    <span className="text-xs font-mono text-[#F538A0] font-bold">{t.payout}</span>
                  </div>
                  <div className="text-xs text-[#888] font-mono flex items-center gap-3">
                    <span>{t.date}</span>
                    <span>•</span>
                    <span>{t.teamsCount} Teams</span>
                    <span>•</span>
                    <span>{t.chipsCirculation}</span>
                  </div>
                  <div className="pt-2 border-t border-[#222] flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-yellow-400">
                      <span>🥇</span>
                      <span className="font-bold">{t.champion}</span>
                    </div>
                    <div className="text-[#888]">
                      🥈 {t.runnerUp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PLAYER CAREER PROFILE CARD (1 col) */}
        <div className="space-y-6">
          {selectedPlayer ? (
            <div className="bg-[#181818] border border-[#12B5CB] rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="text-center pb-4 border-b border-[#222]">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#12B5CB] to-[#F538A0] mx-auto flex items-center justify-center font-black text-2xl text-black shadow-lg mb-3">
                  🎱
                </div>
                <h3 className="text-lg font-black text-white">{selectedPlayer.full_name}</h3>
                <p className="text-xs text-[#12B5CB] font-mono">
                  APA #{selectedPlayer.member_id} • 8-Ball SL {selectedPlayer.skill_level_8ball} / 9-Ball SL {selectedPlayer.skill_level_9ball}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#121212] p-3 rounded-xl border border-[#222]">
                  <div className="text-[10px] text-[#888] font-mono uppercase">Match Win Rate</div>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                    {selectedPlayer.winRate}%
                  </div>
                  <div className="text-[10px] text-[#666]">
                    {selectedPlayer.matches_won}W / {selectedPlayer.matches_lost}L
                  </div>
                </div>

                <div className="bg-[#121212] p-3 rounded-xl border border-[#222]">
                  <div className="text-[10px] text-[#888] font-mono uppercase">Tournament Titles</div>
                  <div className="text-lg font-black text-yellow-400 font-mono mt-0.5">
                    {selectedPlayer.tournaments_won} 🏆
                  </div>
                  <div className="text-[10px] text-[#666]">
                    {selectedPlayer.podium_finishes} Podiums
                  </div>
                </div>

                <div className="bg-[#121212] p-3 rounded-xl border border-[#222]">
                  <div className="text-[10px] text-[#888] font-mono uppercase">Chips Defended</div>
                  <div className="text-lg font-black text-[#F538A0] font-mono mt-0.5">
                    {selectedPlayer.total_chips_defended}
                  </div>
                  <div className="text-[10px] text-[#666]">
                    {selectedPlayer.total_chips_lost} Lost
                  </div>
                </div>

                <div className="bg-[#121212] p-3 rounded-xl border border-[#222]">
                  <div className="text-[10px] text-[#888] font-mono uppercase">Career Payouts</div>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    ${selectedPlayer.career_winnings}
                  </div>
                  <div className="text-[10px] text-[#666]">Lucky Cue Events</div>
                </div>
              </div>

              {/* Partner Synergy */}
              <div className="bg-[#121212] p-3.5 rounded-xl border border-[#222] text-xs">
                <div className="font-bold text-white mb-1">Top Scotch Partner Synergy:</div>
                <div className="text-[#12B5CB] font-mono font-bold">{selectedPlayer.favoritePartner}</div>
              </div>
            </div>
          ) : (
            <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-8 text-center space-y-3">
              <div className="text-3xl">👤</div>
              <h3 className="font-bold text-white text-sm">Player Profile</h3>
              <p className="text-xs text-[#888]">
                Click any player from the leaderboard or use search to view their lifetime match win rates, chips defended, and tournament trophies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
