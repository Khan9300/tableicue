import { race, type Player } from './data';

export const CAP = 23;
export const ROUNDS = 5;
export const WINS_NEEDED = 3;

/** Win rate shrunk toward 50% so a 2-0 record doesn't look like a sure thing. */
export function rating(p: Player): number {
  if (p.wins == null || p.losses == null) return 0.5;
  return (p.wins + 2) / (p.wins + p.losses + 4);
}

/**
 * Chance our player beats theirs. Records already include the handicap,
 * so the two win rates are compared head to head (log5).
 */
export function winProb(ours: Player, theirs: Player): number {
  const a = rating(ours);
  const b = rating(theirs);
  const x = a * (1 - b);
  const y = b * (1 - a);
  return x + y === 0 ? 0.5 : x / (x + y);
}

/** Can `k` more players from `avail` still fit under `budget` skill levels? */
export function canComplete(avail: Player[], k: number, budget: number): boolean {
  if (k <= 0) return budget >= 0;
  if (avail.length < k) return false;
  const cheapest = avail
    .map((p) => p.sl)
    .sort((a, b) => a - b)
    .slice(0, k)
    .reduce((a, b) => a + b, 0);
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

/** The strongest group of `k` the opponent can still field under their cap. */
export function likelyOpponentSet(avail: Player[], k: number, budget: number): Player[] {
  if (k <= 0) return [];
  const size = Math.min(k, avail.length);
  let best: Player[] = [];
  let bestScore = -1;
  for (const group of combos(avail, size)) {
    const sl = group.reduce((a, p) => a + p.sl, 0);
    if (sl > budget) continue;
    const score = group.reduce((a, p) => a + rating(p), 0) + sl * 0.001;
    if (score > bestScore) {
      bestScore = score;
      best = group;
    }
  }
  return best;
}

/** Best expected wins if we could match our players to theirs one-to-one under our cap. */
export function bestAssignment(ours: Player[], theirs: Player[], budget: number): number {
  const k = theirs.length;
  if (k === 0) return 0;
  let best = -1;
  const used = new Set<string>();
  const dfs = (i: number, sum: number, slLeft: number) => {
    if (i === k) {
      if (sum > best) best = sum;
      return;
    }
    for (const p of ours) {
      if (used.has(p.id) || p.sl > slLeft) continue;
      used.add(p.id);
      dfs(i + 1, sum + winProb(p, theirs[i]), slLeft - p.sl);
      used.delete(p.id);
    }
  };
  dfs(0, 0, budget);
  return best < 0 ? 0 : best;
}

/** Expected wins over the remaining `k` rounds. */
export function future(ours: Player[], theirs: Player[], k: number, ourBudget: number, theirBudget: number): number {
  if (k <= 0) return 0;
  return bestAssignment(ours, likelyOpponentSet(theirs, k, theirBudget), ourBudget);
}

export interface Option {
  player: Player;
  race: [number, number];
  /** Chance to win this round. */
  pNow: number;
  /** Expected wins from this round to the end of the match. */
  outlook: number;
  legal: boolean;
  /** For our put-ups: the answer that hurts us most. */
  response?: Player | null;
}

/**
 * Later rounds count at half weight: we only get the counter-pick every other round,
 * so the perfect-matchup future in `future()` is optimistic.
 */
export const FUTURE_WEIGHT = 0.5;

/** When two options score within this margin, take the better chance this round. */
const CLOSE = 0.03;

const byBest = (a: Option, b: Option) => {
  if (a.legal !== b.legal) return Number(b.legal) - Number(a.legal);
  if (Math.abs(b.outlook - a.outlook) > CLOSE) return b.outlook - a.outlook;
  return b.pNow - a.pNow;
};

/** They put up `opp`. Rank our answers. `theirsAfter` and `theirBudgetAfter` already exclude `opp`. */
export function counterOptions(
  ours: Player[],
  theirsAfter: Player[],
  opp: Player,
  roundsAfter: number,
  ourBudget: number,
  theirBudgetAfter: number,
): Option[] {
  return ours
    .map((c) => {
      const rest = ours.filter((p) => p.id !== c.id);
      const legal = c.sl <= ourBudget && canComplete(rest, roundsAfter, ourBudget - c.sl);
      const pNow = winProb(c, opp);
      const outlook = legal
        ? pNow + FUTURE_WEIGHT * future(rest, theirsAfter, roundsAfter, ourBudget - c.sl, theirBudgetAfter)
        : -1;
      return { player: c, race: race(c.sl, opp.sl), pNow, outlook, legal };
    })
    .sort(byBest);
}

/** We put up first. For each option, assume they answer with whatever hurts us most. */
export function putUpOptions(
  ours: Player[],
  theirs: Player[],
  roundsAfter: number,
  ourBudget: number,
  theirBudget: number,
): Option[] {
  return ours
    .map((c): Option => {
      const rest = ours.filter((p) => p.id !== c.id);
      const legal = c.sl <= ourBudget && canComplete(rest, roundsAfter, ourBudget - c.sl);
      if (!legal) return { player: c, race: [0, 0], pNow: 0, outlook: -1, legal, response: null };
      const answers = theirs.filter(
        (r) => r.sl <= theirBudget && canComplete(theirs.filter((x) => x.id !== r.id), roundsAfter, theirBudget - r.sl),
      );
      if (answers.length === 0) {
        return { player: c, race: [0, 0], pNow: rating(c), outlook: rating(c), legal, response: null };
      }
      let worst = Infinity;
      let worstAnswer = answers[0];
      for (const r of answers) {
        const v =
          winProb(c, r) +
          FUTURE_WEIGHT *
          future(rest, theirs.filter((x) => x.id !== r.id), roundsAfter, ourBudget - c.sl, theirBudget - r.sl);
        if (v < worst) {
          worst = v;
          worstAnswer = r;
        }
      }
      return {
        player: c,
        race: race(c.sl, worstAnswer.sl),
        pNow: winProb(c, worstAnswer),
        outlook: worst,
        legal,
        response: worstAnswer,
      };
    })
    .sort(byBest);
}
