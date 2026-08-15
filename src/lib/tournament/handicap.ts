import { GameType } from '../types/tournament';

/**
 * Validates whether a Scotch Doubles team complies with the tournament's maximum combined Skill Level (SL).
 */
export function validateSkillCap(
  player1SL: number,
  player2SL: number,
  maxCap: number = 10
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
 * Max starting chips for any team is capped at 5 chips.
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

  // Official Table i-Cue Starting Chips Matrix for Scotch Doubles (Max 5 Chips Cap)
  let chips = 3;
  if (combinedSL <= 6) {
    chips = 5; // Combined SL <= 6 (e.g. 3+3, 2+4, 2+3) -> 5 Chips (Max)
  } else if (combinedSL <= 8) {
    chips = 4; // Combined SL 7-8 (e.g. 4+4, 3+5) -> 4 Chips
  } else if (combinedSL <= 10) {
    chips = 3; // Combined SL 9-10 (e.g. 4+5, 5+5, 4+6) -> 3 Chips
  } else {
    chips = 2; // Combined SL 11+ (Masters / Open) -> 2 Chips
  }

  return Math.min(MAX_CHIPS, chips);
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
