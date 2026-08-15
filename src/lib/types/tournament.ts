export type GameType = '8_ball' | '9_ball';
export type TournamentFormat =
  | 'winner_stays_queue' // King of the Table / Winner stays on table, racks up for next queued challenger
  | 'scotch_doubles_8ball'
  | 'scotch_doubles_9ball'
  | 'singles_8ball'
  | 'singles_9ball'
  | 'scotch_doubles_chip'
  | 'double_elim';

export type TournamentStatus = 'registering' | 'in_progress' | 'completed' | 'paused';
export type TeamStatus = 'active' | 'eliminated';
export type TableStatus = 'open' | 'in_use' | 'maintenance';
export type MatchStatus = 'in_progress' | 'completed' | 'disputed';
export type QueueStatus = 'waiting' | 'assigned' | 'on_deck';

export interface Player {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  skill_level_8ball?: number;
  skill_level_9ball?: number;
  fargo_rating?: number;
  home_venue?: string;
  // Lifetime Career Stats
  tournaments_played?: number;
  tournaments_won?: number;
  podium_finishes?: number;
  matches_won?: number;
  matches_lost?: number;
  total_chips_defended?: number;
  total_chips_lost?: number;
  career_winnings?: number;
}

export interface Team {
  id: string;
  tournament_id: string;
  team_name: string;
  player_1_id?: string;
  player_2_id?: string;
  player_1_name: string;
  player_2_name?: string; // Optional for singles
  player_1_sl: number;
  player_2_sl?: number;   // Optional for singles
  combined_sl: number;
  starting_chips: number;
  chips_remaining: number;
  status: TeamStatus;
  elimination_rank?: number;
  wins?: number;
  losses?: number;
}

export interface Table {
  id: string;
  tournament_id: string;
  table_number: number;
  label?: string;
  status: TableStatus;
  active_match_id?: string;
  referee_requested?: boolean;
  referee_request_time?: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  table_id?: string;
  team_a_id: string;
  team_b_id: string;
  team_a_score: number;
  team_b_score: number;
  race_to: number;
  status: MatchStatus;
  winner_team_id?: string;
  loser_team_id?: string;
  team_a_confirmed_winner_id?: string;
  team_b_confirmed_winner_id?: string;
  is_disputed?: boolean;
  started_at: string;
  ended_at?: string;
}

export interface QueueItem {
  id: string;
  tournament_id: string;
  team_id: string;
  status: QueueStatus;
  entered_queue_at: string;
  assigned_match_id?: string;
  team?: Team;
}

export interface TournamentPulseStats {
  chipsRemaining: number;
  chipsTotal: number;
  playingNowCount: number;
  waitingQueueCount: number;
  totalPairings: number;
  survivingPairings: number;
  eliminatedPairings: number;
  avgMatchTimeMinutes: number;
  completedMatchesCount: number;
  activeMatchesCount: number;
}

export interface TournamentScenario {
  id: string;
  name: string;
  description: string;
  gameType: GameType;
  format: TournamentFormat;
  maxSkillCap: number;
  defaultTablesCount: number;
  startingChipsPolicy: 'handicap_matrix' | 'equal';
  isWinnerStays: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  game_type: GameType;
  max_skill_cap: number;
  starting_chips_policy: 'handicap_matrix' | 'equal';
  venue_name: string;
  status: TournamentStatus;
  auto_pilot: boolean;
  table_count?: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
}
