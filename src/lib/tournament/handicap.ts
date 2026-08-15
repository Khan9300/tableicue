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
 * based on the combined team handicap (Equalizer / FargoRate approximations).
 */
export function calculateStartingChips(
  combinedSL: number,
  policy: 'handicap_matrix' | 'equal' = 'handicap_matrix',
  defaultChips: number = 6
): number {
  if (policy === 'equal') {
    return defaultChips;
  }

  // Official Table i-Cue Starting Chips Matrix for Scotch Doubles
  if (combinedSL <= 5) {
    return 8; // Combined SL 4 - 5
  } else if (combinedSL <= 7) {
    return 7; // Combined SL 6 - 7
  } else if (combinedSL <= 9) {
    return 6; // Combined SL 8 - 9
  } else if (combinedSL === 10) {
    return 5; // Combined SL 10
  } else {
    return 4; // Combined SL 11 - 12 (if high-cap format allowed)
  }
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
