'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../../lib/types/tournament';
import { supabase } from '../../lib/supabase/client';

interface TypeaheadPlayerSearchProps {
  label: string;
  placeholder?: string;
  selectedPlayer: Player | null;
  onSelectPlayer: (player: Player) => void;
  onClear: () => void;
}

export const TypeaheadPlayerSearch: React.FC<TypeaheadPlayerSearchProps> = ({
  label,
  placeholder = 'Type player name or APA ID...',
  selectedPlayer,
  onSelectPlayer,
  onClear,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search against Supabase cached player data
  useEffect(() => {
    if (!query.trim() || selectedPlayer) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('simi_valley_players')
          .select('id, name, skill_level, format, team_name, division_name')
          .ilike('name', `%${query}%`)
          .limit(10);

        if (error) {
          console.error('Typeahead query error:', error);
          const fallbackMatches: Player[] = [
            { id: '1', member_id: 'APA-101', first_name: 'Fahad', last_name: 'Khan', full_name: 'Fahad Khan', skill_level_8ball: 6, skill_level_9ball: 7, home_venue: 'Lucky Cue' },
            { id: '2', member_id: 'APA-102', first_name: 'Mike', last_name: 'Johnson', full_name: 'Mike Johnson', skill_level_8ball: 4, skill_level_9ball: 4, home_venue: 'Plush Pocket' },
            { id: '3', member_id: 'APA-103', first_name: 'Sarah', last_name: 'Miller', full_name: 'Sarah Miller', skill_level_8ball: 3, skill_level_9ball: 2, home_venue: 'Lucky Cue' },
            { id: '4', member_id: 'APA-104', first_name: 'Carlos', last_name: 'Rodriguez', full_name: 'Carlos Rodriguez', skill_level_8ball: 7, skill_level_9ball: 8, home_venue: 'Plush Pocket' },
          ].filter(p => p.full_name.toLowerCase().includes(query.toLowerCase()));
          setResults(fallbackMatches);
        } else if (data) {
          const mapped: Player[] = data.map((item: any) => {
            const parts = (item.name || '').split(' ');
            return {
              id: String(item.id),
              member_id: `APA-SV-${item.id}`,
              first_name: parts[0] || '',
              last_name: parts.slice(1).join(' ') || '',
              full_name: item.name,
              skill_level_8ball: item.format === '8ball' ? item.skill_level : item.skill_level || 3,
              skill_level_9ball: item.format === '9ball' ? item.skill_level : item.skill_level || 3,
              home_venue: item.team_name ? `${item.team_name} (${item.division_name || 'Simi'})` : item.division_name,
            };
          });
          setResults(mapped);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        setIsOpen(true);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, selectedPlayer]);

  if (selectedPlayer) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">{label}</label>
        <div className="flex items-center justify-between p-3 bg-[#1A1A1A] border border-[#12B5CB] rounded-lg">
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              {selectedPlayer.full_name}
              <span className="text-xs bg-[#12B5CB] text-black px-2 py-0.5 rounded font-mono font-bold">
                8B: SL{selectedPlayer.skill_level_8ball || 3} | 9B: SL{selectedPlayer.skill_level_9ball || 3}
              </span>
            </div>
            <div className="text-xs text-[#A0A0A0]">{selectedPlayer.member_id} • {selectedPlayer.home_venue || 'Simi Valley'}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onClear();
            }}
            className="text-xs text-[#F538A0] hover:underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setIsOpen(true)}
        placeholder={placeholder}
        className="w-full bg-[#1A1A1A] border border-[#333] focus:border-[#12B5CB] focus:outline-none text-white px-3.5 py-2.5 rounded-lg transition-colors placeholder:text-[#555]"
      />

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#161616] border border-[#333] rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
          {isLoading && <div className="p-3 text-xs text-[#888]">Searching APA database...</div>}
          {!isLoading && results.length === 0 && (
            <div className="p-3 text-xs text-[#888]">No matching Simi Valley / APA players found.</div>
          )}
          {!isLoading &&
            results.map((player) => (
              <button
                key={player.id || player.member_id}
                type="button"
                onClick={() => {
                  onSelectPlayer(player);
                  setIsOpen(false);
                }}
                className="w-full text-left p-3 hover:bg-[#222] border-b border-[#222] last:border-0 flex justify-between items-center transition-colors"
              >
                <div>
                  <div className="font-semibold text-white text-sm">{player.full_name}</div>
                  <div className="text-xs text-[#888]">{player.member_id} • {player.home_venue || 'South Coast APA'}</div>
                </div>
                <div className="flex gap-1.5 font-mono text-xs">
                  <span className="bg-[#2a2a2a] text-[#12B5CB] px-2 py-0.5 rounded">
                    8B: {player.skill_level_8ball || '-'}
                  </span>
                  <span className="bg-[#2a2a2a] text-[#F538A0] px-2 py-0.5 rounded">
                    9B: {player.skill_level_9ball || '-'}
                  </span>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
