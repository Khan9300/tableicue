'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';

interface SimiPlayer {
  id: number;
  name: string;
  division_name: string;
  team_name: string;
  format: string;
  skill_level: number;
  matches_played: number;
  matches_won: number;
  losses: number;
  win_rate: number | string;
}

export const SimiValleyRosterView: React.FC = () => {
  const [players, setPlayers] = useState<SimiPlayer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | '8ball' | '9ball'>('all');
  const [slFilter, setSlFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPlayers() {
      setIsLoading(true);
      try {
        let query = supabase
          .from('simi_valley_players')
          .select('id, name, division_name, team_name, format, skill_level, matches_played, matches_won, losses, win_rate')
          .order('name', { ascending: true })
          .limit(100);

        if (searchQuery.trim()) {
          query = query.ilike('name', `%${searchQuery}%`);
        }
        if (formatFilter !== 'all') {
          query = query.eq('format', formatFilter);
        }
        if (slFilter !== 'all') {
          query = query.eq('skill_level', parseInt(slFilter, 10));
        }

        const { data, error } = await query;
        if (error) {
          console.error('Error fetching Simi Valley players:', error);
        } else if (data) {
          setPlayers(data as SimiPlayer[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(loadPlayers, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, formatFilter, slFilter]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <h1 className="text-2xl font-black tracking-tight">Simi Valley & South Coast APA Directory</h1>
          </div>
          <p className="text-xs text-[#888] mt-1 font-mono">
            Synced directly from APA Member Services • 399 Active Players & Stats
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player name..."
            className="bg-[#1A1A1A] border border-[#333] focus:border-[#12B5CB] focus:outline-none text-white px-3.5 py-1.5 rounded-lg text-xs placeholder:text-[#555] w-56"
          />

          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as any)}
            className="bg-[#1A1A1A] border border-[#333] focus:border-[#12B5CB] text-white px-3 py-1.5 rounded-lg text-xs font-mono"
          >
            <option value="all">All Formats</option>
            <option value="8ball">8-Ball</option>
            <option value="9ball">9-Ball</option>
          </select>

          <select
            value={slFilter}
            onChange={(e) => setSlFilter(e.target.value)}
            className="bg-[#1A1A1A] border border-[#333] focus:border-[#12B5CB] text-white px-3 py-1.5 rounded-lg text-xs font-mono"
          >
            <option value="all">All Skill Levels</option>
            <option value="2">SL 2</option>
            <option value="3">SL 3</option>
            <option value="4">SL 4</option>
            <option value="5">SL 5</option>
            <option value="6">SL 6</option>
            <option value="7">SL 7</option>
            <option value="8">SL 8</option>
            <option value="9">SL 9</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#121212] text-[#888] font-mono uppercase tracking-wider border-b border-[#222]">
              <tr>
                <th className="p-3.5">Player Name</th>
                <th className="p-3.5">Format</th>
                <th className="p-3.5">Skill Level</th>
                <th className="p-3.5">Team Name</th>
                <th className="p-3.5">Division</th>
                <th className="p-3.5">Matches</th>
                <th className="p-3.5">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#666] font-mono">
                    Loading Simi Valley roster...
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#666] font-mono">
                    No players matching filter criteria.
                  </td>
                </tr>
              ) : (
                players.map((player) => {
                  const winRatePct = player.win_rate
                    ? `${(parseFloat(String(player.win_rate)) * 100).toFixed(0)}%`
                    : '-';
                  return (
                    <tr key={player.id} className="hover:bg-[#1f1f1f] transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        {player.name}
                      </td>
                      <td className="p-3.5 font-mono text-[#12B5CB] uppercase">
                        {player.format || '8ball'}
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="bg-[#242424] text-white px-2 py-0.5 rounded font-bold">
                          SL {player.skill_level}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#ccc]">{player.team_name || '-'}</td>
                      <td className="p-3.5 text-[#888]">{player.division_name || 'Simi Valley'}</td>
                      <td className="p-3.5 font-mono text-[#aaa]">
                        {player.matches_won || 0}W - {player.losses || 0}L ({player.matches_played || 0})
                      </td>
                      <td className="p-3.5 font-mono font-bold text-[#F538A0]">
                        {winRatePct}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
