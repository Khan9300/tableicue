import { Team, Table, Match, QueueItem, Tournament, TournamentPulseStats, TournamentScenario } from '../types/tournament';
import { calculateStartingChips, validateSkillCap } from './handicap';

export interface TournamentState {
  tournament: Tournament;
  tables: Table[];
  teams: Team[];
  matches: Match[];
  queue: QueueItem[];
}

export interface MatchSnapshot {
  matchId: string;
  tableId: string;
  winnerTeamId: string;
  loserTeamId: string;
  loserPreChipCount: number;
  loserPreStatus: 'active' | 'eliminated';
  newMatchCreatedId?: string;
  dequeuedQueueItemId?: string;
  timestamp: string;
}

/**
 * Core In-Memory / Stored State Machine Engine for Table i-Cue Scotch Doubles Chip Tournaments.
 */
export class TableICueEngine {
  private state: TournamentState;
  private historyStack: MatchSnapshot[] = [];

  constructor(initialState: TournamentState) {
    this.state = JSON.parse(JSON.stringify(initialState));
  }

  public getState(): TournamentState {
    return this.state;
  }

  public getHistoryStack(): MatchSnapshot[] {
    return this.historyStack;
  }

  /**
   * Apply a pre-configured tournament scenario (e.g. 9-Ball, 8-Ball, Winner Stays, Singles, 6-Tables).
   */
  public applyScenario(scenario: TournamentScenario): void {
    this.state.tournament.name = scenario.name;
    this.state.tournament.game_type = scenario.gameType;
    this.state.tournament.format = scenario.format;
    this.state.tournament.max_skill_cap = scenario.maxSkillCap;
    this.state.tournament.starting_chips_policy = scenario.startingChipsPolicy;
    this.state.tournament.table_count = scenario.defaultTablesCount;

    // Ensure state has the requested number of tables (e.g. 6 tables)
    if (this.state.tables.length < scenario.defaultTablesCount) {
      const needed = scenario.defaultTablesCount - this.state.tables.length;
      const startNum = this.state.tables.length + 1;
      for (let i = 0; i < needed; i++) {
        const tableNum = startNum + i;
        this.state.tables.push({
          id: `tbl-${tableNum}`,
          tournament_id: this.state.tournament.id,
          table_number: tableNum,
          label: `Lucky Cue Table ${tableNum}`,
          status: 'open',
        });
      }
    }
  }

  /**
   * Calculates live tournament pulse stats (Griff's Las Vegas model).
   */
  public getPulseStats(): TournamentPulseStats {
    const chipsTotal = this.state.teams.reduce((sum, t) => sum + (t.starting_chips || 0), 0);
    const chipsRemaining = this.state.teams.reduce((sum, t) => sum + (t.chips_remaining || 0), 0);

    const activeTables = this.state.tables.filter((t) => t.status === 'in_use');
    const playingNowCount = activeTables.length * 2; // 2 pairings per active table
    const waitingQueueCount = this.state.queue.filter((q) => q.status === 'waiting').length;

    const survivingPairings = this.state.teams.filter((t) => t.status === 'active').length;
    const eliminatedPairings = this.state.teams.filter((t) => t.status === 'eliminated').length;

    const completedMatches = this.state.matches.filter((m) => m.status === 'completed');
    let totalMinutes = 0;
    let matchTimeCount = 0;

    for (const m of completedMatches) {
      if (m.started_at && m.ended_at) {
        const start = new Date(m.started_at).getTime();
        const end = new Date(m.ended_at).getTime();
        const diffMinutes = Math.max(1, (end - start) / 60000);
        totalMinutes += diffMinutes;
        matchTimeCount++;
      }
    }

    const avgMatchTimeMinutes = matchTimeCount > 0 ? parseFloat((totalMinutes / matchTimeCount).toFixed(1)) : 6.2;

    return {
      chipsRemaining,
      chipsTotal: Math.max(chipsTotal, chipsRemaining),
      playingNowCount,
      waitingQueueCount,
      totalPairings: this.state.teams.length,
      survivingPairings,
      eliminatedPairings,
      avgMatchTimeMinutes,
      completedMatchesCount: completedMatches.length,
      activeMatchesCount: activeTables.length,
    };
  }

  /**
   * Calculates estimated wait time in minutes for a queue position across 6 tables.
   */
  public getEstimatedWaitMinutes(queueIndex: number): number {
    const activeTablesCount = Math.max(1, this.state.tables.filter((t) => t.status === 'in_use').length);
    const avgRackMinutes = 6.2;
    const turnoverRateMinutes = avgRackMinutes / activeTablesCount; // ~1.03 min per match finish on 6 tables
    return Math.max(1, Math.round((queueIndex + 1) * turnoverRateMinutes));
  }

  /**
   * Registers a new team and allocates initial virtual chips.
   */
  public registerTeam(params: {
    teamName: string;
    player1Name: string;
    player2Name?: string;
    player1SL: number;
    player2SL?: number;
    player1Id?: string;
    player2Id?: string;
  }): { success: boolean; team?: Team; error?: string } {
    const isSingles = !params.player2Name || params.player2Name.trim() === '';
    const p2SL = isSingles ? 0 : (params.player2SL || 3);

    const validation = validateSkillCap(
      params.player1SL,
      p2SL,
      this.state.tournament.max_skill_cap
    );

    if (!validation.valid && !isSingles) {
      return { success: false, error: validation.error };
    }

    const combinedSL = isSingles ? params.player1SL : validation.combinedSL;
    const startingChips = calculateStartingChips(
      combinedSL,
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
      combined_sl: combinedSL,
      starting_chips: startingChips,
      chips_remaining: startingChips,
      status: 'active',
      wins: 0,
      losses: 0,
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
   * Dual Confirmation Scoring:
   * One person from each team marks winner or loser. Once both agree, the match is completed!
   */
  public submitTeamMatchVote(params: {
    matchId: string;
    reportingTeamId: string;
    reportedWinnerId: string;
  }): {
    completed: boolean;
    disputed: boolean;
    awaitingOtherTeam: boolean;
    winnerTeamId?: string;
    error?: string;
  } {
    const match = this.state.matches.find((m) => m.id === params.matchId);
    if (!match) return { completed: false, disputed: false, awaitingOtherTeam: false, error: 'Match not found' };

    if (params.reportingTeamId === match.team_a_id) {
      match.team_a_confirmed_winner_id = params.reportedWinnerId;
    } else if (params.reportingTeamId === match.team_b_id) {
      match.team_b_confirmed_winner_id = params.reportedWinnerId;
    } else {
      return { completed: false, disputed: false, awaitingOtherTeam: false, error: 'Reporting team not in match' };
    }

    // Check if both teams have voted
    if (match.team_a_confirmed_winner_id && match.team_b_confirmed_winner_id) {
      if (match.team_a_confirmed_winner_id === match.team_b_confirmed_winner_id) {
        // Both agree on the winner! Complete match!
        const winnerId = match.team_a_confirmed_winner_id;
        match.is_disputed = false;
        const res = this.completeMatch(match.id, winnerId);
        return {
          completed: res.success,
          disputed: false,
          awaitingOtherTeam: false,
          winnerTeamId: winnerId,
        };
      } else {
        // Disagreement: Dispute raised!
        match.is_disputed = true;
        if (match.table_id) {
          this.requestReferee(match.table_id);
        }
        return {
          completed: false,
          disputed: true,
          awaitingOtherTeam: false,
        };
      }
    }

    return {
      completed: false,
      disputed: false,
      awaitingOtherTeam: true,
    };
  }

  /**
   * Completes a match, penalizes the loser, moves loser to queue end (or eliminates),
   * keeps winner on table, and pulls next opponent from the pipeline.
   */
  public completeMatch(matchId: string, winnerTeamId: string): { success: boolean; newMatch?: Match; error?: string } {
    const match = this.state.matches.find((m) => m.id === matchId);
    if (!match) return { success: false, error: 'Match not found' };

    const loserTeamId = match.team_a_id === winnerTeamId ? match.team_b_id : match.team_a_id;
    const loserTeam = this.state.teams.find((t) => t.id === loserTeamId);
    const winnerTeam = this.state.teams.find((t) => t.id === winnerTeamId);

    if (!loserTeam || !winnerTeam) return { success: false, error: 'Teams not found' };

    // Record snapshot for Undo
    const preChips = loserTeam.chips_remaining;
    const preStatus = loserTeam.status;

    // 1. Update Match Record
    match.status = 'completed';
    match.winner_team_id = winnerTeamId;
    match.loser_team_id = loserTeamId;
    match.ended_at = new Date().toISOString();

    // Update Win/Loss counters
    winnerTeam.wins = (winnerTeam.wins || 0) + 1;
    loserTeam.losses = (loserTeam.losses || 0) + 1;

    // 2. Decrement Loser's Virtual Chips
    loserTeam.chips_remaining = Math.max(0, loserTeam.chips_remaining - 1);

    let loserQueueEntryId: string | undefined;
    if (loserTeam.chips_remaining === 0) {
      loserTeam.status = 'eliminated';
      const activeCount = this.state.teams.filter((t) => t.status === 'active').length;
      loserTeam.elimination_rank = activeCount + 1;
    } else {
      loserQueueEntryId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      this.state.queue.push({
        id: loserQueueEntryId,
        tournament_id: this.state.tournament.id,
        team_id: loserTeam.id,
        status: 'waiting',
        entered_queue_at: new Date().toISOString(),
        team: loserTeam,
      });
    }

    // 3. Find Table and Assign Next Challenger from Pipeline
    const table = this.state.tables.find((tbl) => tbl.id === match.table_id);
    let newMatch: Match | undefined;
    let dequeuedItemId: string | undefined;

    if (table) {
      table.referee_requested = false;

      if (this.state.tournament.auto_pilot) {
        const nextQueueItemIndex = this.state.queue.findIndex((q) => q.status === 'waiting');

        if (nextQueueItemIndex !== -1) {
          const nextTeamItem = this.state.queue[nextQueueItemIndex];
          dequeuedItemId = nextTeamItem.team_id;
          this.state.queue.splice(nextQueueItemIndex, 1);

          newMatch = {
            id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            tournament_id: this.state.tournament.id,
            table_id: table.id,
            team_a_id: winnerTeam.id, // Winner stays on table & racks up
            team_b_id: nextTeamItem.team_id, // Next opponent in pipeline
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
    }

    // Save snapshot to history stack
    if (table) {
      this.historyStack.push({
        matchId: match.id,
        tableId: table.id,
        winnerTeamId,
        loserTeamId,
        loserPreChipCount: preChips,
        loserPreStatus: preStatus,
        newMatchCreatedId: newMatch?.id,
        dequeuedQueueItemId: dequeuedItemId,
        timestamp: new Date().toISOString(),
      });
    }

    // Check if tournament concluded
    const remainingActiveTeams = this.state.teams.filter((t) => t.status === 'active');
    if (remainingActiveTeams.length === 1) {
      this.state.tournament.status = 'completed';
      this.state.tournament.ended_at = new Date().toISOString();
    }

    return { success: true, newMatch };
  }

  /**
   * UNDO Action: Reverts an accidental match result submission!
   * Restores loser's chip, resets team records, removes the auto-created match,
   * and puts the challenger back at the front of the queue.
   */
  public undoLastMatch(tableId?: string): { success: boolean; restoredMatch?: Match; error?: string } {
    let snapshotIdx = -1;
    if (tableId) {
      for (let i = this.historyStack.length - 1; i >= 0; i--) {
        if (this.historyStack[i].tableId === tableId) {
          snapshotIdx = i;
          break;
        }
      }
    } else {
      snapshotIdx = this.historyStack.length - 1;
    }

    if (snapshotIdx === -1) {
      return { success: false, error: 'No recent match history to undo.' };
    }

    const snapshot = this.historyStack.splice(snapshotIdx, 1)[0];

    // 1. Revert Teams
    const winner = this.state.teams.find((t) => t.id === snapshot.winnerTeamId);
    const loser = this.state.teams.find((t) => t.id === snapshot.loserTeamId);

    if (winner) {
      winner.wins = Math.max(0, (winner.wins || 1) - 1);
    }
    if (loser) {
      loser.losses = Math.max(0, (loser.losses || 1) - 1);
      loser.chips_remaining = snapshot.loserPreChipCount;
      loser.status = snapshot.loserPreStatus;
      loser.elimination_rank = undefined;

      // Remove loser from the end of the queue if they were added
      this.state.queue = this.state.queue.filter(
        (q) => !(q.team_id === loser.id && q.status === 'waiting')
      );
    }

    // 2. Revert Table & Matches
    const table = this.state.tables.find((t) => t.id === snapshot.tableId);
    const origMatch = this.state.matches.find((m) => m.id === snapshot.matchId);

    // If a new match was spawned by auto-pilot, cancel it
    if (snapshot.newMatchCreatedId) {
      this.state.matches = this.state.matches.filter((m) => m.id !== snapshot.newMatchCreatedId);
    }

    // If a challenger was pulled from the queue, push them back to the front of the queue
    if (snapshot.dequeuedQueueItemId) {
      const challengerTeam = this.state.teams.find((t) => t.id === snapshot.dequeuedQueueItemId);
      this.state.queue.unshift({
        id: `queue_restored_${Date.now()}`,
        tournament_id: this.state.tournament.id,
        team_id: snapshot.dequeuedQueueItemId,
        status: 'waiting',
        entered_queue_at: new Date().toISOString(),
        team: challengerTeam,
      });
    }

    // Restore original match back to in_progress on the table
    if (origMatch && table) {
      origMatch.status = 'in_progress';
      origMatch.winner_team_id = undefined;
      origMatch.loser_team_id = undefined;
      origMatch.ended_at = undefined;
      origMatch.team_a_confirmed_winner_id = undefined;
      origMatch.team_b_confirmed_winner_id = undefined;
      origMatch.is_disputed = false;

      table.active_match_id = origMatch.id;
      table.status = 'in_use';
      table.referee_requested = false;
    }

    // Revert tournament completion status if applicable
    if (this.state.tournament.status === 'completed') {
      this.state.tournament.status = 'in_progress';
      this.state.tournament.ended_at = undefined;
    }

    return { success: true, restoredMatch: origMatch };
  }

  /**
   * Request referee assistance at a table.
   */
  public requestReferee(tableId: string): boolean {
    const table = this.state.tables.find((t) => t.id === tableId || t.table_number === parseInt(tableId, 10));
    if (!table) return false;
    table.referee_requested = true;
    table.referee_request_time = new Date().toISOString();
    return true;
  }

  /**
   * Clear referee alert for a table.
   */
  public clearReferee(tableId: string): boolean {
    const table = this.state.tables.find((t) => t.id === tableId || t.table_number === parseInt(tableId, 10));
    if (!table) return false;
    table.referee_requested = false;
    table.referee_request_time = undefined;
    return true;
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
