import { createClient } from '@supabase/supabase-js';
import { Player, Format } from '../engine/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpjannbvxpqqbvpclllq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwamFubmJ2eHBxcWJ2cGNsbGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTAwODMsImV4cCI6MjEwMjEyNjA4M30.F0U4NmYvgoeSM3JvaSi_Ca-5V4KFB84MdugsDTYx5KU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetches the roster for a given team from simi_valley_players
 * @param teamName The name of the team
 * @param format '8ball' or '9ball'
 */
export async function fetchRoster(teamName: string, format: Format): Promise<Player[]> {
  const { data, error } = await supabase
    .from('simi_valley_players')
    .select('*')
    .eq('team_name', teamName)
    .eq('format', format);
    
  if (error) {
    throw error;
  }
  
  return (data || []).map((row: any) => ({
    id: row.player_name.toLowerCase().replace(/ /g, '-'),
    name: row.player_name,
    sl: row.sl,
    wins: row.wins,
    losses: row.losses,
  }));
}

/**
 * Fetches the opponent roster
 * @param teamName The name of the opponent team
 * @param divisionId The division ID to restrict the query
 */
export async function fetchOpponentRoster(teamName: string, divisionId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('simi_valley_players')
    .select('*')
    .eq('team_name', teamName)
    .eq('division_id', divisionId);
    
  if (error) {
    throw error;
  }
  
  return (data || []).map((row: any) => ({
    id: row.player_name.toLowerCase().replace(/ /g, '-'),
    name: row.player_name,
    sl: row.sl,
    wins: row.wins,
    losses: row.losses,
  }));
}
