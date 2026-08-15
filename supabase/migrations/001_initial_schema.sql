-- ==============================================================================
-- Table i-Cue (tableicue) Supabase PostgreSQL Database Schema
-- Multi-tenant Billiards Tournament & APA Scraper Data Layer
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. APA Players & Simi Valley League Directory
CREATE TABLE IF NOT EXISTS public.apa_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    skill_level_8ball INT CHECK (skill_level_8ball BETWEEN 1 AND 7),
    skill_level_9ball INT CHECK (skill_level_9ball BETWEEN 1 AND 9),
    fargo_rating INT,
    home_venue VARCHAR(200),
    division_name VARCHAR(100),
    region VARCHAR(100) DEFAULT 'South Coast APA',
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast Index for Tournament Director Typeahead Autocomplete
CREATE INDEX IF NOT EXISTS idx_apa_players_name ON public.apa_players (full_name);
CREATE INDEX IF NOT EXISTS idx_apa_players_member_id ON public.apa_players (member_id);
CREATE INDEX IF NOT EXISTS idx_apa_players_region ON public.apa_players (region);

-- Simi Valley Local Player View / Table
CREATE TABLE IF NOT EXISTS public.simi_valley_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    skill_level_8ball INT,
    skill_level_9ball INT,
    home_venue VARCHAR(200),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simi_players_search ON public.simi_valley_players USING gin (to_tsvector('english', full_name));

-- 2. APA Teams & Standings
CREATE TABLE IF NOT EXISTS public.apa_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id VARCHAR(50) NOT NULL,
    division_name VARCHAR(100) NOT NULL,
    team_number VARCHAR(50) NOT NULL,
    team_name VARCHAR(200) NOT NULL,
    captain_name VARCHAR(200),
    session_name VARCHAR(50),
    roster JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(division_id, team_number)
);

CREATE TABLE IF NOT EXISTS public.apa_standings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id VARCHAR(50) NOT NULL,
    team_id UUID REFERENCES public.apa_teams(id) ON DELETE CASCADE,
    rank INT,
    points INT DEFAULT 0,
    matches_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Scrape Execution Logs
CREATE TABLE IF NOT EXISTS public.scrape_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) DEFAULT 'rackiq-scraper',
    source_url VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- 'success', 'error', 'partial'
    records_upserted INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. Table i-Cue Live Tournaments
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    format VARCHAR(50) DEFAULT 'scotch_doubles_chip', -- 'scotch_doubles_chip', 'singles_chip', 'double_elim'
    game_type VARCHAR(20) DEFAULT '8_ball', -- '8_ball', '9_ball'
    max_skill_cap INT DEFAULT 10,
    starting_chips_policy VARCHAR(50) DEFAULT 'handicap_matrix', -- 'equal', 'handicap_matrix'
    venue_name VARCHAR(200) DEFAULT 'Lucky Cue Moorpark / Plush Pocket',
    status VARCHAR(50) DEFAULT 'registering', -- 'registering', 'in_progress', 'completed', 'paused'
    auto_pilot BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

-- 5. Physical Tables in Venue
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    table_number INT NOT NULL,
    label VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_use', 'maintenance'
    active_match_id UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, table_number)
);

-- 6. Tournament Teams & Chip Balances
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_name VARCHAR(200) NOT NULL,
    player_1_id UUID REFERENCES public.apa_players(id),
    player_2_id UUID REFERENCES public.apa_players(id),
    player_1_name VARCHAR(200) NOT NULL,
    player_2_name VARCHAR(200) NOT NULL,
    player_1_sl INT NOT NULL,
    player_2_sl INT NOT NULL,
    combined_sl INT GENERATED ALWAYS AS (player_1_sl + player_2_sl) STORED,
    starting_chips INT NOT NULL DEFAULT 6,
    chips_remaining INT NOT NULL DEFAULT 6,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'eliminated'
    elimination_rank INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_tournament ON public.teams (tournament_id, status);

-- 7. Live Matches
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    team_a_id UUID REFERENCES public.teams(id),
    team_b_id UUID REFERENCES public.teams(id),
    team_a_score INT DEFAULT 0,
    team_b_score INT DEFAULT 0,
    race_to INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'disputed'
    winner_team_id UUID REFERENCES public.teams(id),
    loser_team_id UUID REFERENCES public.teams(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 8. High-Velocity Matchmaking Queue
CREATE TABLE IF NOT EXISTS public.queue_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'waiting', -- 'waiting', 'assigned', 'on_deck'
    entered_queue_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    UNIQUE(tournament_id, team_id, status)
);

CREATE INDEX IF NOT EXISTS idx_queue_waiting ON public.queue_state (tournament_id, status, entered_queue_at ASC);

-- ==============================================================================
-- Atomic Auto-Pilot Matchmaking Stored Procedure (FOR UPDATE SKIP LOCKED)
-- ==============================================================================

CREATE OR REPLACE FUNCTION dequeue_next_team_for_table(
    p_tournament_id UUID,
    p_table_id UUID,
    p_winner_team_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_next_team_id UUID;
    v_new_match_id UUID;
    v_team_a_id UUID;
    v_team_b_id UUID;
BEGIN
    -- 1. Concurrently lock and fetch the next waiting team in line
    SELECT team_id INTO v_next_team_id
    FROM public.queue_state
    WHERE tournament_id = p_tournament_id AND status = 'waiting'
    ORDER BY entered_queue_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_next_team_id IS NULL THEN
        -- No team currently waiting; set table status to open
        UPDATE public.tables
        SET status = 'open', active_match_id = NULL, updated_at = NOW()
        WHERE id = p_table_id;
        RETURN NULL;
    END IF;

    -- 2. Mark queue row as assigned
    UPDATE public.queue_state
    SET status = 'assigned'
    WHERE tournament_id = p_tournament_id AND team_id = v_next_team_id AND status = 'waiting';

    -- 3. Determine pairing
    IF p_winner_team_id IS NOT NULL THEN
        v_team_a_id := p_winner_team_id;
        v_team_b_id := v_next_team_id;
    ELSE
        -- Fresh table without existing champion: dequeue a second team
        v_team_a_id := v_next_team_id;
        
        SELECT team_id INTO v_team_b_id
        FROM public.queue_state
        WHERE tournament_id = p_tournament_id AND status = 'waiting'
        ORDER BY entered_queue_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
        
        IF v_team_b_id IS NOT NULL THEN
            UPDATE public.queue_state
            SET status = 'assigned'
            WHERE tournament_id = p_tournament_id AND team_id = v_team_b_id AND status = 'waiting';
        END IF;
    END IF;

    -- 4. Create new Match
    INSERT INTO public.matches (tournament_id, table_id, team_a_id, team_b_id, status)
    VALUES (p_tournament_id, p_table_id, v_team_a_id, v_team_b_id, 'in_progress')
    RETURNING id INTO v_new_match_id;

    -- 5. Update Table Status
    UPDATE public.tables
    SET status = 'in_use', active_match_id = v_new_match_id, updated_at = NOW()
    WHERE id = p_table_id;

    RETURN v_new_match_id;
END;
$$ LANGUAGE plpgsql;
