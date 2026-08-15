'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../../lib/types/tournament';
import { supabase } from '../../lib/supabase/client';

interface TypeaheadPlayerSearchProps {
  label: string;
  placeholder?: string;
  playerName: string;
  skillLevel: number;
  onPlayerChange: (name: string, skillLevel: number, playerId?: string) => void;
}

export const TypeaheadPlayerSearch: React.FC<TypeaheadPlayerSearchProps> = ({
  label,
  placeholder = 'Type player name or select from APA list...',
  playerName,
  skillLevel,
  onPlayerChange,
}) => {
  const [query, setQuery] = useState(playerName);
  const [results, setResults] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external name changes
  useEffect(() => {
    setQuery(playerName);
  }, [playerName]);

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
    if (!query.trim() || isCustomMode) {
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
          .limit(8);

        if (error) {
          console.error('Typeahead query error:', error);
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
              home_venue: item.team_name ? `${item.team_name}` : item.division_name,
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
  }, [query, isCustomMode]);

  const handleSelectFromList = (player: Player) => {
    const sl = player.skill_level_8ball || player.skill_level_9ball || 3;
    onPlayerChange(player.full_name, sl, player.id);
    setQuery(player.full_name);
    setIsOpen(false);
    setIsCustomMode(false);
  };

  const handleManualNameInput = (val: string) => {
    setQuery(val);
    onPlayerChange(val, skillLevel || 3);
    setIsCustomMode(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">{label}</label>
        <span className="text-[11px] text-[#888] font-mono">Select or type custom name</span>
      </div>

      <div className="flex gap-2">
        {/* Name Input / Autocomplete */}
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              handleManualNameInput(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => query && setIsOpen(true)}
            placeholder={placeholder}
            className="w-full bg-[#1A1A1A] border border-[#333] focus:border-[#12B5CB] focus:outline-none text-white px-3.5 py-2.5 rounded-lg text-sm transition-colors placeholder:text-[#555]"
          />

          {isOpen && query.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#161616] border border-[#333] rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
              {isLoading && <div className="p-3 text-xs text-[#888]">Searching APA database...</div>}
              
              {!isLoading && results.length > 0 && (
                <div className="divide-y divide-[#222]">
                  {results.map((player) => (
                    <button
                      key={player.id || player.member_id}
                      type="button"
                      onClick={() => handleSelectFromList(player)}
                      className="w-full text-left p-3 hover:bg-[#222] flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-white text-sm">{player.full_name}</div>
                        <div className="text-xs text-[#888]">{player.home_venue || 'Simi Valley APA'}</div>
                      </div>
                      <div className="flex gap-1.5 font-mono text-xs">
                        <span className="bg-[#12B5CB]/20 text-[#12B5CB] px-2 py-0.5 rounded font-bold">
                          SL {player.skill_level_8ball || player.skill_level_9ball || 3}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Custom Player Add Button */}
              <button
                type="button"
                onClick={() => {
                  onPlayerChange(query, skillLevel || 3);
                  setIsOpen(false);
                  setIsCustomMode(true);
                }}
                className="w-full text-left p-3 hover:bg-[#252525] bg-[#1a1a1a] text-[#12B5CB] border-t border-[#333] flex items-center justify-between text-xs font-bold font-mono transition-colors"
              >
                <span>➕ Use "{query}" (Manual / Guest Player)</span>
                <span className="text-[#888]">Set SL →</span>
              </button>
            </div>
          )}
        </div>

        {/* Editable Skill Level Selector */}
        <div className="w-28 flex flex-col">
          <select
            value={skillLevel || 3}
            onChange={(e) => onPlayerChange(query, parseInt(e.target.value, 10))}
            className="w-full h-full bg-[#1A1A1A] border border-[#333] focus:border-[#12B5CB] text-white px-2 py-2.5 rounded-lg text-sm font-mono font-bold transition-colors cursor-pointer text-center"
            title="Player Skill Level"
          >
            <option value="1">SL 1</option>
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
    </div>
  );
};
