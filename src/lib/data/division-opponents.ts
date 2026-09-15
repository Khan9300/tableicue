import type { Player } from '../engine/types';
import rawData from './division-opponents.json';

export interface OpponentTeam {
  name: string;
  isThisWeek: boolean;
  players: Player[];
}

const opponentsMap = rawData as Record<string, OpponentTeam[]>;

/**
 * Returns all division opponent teams for a given team key.
 * Sorted so that this week's scheduled opponent is first, followed by alphabetical order.
 */
export function getDivisionOpponents(teamKey: string): OpponentTeam[] {
  const teams = opponentsMap[teamKey] || [];
  return [...teams].sort((a, b) => {
    if (a.isThisWeek && !b.isThisWeek) return -1;
    if (!a.isThisWeek && b.isThisWeek) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Finds an opponent team by name for a given team key.
 */
export function findOpponentTeam(teamKey: string, opponentName: string): OpponentTeam | undefined {
  const teams = opponentsMap[teamKey] || [];
  return teams.find(t => t.name.toLowerCase() === opponentName.toLowerCase());
}
