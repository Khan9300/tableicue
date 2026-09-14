import { Player, Outlook, Mode, Option } from './types';
import { binom, rackProb, rating, winProb, counterOptions, putUpOptions } from './core';

export const RACE: Record<number, Record<number, [number, number]>> = {
  2: { 2: [2, 2], 3: [2, 3], 4: [2, 4], 5: [2, 5], 6: [2, 6], 7: [2, 7] },
  3: { 2: [3, 2], 3: [2, 2], 4: [2, 3], 5: [2, 4], 6: [2, 5], 7: [2, 6] },
  4: { 2: [4, 2], 3: [3, 2], 4: [3, 3], 5: [3, 4], 6: [3, 5], 7: [2, 5] },
  5: { 2: [5, 2], 3: [4, 2], 4: [4, 3], 5: [4, 4], 6: [4, 5], 7: [3, 5] },
  6: { 2: [6, 2], 3: [5, 2], 4: [5, 3], 5: [5, 4], 6: [5, 5], 7: [4, 5] },
  7: { 2: [7, 2], 3: [6, 2], 4: [5, 2], 5: [5, 3], 6: [5, 4], 7: [5, 5] },
};

export function race(ours: number, theirs: number): [number, number] {
  const clamp = (n: number) => Math.min(7, Math.max(2, n || 2));
  return RACE[clamp(ours)][clamp(theirs)];
}

const outlookCache = new Map<string, Outlook>();
export function outlook8(ours: Player, theirs: Player): Outlook {
  const key = `${ours.id}:${ours.sl}:${ours.form ?? ''}|${theirs.id}:${theirs.sl}:${theirs.form ?? ''}|${rating(ours).toFixed(4)}|${rating(theirs).toFixed(4)}`;
  const hit = outlookCache.get(key);
  if (hit) return hit;
  const [a, b] = race(ours.sl, theirs.sl);
  const pWin = winProb(ours, theirs);
  const q = rackProb(pWin, a, b);
  const winAt = (k: number) => binom(a - 1 + k, k) * q ** a * (1 - q) ** k; // they have k racks
  const loseAt = (j: number) => binom(b - 1 + j, j) * (1 - q) ** b * q ** j; // we have j racks
  let w = 0;
  for (let k = 0; k < b; k++) w += winAt(k);
  let l = 0;
  for (let j = 0; j < a; j++) l += loseAt(j);
  const win30 = winAt(0);
  const win21 = winAt(b - 1);
  const win20 = Math.max(0, w - win30 - win21);
  const lose03 = loseAt(0);
  const lose12 = loseAt(a - 1);
  const lose02 = Math.max(0, l - lose03 - lose12);
  const ePts = 3 * win30 + 2 * (win21 + win20) + lose12;
  const eOpp = 3 * lose03 + 2 * (lose12 + lose02) + win21;
  const o: Outlook = { race: [a, b], pWin, win30, win21, win20, lose03, lose12, lose02, ePts, eOpp, swing: ePts - eOpp };
  outlookCache.set(key, o);
  return o;
}

export function matchPoints8(winner: 'us' | 'them', racks: [number, number], raceTo: [number, number]): [number, number] {
  if (winner === 'us') {
    const theirs = racks[1];
    if (theirs === 0) return [3, 0];
    if (theirs >= raceTo[1] - 1) return [2, 1];
    return [2, 0];
  }
  const ours = racks[0];
  if (ours === 0) return [0, 3];
  if (ours >= raceTo[0] - 1) return [1, 2];
  return [0, 2];
}

export function strategy8(usPts: number, themPts: number, roundsLeft: number): { mode: Mode; weight: number; headline: string; detail: string } {
  const maxLeft = 3 * roundsLeft;
  const d = themPts - usPts;
  if (roundsLeft === 0) {
    const text = usPts > themPts ? 'We won on points.' : usPts < themPts ? 'They won on points.' : 'Tied on points. Tiebreak: more individual match wins.';
    return { mode: 'Final', weight: 0, headline: text, detail: '' };
  }
  if (usPts > themPts + maxLeft) return { mode: 'Clinched', weight: 0.5, headline: 'Clinched. They can no longer catch us.', detail: 'Remaining matches usually are not played.' };
  if (themPts > usPts + maxLeft) return { mode: 'Eliminated', weight: 0.5, headline: 'They have clinched. We can no longer catch them.', detail: '' };
  const swingNote = 'A 3-0 win is +3, 2-0 is +2, 2-1 is +1.';
  if (d > 0 && d + 2 >= 3 * (roundsLeft - 1)) {
    return {
      mode: 'Chase',
      weight: 0.15,
      headline: `Down ${d} with ${roundsLeft} to play. Losing this one nearly ends it.`,
      detail: `Send the best chance right now; don't save anyone. We need to outscore them by ${d + 1} from here. ${swingNote}`,
    };
  }
  if (d <= -3) {
    return {
      mode: 'Protect',
      weight: 0.75,
      headline: `Up ${-d} with ${roundsLeft} to play.`,
      detail: `Keep our strongest players for their biggest remaining threats. They need to outscore us by ${-d + 1}. ${swingNote}`,
    };
  }
  const where = d > 0 ? `Down ${d}` : d < 0 ? `Up ${-d}` : 'Even';
  return {
    mode: 'Balanced',
    weight: 0.5,
    headline: `${where} with ${roundsLeft} to play.`,
    detail:
      d > 0
        ? `We need to outscore them by ${d + 1} from here. Holding a loss to 2-1 still earns a point. ${swingNote}`
        : d < 0
          ? `They need to outscore us by ${-d + 1}. Every point from a 2-1 loss matters. ${swingNote}`
          : `Next result sets the tone. Balance this match against saving players for later. ${swingNote}`,
  };
}

export function getCounterOptions8(ours: Player[], theirsAfter: Player[], opp: Player, roundsAfter: number, ourBudget: number, theirBudgetAfter: number, weight: number, ourSeniorsUsed: number = 0, theirSeniorsUsed: number = 0): Option[] {
  return counterOptions(ours, theirsAfter, opp, roundsAfter, ourBudget, theirBudgetAfter, weight, outlook8, '8ball', ourSeniorsUsed, theirSeniorsUsed);
}

export function getPutUpOptions8(ours: Player[], theirs: Player[], roundsAfter: number, ourBudget: number, theirBudget: number, weight: number, ourSeniorsUsed: number = 0, theirSeniorsUsed: number = 0): Option[] {
  return putUpOptions(ours, theirs, roundsAfter, ourBudget, theirBudget, weight, outlook8, '8ball', ourSeniorsUsed, theirSeniorsUsed);
}
