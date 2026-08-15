import { Team, Table, Match, QueueItem, Tournament } from '../types/tournament';
import { calculateStartingChips, validateSkillCap } from './handicap';

export interface TournamentState {
  tournament: Tournament;
  tables: Table[];
  teams: Team[];
  matches: Match[];
  queue: QueueItem[];
}

/**
 * Core In-Memory / Stored State Machine Engine for Table i-Cue Scotch Doubles Chip Tournaments.
 */
export class TableICueEngine {
  private state: TournamentState;

  constructor(initialState: TournamentState) {
    this.state = JSON.parse(JSON.stringify(initialState));
  }

  public getState(): TournamentState {
    return this.state;
  }

  /**
   * Registers a new team and allocates initial virtual chips.
   */
  public registerTeam(params: {
    teamName: string;
    player1Name: string;
    player2Name: string;
    player1SL: number;
    player2SL: number;
    player1Id?: string;
    player2Id?: string;
  }): { success: boolean; team?: Team; error?: string } {
    const validation = validateSkillCap(
      params.player1SL,
      params.player2SL,
      this.state.tournament.max_skill_cap
    );

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const startingChips = calculateStartingChips(
      validation.combinedSL,
      this.state.tournament.starting_chips_policy
    );

    const newTeam: Team = {
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tournament_id: this.state.tournament.id,
      team_name: params.teamName,
      player_1_id: params.player1Id,
      player_2_id: params.player2Id,
      player_1_name: params.player1Name,
      player_2_name: params.player2Name,
      player_1_sl: params.player1SL,
      player_2_sl: params.player2SL,
      combined_sl: validation.combinedSL,
      starting_chips: startingChips,
      chips_remaining: startingChips,
      status: 'active',
    };

    this.state.teams.push(newTeam);

    // Enqueue into waiting line
    const queueEntry: QueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tournament_id: this.state.tournament.id,
      team_id: newTeam.id,
      status: 'waiting',
      entered_queue_at: new Date().toISOString(),
      team: newTeam,
    };

    this.state.queue.push(queueEntry);

    // Trigger auto-pilot table assignment if enabled
    if (this.state.tournament.auto_pilot && this.state.tournament.status === 'in_progress') {
      this.autoAssignTables();
    }

    return { success: true, team: newTeam };
  }

  /**
   * Completes a match, penalizes the loser, moves loser to queue end (or eliminates),
   * keeps winner on table, and pulls next opponent from the queue.
   */
  public completeMatch(matchId: string, winnerTeamId: string): { success: boolean; newMatch?: Match; error?: string } {
    const match = this.state.matches.find((m) => m.id === matchId);
    if (!match) return { success: false, error: 'Match not found' };

    const loserTeamId = match.team_a_id === winnerTeamId ? match.team_b_id : match.team_a_id;
    const loserTeam = this.state.teams.find((t) => t.id === loserTeamId);
    const winnerTeam = this.state.teams.find((t) => t.id === winnerTeamId);

    if (!loserTeam || !winnerTeam) return { success: false, error: 'Teams not found' };

    // 1. Update Match Record
    match.status = 'completed';
    match.winner_team_id = winnerTeamId;
    match.loser_team_id = loserTeamId;
    match.ended_at = new Date().toISOString();

    // 2. Decrement Loser's Virtual Chips
    loserTeam.chips_remaining = Math.max(0, loserTeam.chips_remaining - 1);

    if (loserTeam.chips_remaining === 0) {
      loserTeam.status = 'eliminated';
      const activeCount = this.state.teams.filter((t) => t.status === 'active').length;
      loserTeam.elimination_rank = activeCount + 1;
    } else {
      // Re-insert loser at bottom of queue
      this.state.queue.push({
        id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        tournament_id: this.state.tournament.id,
        team_id: loserTeam.id,
        status: 'waiting',
        entered_queue_at: new Date().toISOString(),
        team: loserTeam,
      });
    }

    // 3. Find Table and Assign Next Challenger
    const table = this.state.tables.find((tbl) => tbl.id === match.table_id);
    let newMatch: Match | undefined;

    if (table && this.state.tournament.auto_pilot) {
      // Dequeue next waiting team
      const nextQueueItemIndex = this.state.queue.findIndex((q) => q.status === 'waiting');

      if (nextQueueItemIndex !== -1) {
        const nextTeamItem = this.state.queue[nextQueueItemIndex];
        this.state.queue.splice(nextQueueItemIndex, 1);

        newMatch = {
          id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          tournament_id: this.state.tournament.id,
          table_id: table.id,
          team_a_id: winnerTeam.id, // Winner stays on table
          team_b_id: nextTeamItem.team_id, // Next in queue
          team_a_score: 0,
          team_b_score: 0,
          race_to: 1,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        };

        this.state.matches.push(newMatch);
        table.active_match_id = newMatch.id;
        table.status = 'in_use';
      } else {
        table.status = 'open';
        table.active_match_id = undefined;
      }
    }

    // Check if tournament concluded (only 1 active team left)
    const remainingActiveTeams = this.state.teams.filter((t) => t.status === 'active');
    if (remainingActiveTeams.length === 1) {
      this.state.tournament.status = 'completed';
      this.state.tournament.ended_at = new Date().toISOString();
    }

    return { success: true, newMatch };
  }

  /**
   * Auto-assigns available tables to teams waiting in the queue.
   */
  public autoAssignTables(): void {
    const openTables = this.state.tables.filter((t) => t.status === 'open');

    for (const table of openTables) {
      const waitingItems = this.state.queue.filter((q) => q.status === 'waiting');
      if (waitingItems.length >= 2) {
        const teamAItem = waitingItems[0];
        const teamBItem = waitingItems[1];

        // Remove from waiting queue
        this.state.queue = this.state.queue.filter(
          (q) => q.id !== teamAItem.id && q.id !== teamBItem.id
        );

        const newMatch: Match = {
          id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          tournament_id: this.state.tournament.id,
          table_id: table.id,
          team_a_id: teamAItem.team_id,
          team_b_id: teamBItem.team_id,
          team_a_score: 0,
          team_b_score: 0,
          race_to: 1,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        };

        this.state.matches.push(newMatch);
        table.status = 'in_use';
        table.active_match_id = newMatch.id;
      }
    }
  }

  /**
   * Manual Director Override: Adjust chips for a team.
   */
  public adjustChips(teamId: string, delta: number): boolean {
    const team = this.state.teams.find((t) => t.id === teamId);
    if (!team) return false;

    team.chips_remaining = Math.max(0, team.chips_remaining + delta);
    if (team.chips_remaining === 0 && team.status === 'active') {
      team.status = 'eliminated';
    } else if (team.chips_remaining > 0 && team.status === 'eliminated') {
      team.status = 'active';
    }
    return true;
  }
}
