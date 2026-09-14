-- =====================================================================================
-- APA Fee Tracker: Supabase Migration
-- Project: qpjannbvxpqqbvpclllq
--
-- Creates 5 tables with RLS enabled:
--   fee_teams, fee_sessions, fee_match_nights, fee_entries, fee_players
--
-- RLS policy: anon can SELECT (read-only links), writes go through
-- service-role via Next.js API routes that verify the captain PIN.
--
-- Run this once via Supabase SQL Editor or MCP execute_sql.
-- =====================================================================================

-- 1) fee_teams — one row per team in the fee system
create table if not exists fee_teams (
  id uuid primary key default gen_random_uuid(),
  team_code text unique not null,
  team_name text not null,
  team_number text,
  format text not null check (format in ('8ball','9ball')),
  night text check (night in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  captain_name text,
  pin_hash text not null,
  current_session text not null,
  created_at timestamptz default now()
);

alter table fee_teams enable row level security;
drop policy if exists "anon_read_fee_teams" on fee_teams;
create policy "anon_read_fee_teams" on fee_teams for select using (true);

-- 2) fee_sessions — APA sessions per team (e.g. "Fall 2026")
create table if not exists fee_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references fee_teams(id) on delete cascade not null,
  session_name text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (team_id, session_name)
);

alter table fee_sessions enable row level security;
drop policy if exists "anon_read_fee_sessions" on fee_sessions;
create policy "anon_read_fee_sessions" on fee_sessions for select using (true);

-- 3) fee_match_nights — one row per team match night
create table if not exists fee_match_nights (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references fee_sessions(id) on delete cascade not null,
  team_id uuid references fee_teams(id) on delete cascade not null,
  match_date date not null,
  week_number int,
  opponent_name text,
  opponent_number text,
  notes text,
  created_at timestamptz default now()
);

alter table fee_match_nights enable row level security;
drop policy if exists "anon_read_fee_match_nights" on fee_match_nights;
create policy "anon_read_fee_match_nights" on fee_match_nights for select using (true);

-- 4) fee_entries — one fee per player per match night
create table if not exists fee_entries (
  id uuid primary key default gen_random_uuid(),
  match_night_id uuid references fee_match_nights(id) on delete cascade not null,
  team_id uuid references fee_teams(id) on delete cascade not null,
  player_name text not null,
  round_number int check (round_number between 1 and 5),
  amount numeric(5,2) default 10.00,
  is_paid boolean default false,
  is_voided boolean default false,
  void_reason text,
  result text check (result in ('W','L')),
  opponent_name text,
  opponent_sl int,
  player_sl int,
  created_at timestamptz default now(),
  paid_at timestamptz
);

alter table fee_entries enable row level security;
drop policy if exists "anon_read_fee_entries" on fee_entries;
create policy "anon_read_fee_entries" on fee_entries for select using (true);

-- Index for fast per-player lookups
create index if not exists idx_fee_entries_team_player
  on fee_entries (team_id, player_name);

-- Index for per-match-night lookups
create index if not exists idx_fee_entries_match_night
  on fee_entries (match_night_id);

-- 5) fee_players — roster for fee tracking
create table if not exists fee_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references fee_teams(id) on delete cascade not null,
  player_name text not null,
  apa_member_number text,
  skill_level int,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (team_id, player_name)
);

alter table fee_players enable row level security;
drop policy if exists "anon_read_fee_players" on fee_players;
create policy "anon_read_fee_players" on fee_players for select using (true);

-- =====================================================================================
-- Done. All 5 tables created with RLS enabled (read-only for anon).
-- Writes use the service-role key from Next.js API routes.
-- =====================================================================================
