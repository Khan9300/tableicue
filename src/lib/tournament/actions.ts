import { supabase } from '../supabase/client';
import { validateSkillCap, calculateStartingChips } from './handicap';

export async function registerTeamAction(params: {
  tournamentId: string;
  teamName: string;
  player1Name: string;
  player2Name: string;
  player1SL: number;
  player2SL: number;
  maxCap?: number;
  startingChipsPolicy?: 'handicap_matrix' | 'equal';
}): Promise<{ success: boolean; teamId?: string; error?: string }> {
  try {
    const validation = validateSkillCap(params.player1SL, params.player2SL, params.maxCap || 10);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const startingChips = calculateStartingChips(
      validation.combinedSL,
      params.startingChipsPolicy || 'handicap_matrix'
    );

    // 1. Insert Team
    const { data: teamData, error: teamErr } = await supabase
      .from('tableicue_teams')
      .insert({
        tournament_id: params.tournamentId,
        team_name: params.teamName,
        player_1_name: params.player1Name,
        player_2_name: params.player2Name,
        player_1_sl: params.player1SL,
        player_2_sl: params.player2SL,
        starting_chips: startingChips,
        chips_remaining: startingChips,
        status: 'active',
      })
      .select('id')
      .single();

    if (teamErr) throw teamErr;

    // 2. Insert into Queue
    const { error: queueErr } = await supabase
      .from('tableicue_queue')
      .insert({
        tournament_id: params.tournamentId,
        team_id: teamData.id,
        status: 'waiting',
      });

    if (queueErr) throw queueErr;

    return { success: true, teamId: teamData.id };
  } catch (err: any) {
    console.error('Error registering team:', err);
    return { success: false, error: err?.message || 'Failed to register team' };
  }
}

export async function completeMatchAction(params: {
  tournamentId: string;
  matchId: string;
  winnerTeamId: string;
  loserTeamId: string;
  tableId: string;
  autoPilot?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Mark Match Completed
    const { error: matchErr } = await supabase
      .from('tableicue_matches')
      .update({
        status: 'completed',
        winner_team_id: params.winnerTeamId,
        loser_team_id: params.loserTeamId,
        ended_at: new Date().toISOString(),
      })
      .eq('id', params.matchId);

    if (matchErr) throw matchErr;

    // 2. Fetch Loser Chips
    const { data: loserTeam, error: loserFetchErr } = await supabase
      .from('tableicue_teams')
      .select('chips_remaining')
      .eq('id', params.loserTeamId)
      .single();

    if (loserFetchErr) throw loserFetchErr;

    const newChips = Math.max(0, loserTeam.chips_remaining - 1);
    const newStatus = newChips === 0 ? 'eliminated' : 'active';

    await supabase
      .from('tableicue_teams')
      .update({
        chips_remaining: newChips,
        status: newStatus,
      })
      .eq('id', params.loserTeamId);

    // If loser is still active, re-enqueue to bottom of line
    if (newStatus === 'active') {
      await supabase
        .from('tableicue_queue')
        .insert({
          tournament_id: params.tournamentId,
          team_id: params.loserTeamId,
          status: 'waiting',
          entered_queue_at: new Date().toISOString(),
        });
    }

    // 3. If Auto-Pilot is enabled, invoke atomic dequeue procedure
    if (params.autoPilot !== false) {
      await supabase.rpc('tableicue_dequeue_next', {
        p_tournament_id: params.tournamentId,
        p_table_id: params.tableId,
        p_winner_team_id: params.winnerTeamId,
      });
    } else {
      // Free the table
      await supabase
        .from('tableicue_tables')
        .update({ status: 'open', active_match_id: null, updated_at: new Date().toISOString() })
        .eq('id', params.tableId);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error completing match:', err);
    return { success: false, error: err?.message || 'Failed to complete match' };
  }
}

export async function adjustChipsAction(teamId: string, delta: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: team, error: fetchErr } = await supabase
      .from('tableicue_teams')
      .select('chips_remaining')
      .eq('id', teamId)
      .single();

    if (fetchErr) throw fetchErr;

    const newChips = Math.max(0, team.chips_remaining + delta);
    const newStatus = newChips === 0 ? 'eliminated' : 'active';

    const { error: updateErr } = await supabase
      .from('tableicue_teams')
      .update({ chips_remaining: newChips, status: newStatus })
      .eq('id', teamId);

    if (updateErr) throw updateErr;

    return { success: true };
  } catch (err: any) {
    console.error('Error adjusting chips:', err);
    return { success: false, error: err?.message || 'Failed to adjust chips' };
  }
}
