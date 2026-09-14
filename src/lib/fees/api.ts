import {
  FeeTeam,
  FeeTeamInsert,
  FeeSession,
  FeeMatchNight,
  FeeMatchNightInsert,
  FeeEntry,
  FeeEntryInsert,
  FeePlayer,
  FeePlayerInsert,
  FeePlayerUpdate
} from '@/lib/fees/types';

const API_BASE = '/api/fees';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Verify team PIN.
 */
export async function verifyPin(teamCode: string, pin: string): Promise<{ valid: boolean; team_id?: string }> {
  return fetchApi<{ valid: boolean; team_id?: string }>(`${API_BASE}/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_code: teamCode, pin })
  });
}

/**
 * Create a new team.
 */
export async function createTeam(data: FeeTeamInsert): Promise<{ team_code: string; team_id: string }> {
  return fetchApi<{ team_code: string; team_id: string }>(`${API_BASE}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/**
 * Get team by code.
 */
export async function getTeamByCode(teamCode: string): Promise<FeeTeam | null> {
  return fetchApi<FeeTeam | null>(`${API_BASE}/teams?code=${encodeURIComponent(teamCode)}`);
}

/**
 * Get active sessions.
 */
export async function getActiveSessions(teamId: string): Promise<FeeSession[]> {
  return fetchApi<FeeSession[]>(`${API_BASE}/sessions?team_id=${encodeURIComponent(teamId)}&active_only=true`);
}

/**
 * Get all sessions.
 */
export async function getAllSessions(teamId: string): Promise<FeeSession[]> {
  return fetchApi<FeeSession[]>(`${API_BASE}/sessions?team_id=${encodeURIComponent(teamId)}`);
}

/**
 * Create session.
 */
export async function createSession(teamId: string, sessionName: string, pin: string): Promise<FeeSession> {
  return fetchApi<FeeSession>(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_id: teamId, session_name: sessionName, pin })
  });
}

/**
 * Get match nights.
 */
export async function getMatchNights(sessionId: string): Promise<FeeMatchNight[]> {
  return fetchApi<FeeMatchNight[]>(`${API_BASE}/match-nights?session_id=${encodeURIComponent(sessionId)}`);
}

/**
 * Create match night.
 */
export async function createMatchNight(data: FeeMatchNightInsert, pin: string): Promise<FeeMatchNight> {
  return fetchApi<FeeMatchNight>(`${API_BASE}/match-nights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, pin })
  });
}

/**
 * Get entries.
 */
export async function getEntries(teamId: string, sessionId?: string): Promise<FeeEntry[]> {
  const url = sessionId 
    ? `${API_BASE}/entries?team_id=${encodeURIComponent(teamId)}&session_id=${encodeURIComponent(sessionId)}`
    : `${API_BASE}/entries?team_id=${encodeURIComponent(teamId)}`;
  return fetchApi<FeeEntry[]>(url);
}

/**
 * Lock in player.
 */
export async function lockInPlayer(data: FeeEntryInsert, pin: string): Promise<FeeEntry> {
  return fetchApi<FeeEntry>(`${API_BASE}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, pin })
  });
}

/**
 * Toggle paid.
 */
export async function togglePaid(entryId: string, isPaid: boolean, teamId: string, pin: string): Promise<FeeEntry> {
  return fetchApi<FeeEntry>(`${API_BASE}/entries`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entryId, is_paid: isPaid, team_id: teamId, pin })
  });
}

/**
 * Void entry.
 */
export async function voidEntry(entryId: string, reason: string, teamId: string, pin: string): Promise<FeeEntry> {
  return fetchApi<FeeEntry>(`${API_BASE}/entries`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entryId, is_voided: true, void_reason: reason, team_id: teamId, pin })
  });
}

/**
 * Log result.
 */
export async function logResult(entryId: string, result: 'W' | 'L', teamId: string, pin: string, opponentName?: string, opponentSl?: number): Promise<FeeEntry> {
  return fetchApi<FeeEntry>(`${API_BASE}/entries`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entryId, result, opponent_name: opponentName, opponent_sl: opponentSl, team_id: teamId, pin })
  });
}

/**
 * Get players.
 */
export async function getPlayers(teamId: string): Promise<FeePlayer[]> {
  return fetchApi<FeePlayer[]>(`${API_BASE}/players?team_id=${encodeURIComponent(teamId)}`);
}

/**
 * Add player.
 */
export async function addPlayer(data: FeePlayerInsert, pin: string): Promise<FeePlayer> {
  return fetchApi<FeePlayer>(`${API_BASE}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, pin })
  });
}

/**
 * Update player.
 */
export async function updatePlayer(playerId: string, data: FeePlayerUpdate, teamId: string, pin: string): Promise<FeePlayer> {
  return fetchApi<FeePlayer>(`${API_BASE}/players`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: playerId, ...data, team_id: teamId, pin })
  });
}

/**
 * Deactivate player.
 */
export async function deactivatePlayer(playerId: string, teamId: string, pin: string): Promise<void> {
  await fetchApi<void>(`${API_BASE}/players`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: playerId, is_active: false, team_id: teamId, pin })
  });
}
