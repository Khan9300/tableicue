import { race, type Player } from './data';

export const CAP = 23;
export const ROUNDS = 5;

/* ---------------- player strength ---------------- */

/** Summer record plus the player's other 8-ball teams. */
export function combined(p: Player): { w: number; l: number } | null {
  if (p.wins == null || p.losses == null) return null;
  const extra = (p.otherTeams ?? []).reduce((a, t) => ({ w: a.w + t.w, l: a.l + t.l }), { w: 0, l: 0 });
  return { w: p.wins + extra.w, l: p.losses + extra.l };
}

/** Win rate shrunk toward 50% (small samples), nudged by the captain's hot/cold tap. */
export function rating(p: Player): number {
  const c = combined(p);
  let r = c && c.w + c.l > 0 ? (c.w + 2) / (c.w + c.l + 4) : 0.5;
  if (p.form === 'hot') r += 0.05;
  if (p.form === 'cold') r -= 0.05;
  return Math.min(0.9, Math.max(0.1, r));
}

/** Chance our player wins the match. Records already include the handicap, so compare head to head (log5). */
export function winProb(ours: Player, theirs: Player): number {
  const a = rating(ours);
  const b = rating(theirs);
  const x = a * (1 - b);
  const y = b * (1 - a);
  return x + y === 0 ? 0.5 : x / (x + y);
}

export type ThreatLevel = 'Max' | 'High' | 'Medium' | 'Low';

export function threat(p: Player): ThreatLevel {
  if (p.maxThreat) return 'Max';
  const score = rating(p) + (p.sl - 4) * 0.02;
  if (score >= 0.66) return 'Max';
  if (score >= 0.57) return 'High';
  if (score >= 0.47 || p.sl >= 7) return 'Medium';
  return 'Low';
}

/* ---------------- race math: points, not just wins ---------------- */

function binom(n: number, k: number): number {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c;
}

/** Chance of reaching `a` racks before the opponent reaches `b`, winning each rack with probability q. */
function raceWin(q: number, a: number, b: number): number {
  let sum = 0;
  for (let k = 0; k < b; k++) sum += binom(a - 1 + k, k) * q ** a * (1 - q) ** k;
  return sum;
}

const qCache = new Map<string, number>();
/** Per-rack win chance that makes the whole race match the match win chance. */
function rackProb(p: number, a: number, b: number): number {
  const key = `${p.toFixed(4)}|${a}|${b}`;
  const hit = qCache.get(key);
  if (hit !== undefined) return hit;
  let lo = 0.001;
  let hi = 0.999;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (raceWin(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  const q = (lo + hi) / 2;
  qCache.set(key, q);
  return q;
}

export interface Outlook {
  race: [number, number];
  pWin: number;
  /** Chances of each result, from our side. */
  win30: number;
  win21: number;
  win20: number;
  lose03: number;
  lose12: number;
  lose02: number;
  /** Expected team points for us and them, and the swing (us minus them). */
  ePts: number;
  eOpp: number;
  swing: number;
}

const outlookCache = new Map<string, Outlook>();
export function outlook(ours: Player, theirs: Player): Outlook {
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

/** Team points for a finished individual match: [us, them]. */
export function matchPoints(winner: 'us' | 'them', racks: [number, number], raceTo: [number, number]): [number, number] {
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

/* ---------------- lineup planning under the 23 cap ---------------- */

export function canComplete(avail: Player[], k: number, budget: number): boolean {
  if (k <= 0) return budget >= 0;
  if (avail.length < k) return false;
  const cheapest = avail
    .map((p) => p.sl)
    .sort((x, y) => x - y)
    .slice(0, k)
    .reduce((x, y) => x + y, 0);
  return cheapest <= budget;
}

function combos<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const pick = (start: number, cur: T[]) => {
    if (cur.length === k) {
      out.push(cur.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]);
      pick(i + 1, cur);
      cur.pop();
    }
  };
  pick(0, []);
  return out;
}

/** The strongest group the opponent can still field under their cap. */
export function likelyOpponentSet(avail: Player[], k: number, budget: number): Player[] {
  const size = Math.min(k, avail.length);
  if (size <= 0) return [];
  let best: Player[] = [];
  let bestScore = -1;
  for (const group of combos(avail, size)) {
    const sl = group.reduce((x, p) => x + p.sl, 0);
    if (sl > budget) continue;
    const score = group.reduce((x, p) => x + rating(p), 0) + sl * 0.001;
    if (score > bestScore) {
      bestScore = score;
      best = group;
    }
  }
  return best;
}

export interface Pairing {
  ours: Player;
  theirs: Player;
  o: Outlook;
}

/** Best one-to-one matchups of our players against theirs, under our cap. Value = expected point swing. */
export function bestAssignment(ours: Player[], theirs: Player[], budget: number): { value: number; pairs: Pairing[] } {
  const k = theirs.length;
  if (k === 0) return { value: 0, pairs: [] };
  let best = -Infinity;
  let bestPairs: Pairing[] = [];
  const used = new Set<string>();
  const cur: Pairing[] = [];
  const dfs = (i: number, sum: number, slLeft: number) => {
    if (i === k) {
      if (sum > best) {
        best = sum;
        bestPairs = cur.slice();
      }
      return;
    }
    for (const p of ours) {
      if (used.has(p.id) || p.sl > slLeft) continue;
      const o = outlook(p, theirs[i]);
      used.add(p.id);
      cur.push({ ours: p, theirs: theirs[i], o });
      dfs(i + 1, sum + o.swing, slLeft - p.sl);
      cur.pop();
      used.delete(p.id);
    }
  };
  dfs(0, 0, budget);
  return best === -Infinity ? { value: 0, pairs: [] } : { value: best, pairs: bestPairs };
}

export function future(ours: Player[], theirs: Player[], k: number, ourBudget: number, theirBudget: number) {
  if (k <= 0) return { value: 0, pairs: [] as Pairing[] };
  return bestAssignment(ours, likelyOpponentSet(theirs, k, theirBudget), ourBudget);
}

/* ---------------- recommendations ---------------- */

export interface Option {
  player: Player;
  o: Outlook | null;
  legal: boolean;
  /** Ranking score: this match's point swing plus weighted future swing. */
  score: number;
  /** For our put-ups: their answer that hurts us most. */
  response?: Player | null;
}

const byScore = (a: Option, b: Option) => {
  if (a.legal !== b.legal) return Number(b.legal) - Number(a.legal);
  if (Math.abs(b.score - a.score) > 0.04) return b.score - a.score;
  return (b.o?.pWin ?? 0) - (a.o?.pWin ?? 0);
};

/** They put up `opp`. Rank every answer we have. */
export function counterOptions(
  ours: Player[],
  theirsAfter: Player[],
  opp: Player,
  roundsAfter: number,
  ourBudget: number,
  theirBudgetAfter: number,
  weight: number,
): Option[] {
  return ours
    .map((c): Option => {
      const rest = ours.filter((p) => p.id !== c.id);
      const legal = c.sl <= ourBudget && canComplete(rest, roundsAfter, ourBudget - c.sl);
      const o = outlook(c, opp);
      const score = legal
        ? o.swing + weight * future(rest, theirsAfter, roundsAfter, ourBudget - c.sl, theirBudgetAfter).value
        : -99;
      return { player: c, o, legal, score };
    })
    .sort(byScore);
}

/** We put up first. Each option assumes their most damaging legal answer. */
export function putUpOptions(
  ours: Player[],
  theirs: Player[],
  roundsAfter: number,
  ourBudget: number,
  theirBudget: number,
  weight: number,
): Option[] {
  return ours
    .map((c): Option => {
      const rest = ours.filter((p) => p.id !== c.id);
      const legal = c.sl <= ourBudget && canComplete(rest, roundsAfter, ourBudget - c.sl);
      if (!legal) return { player: c, o: null, legal, score: -99, response: null };
      const answers = theirs.filter(
        (r) => r.sl <= theirBudget && canComplete(theirs.filter((x) => x.id !== r.id), roundsAfter, theirBudget - r.sl),
      );
      if (answers.length === 0) return { player: c, o: null, legal, score: rating(c) - 0.5, response: null };
      let worst = Infinity;
      let worstAnswer = answers[0];
      for (const r of answers) {
        const v =
          outlook(c, r).swing +
          weight * future(rest, theirs.filter((x) => x.id !== r.id), roundsAfter, ourBudget - c.sl, theirBudget - r.sl).value;
        if (v < worst) {
          worst = v;
          worstAnswer = r;
        }
      }
      return { player: c, o: outlook(c, worstAnswer), legal, score: worst, response: worstAnswer };
    })
    .sort(byScore);
}

/* ---------------- score state → strategy ---------------- */

export type Mode = 'Chase' | 'Balanced' | 'Protect' | 'Clinched' | 'Eliminated' | 'Final';

export function strategy(usPts: number, themPts: number, roundsLeft: number): { mode: Mode; weight: number; headline: string; detail: string } {
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
