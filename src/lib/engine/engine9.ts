import { Player, Outlook, Mode, Option } from './types';
import { binom, rackProb, rating, winProb, counterOptions, putUpOptions } from './core';

export const POINT_TARGETS: Record<number, number> = {
  1: 14, 2: 19, 3: 25, 4: 31, 5: 38, 6: 46, 7: 55, 8: 65, 9: 75
};

export function matchPoints9(winner: 'us' | 'them', loserPoints: number, loserSL: number): [number, number] {
  // Rough APA 9-ball points mapping for score of match
  // 0-8 pts for loser, 12-20 pts for winner.
  const target = POINT_TARGETS[Math.max(1, Math.min(9, loserSL))];
  const fraction = Math.max(0, Math.min(1, loserPoints / (target - 1)));
  const lPts = Math.round(fraction * 8);
  const wPts = 20 - lPts;
  return winner === 'us' ? [wPts, lPts] : [lPts, wPts];
}

const outlookCache = new Map<string, Outlook>();
export function outlook9(ours: Player, theirs: Player): Outlook {
  const key = `${ours.id}:${ours.sl}:${ours.form ?? ''}|${theirs.id}:${theirs.sl}:${theirs.form ?? ''}|${rating(ours).toFixed(4)}|${rating(theirs).toFixed(4)}`;
  const hit = outlookCache.get(key);
  if (hit) return hit;
  const a = POINT_TARGETS[Math.max(1, Math.min(9, ours.sl))];
  const b = POINT_TARGETS[Math.max(1, Math.min(9, theirs.sl))];
  const pWin = winProb(ours, theirs);
  const q = rackProb(pWin, a, b);
  
  let ePts = 0;
  let eOpp = 0;
  const winAt = (k: number) => binom(a - 1 + k, k) * q ** a * (1 - q) ** k; // they have k pts
  const loseAt = (j: number) => binom(b - 1 + j, j) * (1 - q) ** b * q ** j; // we have j pts
  
  for (let k = 0; k < b; k++) {
    const prob = winAt(k);
    const [w, l] = matchPoints9('us', k, theirs.sl);
    ePts += prob * w;
    eOpp += prob * l;
  }
  for (let j = 0; j < a; j++) {
    const prob = loseAt(j);
    const [w, l] = matchPoints9('them', j, ours.sl);
    ePts += prob * w;
    eOpp += prob * l;
  }
  
  const o: Outlook = { race: [a, b], pWin, ePts, eOpp, swing: ePts - eOpp };
  outlookCache.set(key, o);
  return o;
}

export function strategy9(usPts: number, themPts: number, roundsLeft: number): { mode: Mode; weight: number; headline: string; detail: string } {
  const maxLeft = 20 * roundsLeft;
  const d = themPts - usPts;
  if (roundsLeft === 0) {
    const text = usPts > themPts ? 'We won on points.' : usPts < themPts ? 'They won on points.' : 'Tied on points.';
    return { mode: 'Final', weight: 0, headline: text, detail: '' };
  }
  if (usPts > themPts + maxLeft) return { mode: 'Clinched', weight: 0.5, headline: 'Clinched. They can no longer catch us.', detail: 'Remaining matches usually are not played.' };
  if (themPts > usPts + maxLeft) return { mode: 'Eliminated', weight: 0.5, headline: 'They have clinched. We can no longer catch them.', detail: '' };
  
  const pointsPerRound = d / roundsLeft;
  if (pointsPerRound > 5) {
    return { mode: 'Chase', weight: 0.15, headline: `Down ${d} with ${roundsLeft} to play.`, detail: `Need to average +${Math.ceil(pointsPerRound)} per match.` };
  }
  if (pointsPerRound < -5) {
    return { mode: 'Protect', weight: 0.75, headline: `Up ${-d} with ${roundsLeft} to play.`, detail: `Protect the lead.` };
  }
  
  return { mode: 'Balanced', weight: 0.5, headline: `${d > 0 ? 'Down ' + d : d < 0 ? 'Up ' + -d : 'Even'} with ${roundsLeft} to play.`, detail: 'Play balanced strategy.' };
}

export function getCounterOptions9(ours: Player[], theirsAfter: Player[], opp: Player, roundsAfter: number, ourBudget: number, theirBudgetAfter: number, weight: number, ourSeniorsUsed: number = 0, theirSeniorsUsed: number = 0): Option[] {
  return counterOptions(ours, theirsAfter, opp, roundsAfter, ourBudget, theirBudgetAfter, weight, outlook9, '9ball', ourSeniorsUsed, theirSeniorsUsed);
}

export function getPutUpOptions9(ours: Player[], theirs: Player[], roundsAfter: number, ourBudget: number, theirBudget: number, weight: number, ourSeniorsUsed: number = 0, theirSeniorsUsed: number = 0): Option[] {
  return putUpOptions(ours, theirs, roundsAfter, ourBudget, theirBudget, weight, outlook9, '9ball', ourSeniorsUsed, theirSeniorsUsed);
}
