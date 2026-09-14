import { FeeEntry, FeePlayer, PlayerSummary, TeamSummary } from '@/lib/fees/types';
import { ALL_TEAMS } from '@/lib/data/teams';

/**
 * Generate a unique 8-char team code, e.g. 'TIC2026F'. Takes team short name and session.
 * @param teamName The team name.
 * @param session The session name.
 * @returns An 8-character team code.
 */
export function generateTeamCode(teamName: string, session: string): string {
  const sanitize = (str: string) => str.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const namePart = sanitize(teamName).substring(0, 3).padEnd(3, 'X');
  const sessionPart = sanitize(session).substring(0, 5).padEnd(5, '0');
  return `${namePart}${sessionPart}`.substring(0, 8);
}

/**
 * Calculate a PlayerSummary from an array of FeeEntry[].
 * @param playerName The name of the player.
 * @param skillLevel The skill level of the player.
 * @param entries The fee entries for the player.
 * @returns A PlayerSummary object.
 */
export function computePlayerSummary(playerName: string, skillLevel: number | null, entries: FeeEntry[]): PlayerSummary {
  let totalFees = 0;
  let totalPaid = 0;
  let totalVoided = 0;
  let wins = 0;
  let losses = 0;
  
  for (const entry of entries) {
    totalFees += entry.amount;
    if (entry.is_voided) {
      totalVoided += entry.amount;
    } else if (entry.is_paid) {
      totalPaid += entry.amount;
    }

    if (entry.result === 'W') wins++;
    if (entry.result === 'L') losses++;
  }

  const balance = totalFees - totalPaid - totalVoided;
  const matchesPlayed = wins + losses;
  const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;

  // Look up baseline / historical stats from team data
  let historicalWins: number | undefined;
  let historicalLosses: number | undefined;
  let historicalWinRate: number | undefined;

  for (const t of ALL_TEAMS) {
    const found = t.players.find(p => 
      p.name.toLowerCase() === playerName.toLowerCase() || 
      (p.alias && p.alias.toLowerCase() === playerName.toLowerCase())
    );
    if (found && found.wins != null && found.losses != null) {
      historicalWins = found.wins;
      historicalLosses = found.losses;
      const total = found.wins + found.losses;
      historicalWinRate = total > 0 ? found.wins / total : 0;
      break;
    }
  }

  return {
    player_name: playerName,
    skill_level: skillLevel,
    total_fees: totalFees,
    total_paid: totalPaid,
    total_voided: totalVoided,
    balance,
    matches_played: matchesPlayed,
    wins,
    losses,
    win_rate: winRate,
    historical_wins: historicalWins,
    historical_losses: historicalLosses,
    historical_win_rate: historicalWinRate,
    entries
  };
}

/**
 * Calculate a TeamSummary from all entries and players in a session.
 * @param entries All fee entries for the team/session.
 * @param players All players on the team.
 * @returns A TeamSummary object.
 */
export function computeTeamSummary(entries: FeeEntry[], players: FeePlayer[]): TeamSummary {
  const entriesByPlayer: Record<string, FeeEntry[]> = {};
  for (const entry of entries) {
    if (!entriesByPlayer[entry.player_name]) {
      entriesByPlayer[entry.player_name] = [];
    }
    entriesByPlayer[entry.player_name].push(entry);
  }

  let totalFees = 0;
  let totalCollected = 0;
  let totalVoided = 0;
  
  for (const entry of entries) {
    totalFees += entry.amount;
    if (entry.is_voided) totalVoided += entry.amount;
    else if (entry.is_paid) totalCollected += entry.amount;
  }
  
  const matchNightsCount = new Set(entries.map(e => e.match_night_id)).size;

  const playerSummaries: PlayerSummary[] = players.map(player => {
    const playerEntries = entriesByPlayer[player.player_name] || [];
    return computePlayerSummary(player.player_name, player.skill_level, playerEntries);
  });

  return {
    total_fees: totalFees,
    total_collected: totalCollected,
    total_outstanding: totalFees - totalCollected - totalVoided,
    total_voided: totalVoided,
    match_nights_count: matchNightsCount,
    players: playerSummaries
  };
}

/**
 * Format currency as $10.00
 * @param amount The amount to format.
 * @returns Formatted currency string.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format date as 'Sep 15, 2026'
 * @param isoDate The ISO date string.
 * @returns Formatted date string.
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Leaderboard: sort players by win rate (desc), then wins (desc), then name (asc). Min 1 match to rank.
 * @param summaries The player summaries.
 * @returns Sorted array of player summaries.
 */
export function leaderboard(summaries: PlayerSummary[]): PlayerSummary[] {
  return [...summaries]
    .filter(s => s.matches_played > 0)
    .sort((a, b) => {
      if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.player_name.localeCompare(b.player_name);
    });
}
