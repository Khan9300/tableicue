'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './client';
import { TournamentState } from '../tournament/engine';
import { Tournament, Table, Team, Match, QueueItem } from '../types/tournament';

export function useTableICueRealtime(tournamentId: string = 'a0000000-0000-0000-0000-000000000001') {
  const [state, setState] = useState<TournamentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full tournament state from Supabase
  const fetchTournamentState = useCallback(async () => {
    try {
      // 1. Fetch Tournament
      const { data: tourneyData, error: tourneyErr } = await supabase
        .from('tableicue_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tourneyErr) throw tourneyErr;

      // 2. Fetch Tables
      const { data: tablesData, error: tablesErr } = await supabase
        .from('tableicue_tables')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('table_number', { ascending: true });

      if (tablesErr) throw tablesErr;

      // 3. Fetch Teams
      const { data: teamsData, error: teamsErr } = await supabase
        .from('tableicue_teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

      if (teamsErr) throw teamsErr;

      // 4. Fetch Matches
      const { data: matchesData, error: matchesErr } = await supabase
        .from('tableicue_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('started_at', { ascending: true });

      if (matchesErr) throw matchesErr;

      // 5. Fetch Queue
      const { data: queueData, error: queueErr } = await supabase
        .from('tableicue_queue')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('entered_queue_at', { ascending: true });

      if (queueErr) throw queueErr;

      const loadedState: TournamentState = {
        tournament: tourneyData as Tournament,
        tables: (tablesData || []) as Table[],
        teams: (teamsData || []) as Team[],
        matches: (matchesData || []) as Match[],
        queue: (queueData || []).map((q: any) => ({
          ...q,
          team: (teamsData || []).find((t: any) => t.id === q.team_id),
        })) as QueueItem[],
      };

      setState(loadedState);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching tournament state:', err);
      setError(err?.message || 'Failed to load tournament data');
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  // Subscribe to Supabase Realtime WebSocket changes
  useEffect(() => {
    fetchTournamentState();

    const channel = supabase
      .channel(`tableicue_realtime_${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tableicue_tournaments', filter: `id=eq.${tournamentId}` },
        () => fetchTournamentState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tableicue_tables', filter: `tournament_id=eq.${tournamentId}` },
        () => fetchTournamentState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tableicue_teams', filter: `tournament_id=eq.${tournamentId}` },
        () => fetchTournamentState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tableicue_matches', filter: `tournament_id=eq.${tournamentId}` },
        () => fetchTournamentState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tableicue_queue', filter: `tournament_id=eq.${tournamentId}` },
        () => fetchTournamentState()
      )
      .subscribe((status) => {
        console.log(`📡 Supabase Realtime subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, fetchTournamentState]);

  return {
    state,
    isLoading,
    error,
    refresh: fetchTournamentState,
  };
}
