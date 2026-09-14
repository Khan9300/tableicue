/**
 * Fee Tracker — TypeScript Types
 *
 * Mirrors the Supabase fee_* tables. Each table has:
 *   - Row type (what you get from SELECT)
 *   - Insert type (what you send to INSERT, omitting server-generated fields)
 *   - Update type (partial, for PATCH operations)
 *
 * Naming: fee_teams → FeeTeam, fee_entries → FeeEntry, etc.
 */

/* ================================ Enums ================================ */

export type Format = '8ball' | '9ball';

export type MatchResult = 'W' | 'L';

export type Night = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

/* ================================ fee_teams ================================ */

/** A team registered in the fee tracker. One per APA team. */
export interface FeeTeam {
  id: string;
  team_code: string;
  team_name: string;
  team_number: string | null;
  format: Format;
  night: Night | null;
  captain_name: string | null;
  pin_hash: string;
  current_session: string;
  created_at: string;
}

export interface FeeTeamInsert {
  team_name: string;
  team_number?: string;
  format: Format;
  night?: Night;
  captain_name?: string;
  pin: string; // raw PIN — hashed server-side
  current_session: string;
}

/* ================================ fee_sessions ================================ */

/** An APA session (e.g. "Fall 2026") for a team. */
export interface FeeSession {
  id: string;
  team_id: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
}

export interface FeeSessionInsert {
  team_id: string;
  session_name: string;
}

/* ================================ fee_match_nights ================================ */

/** One team match night (e.g. "Sep 15 vs Borderline Bandits"). */
export interface FeeMatchNight {
  id: string;
  session_id: string;
  team_id: string;
  match_date: string; // ISO date string YYYY-MM-DD
  week_number: number | null;
  opponent_name: string | null;
  opponent_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface FeeMatchNightInsert {
  session_id: string;
  team_id: string;
  match_date: string;
  week_number?: number;
  opponent_name?: string;
  opponent_number?: string;
  notes?: string;
}

/* ================================ fee_entries ================================ */

/** A single fee entry: one player, one match night, \$10. */
export interface FeeEntry {
  id: string;
  match_night_id: string;
  team_id: string;
  player_name: string;
  round_number: number | null;
  amount: number;
  is_paid: boolean;
  is_voided: boolean;
  void_reason: string | null;
  result: MatchResult | null;
  opponent_name: string | null;
  opponent_sl: number | null;
  player_sl: number | null;
  created_at: string;
  paid_at: string | null;
}

export interface FeeEntryInsert {
  match_night_id: string;
  team_id: string;
  player_name: string;
  round_number?: number;
  amount?: number;
  result?: MatchResult;
  opponent_name?: string;
  opponent_sl?: number;
  player_sl?: number;
}

export interface FeeEntryUpdate {
  is_paid?: boolean;
  is_voided?: boolean;
  void_reason?: string;
  result?: MatchResult;
  opponent_name?: string;
  opponent_sl?: number;
  paid_at?: string | null;
}

/* ================================ fee_players ================================ */

/** A player on a team's roster for fee tracking. */
export interface FeePlayer {
  id: string;
  team_id: string;
  player_name: string;
  apa_member_number: string | null;
  skill_level: number | null;
  is_active: boolean;
  created_at: string;
}

export interface FeePlayerInsert {
  team_id: string;
  player_name: string;
  apa_member_number?: string;
  skill_level?: number;
}

export interface FeePlayerUpdate {
  player_name?: string;
  apa_member_number?: string;
  skill_level?: number;
  is_active?: boolean;
}

/* ================================ Aggregated / Computed ================================ */

/** Per-player balance and stats, computed client-side. */
export interface PlayerSummary {
  player_name: string;
  skill_level: number | null;
  total_fees: number;
  total_paid: number;
  total_voided: number;
  balance: number; // total_fees - total_paid - total_voided
  matches_played: number;
  wins: number;
  losses: number;
  win_rate: number; // 0–1
  historical_wins?: number;
  historical_losses?: number;
  historical_win_rate?: number;
  /** Per-week breakdown. */
  entries: FeeEntry[];
}

/** Team-level aggregation across all players in the current session. */
export interface TeamSummary {
  total_fees: number;
  total_collected: number;
  total_outstanding: number;
  total_voided: number;
  match_nights_count: number;
  players: PlayerSummary[];
}

/* ================================ API Payloads ================================ */

/** POST /api/fees/verify-pin */
export interface VerifyPinRequest {
  team_code: string;
  pin: string;
}

export interface VerifyPinResponse {
  valid: boolean;
  team_id?: string;
}

/** Captain-mode state (client-side only, never persisted). */
export interface CaptainSession {
  team_id: string;
  team_code: string;
  pin: string; // raw PIN kept in React state for the session
  authenticated: boolean;
}

/** Roll call: who's present tonight. Client-side state. */
export interface RollCall {
  match_night_id: string;
  present: Record<string, boolean>; // player_name → present
}
