import { GameType } from '../types/tournament';

/**
 * Validates whether a Scotch Doubles team complies with the tournament's maximum combined Skill Level (SL).
 * Supports up to Max 12 (e.g. two SL 6s running together for 1 chip).
 */
export function validateSkillCap(
  player1SL: number,
  player2SL: number,
  maxCap: number = 12
): { valid: boolean; combinedSL: number; error?: string } {
  const combinedSL = player1SL + player2SL;
  if (combinedSL > maxCap) {
    return {
      valid: false,
      combinedSL,
      error: `Combined Skill Level of ${combinedSL} exceeds the tournament cap of Max ${maxCap}.`,
    };
  }
  return { valid: true, combinedSL };
}

/**
 * Calculates starting virtual chips for Scotch Doubles chip tournaments
 * Real-world pool hall matrix:
 * - Combined SL <= 6 (e.g. 3+3, 2+4) -> 5 Chips (Max)
 * - Combined SL 7-8 (e.g. 4+3, 4+4, 5+3) -> 4 Chips
 * - Combined SL 9-10 (e.g. 5+5, 6+4, 7+3) -> 3 Chips (e.g. Fahad 5 + Partner 5 = 3 Chips)
 * - Combined SL 11 (e.g. 6+5, 7+4) -> 2 Chips
 * - Combined SL >= 12 (e.g. two SL 6s = 12) -> 1 Chip (High firepower run potential, 1 life!)
 */
export function calculateStartingChips(
  combinedSL: number,
  policy: 'handicap_matrix' | 'equal' = 'handicap_matrix',
  defaultChips: number = 5
): number {
  const MAX_CHIPS = 5;

  if (policy === 'equal') {
    return Math.min(MAX_CHIPS, defaultChips);
  }

  // Official Table i-Cue Starting Chips Matrix for Scotch Doubles
  let chips = 3;
  if (combinedSL <= 6) {
    chips = 5; // Combined SL <= 6 -> 5 Chips (Max)
  } else if (combinedSL <= 8) {
    chips = 4; // Combined SL 7-8 -> 4 Chips
  } else if (combinedSL <= 10) {
    chips = 3; // Combined SL 9-10 (Two SL 5s) -> 3 Chips
  } else if (combinedSL === 11) {
    chips = 2; // Combined SL 11 (e.g. SL 6 + SL 5) -> 2 Chips
  } else {
    chips = 1; // Combined SL >= 12 (Two SL 6s) -> 1 Chip
  }

  return Math.min(MAX_CHIPS, Math.max(1, chips));
}

/**
 * Calculates Scotch Doubles race goals for mixed APA handicaps in standard match formats.
 */
export function getRaceToPoints(
  teamASkill: number,
  teamBSkill: number,
  gameType: GameType = '8_ball'
): { raceTeamA: number; raceTeamB: number } {
  if (gameType === '8_ball') {
    // Standard chip tournaments are single rack per match; in race formats:
    const diff = Math.abs(teamASkill - teamBSkill);
    if (diff <= 1) return { raceTeamA: 2, raceTeamB: 2 };
    if (teamASkill > teamBSkill) return { raceTeamA: 3, raceTeamB: 2 };
    return { raceTeamA: 2, raceTeamB: 3 };
  } else {
    // 9-ball points race
    return {
      raceTeamA: Math.max(15, teamASkill * 5),
      raceTeamB: Math.max(15, teamBSkill * 5),
    };
  }
}
