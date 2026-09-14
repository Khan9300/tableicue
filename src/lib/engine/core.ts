import { Player, ThreatLevel, Option, Pairing, Outlook, Format } from './types';

export const CAP = 23;
export const ROUNDS = 5;

/** Combined win/loss records including other teams */
export function combined(p: Player): { w: number; l: number } | null {
  if (p.wins == null || p.losses == null) return null;
  const extra = (p.otherTeams ?? []).reduce((a, t) => ({ w: a.w + t.w, l: a.l + t.l }), { w: 0, l: 0 });
  return { w: p.wins + extra.w, l: p.losses + extra.l };
}

/** Win rate shrunk toward 50% */
export function rating(p: Player): number {
  const c = combined(p);
  let r = c && c.w + c.l > 0 ? (c.w + 2) / (c.w + c.l + 4) : 0.5;
  if (p.form === 'hot') r += 0.05;
  if (p.form === 'cold') r -= 0.05;
  return Math.min(0.9, Math.max(0.1, r));
}

/** Log5 win probability */
export function winProb(ours: Player, theirs: Player): number {
  const a = rating(ours);
  const b = rating(theirs);
  const x = a * (1 - b);
  const y = b * (1 - a);
  return x + y === 0 ? 0.5 : x / (x + y);
}

/** Player threat level */
export function threat(p: Player): ThreatLevel {
  if (p.maxThreat) return 'Max';
  const score = rating(p) + (p.sl - 4) * 0.02;
  if (score >= 0.66) return 'Max';
  if (score >= 0.57) return 'High';
  if (score >= 0.47 || p.sl >= 7) return 'Medium';
  return 'Low';
}

export function binom(n: number, k: number): number {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c;
}

export function raceWin(q: number, a: number, b: number): number {
  let sum = 0;
  for (let k = 0; k < b; k++) sum += binom(a - 1 + k, k) * q ** a * (1 - q) ** k;
  return sum;
}

const qCache = new Map<string, number>();
export function rackProb(p: number, a: number, b: number): number {
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

export function canComplete(avail: Player[], k: number, budget: number, format: Format, seniorsUsed: number = 0): boolean {
  if (k <= 0) return budget >= 0 && seniorsUsed <= 2;
  if (avail.length < k) return false;
  
  const cheapest = avail
    .map((p) => p.sl)
    .sort((x, y) => x - y)
    .slice(0, k)
    .reduce((x, y) => x + y, 0);
  if (cheapest > budget) return false;
  
  const isSenior = (p: Player) => p.sl >= 6;
  let minSeniors = 0;
  const sortedBySeniorAsc = [...avail].sort((a, b) => (isSenior(a) ? 1 : 0) - (isSenior(b) ? 1 : 0));
  for (let i = 0; i < k; i++) {
    if (isSenior(sortedBySeniorAsc[i])) minSeniors++;
  }
  return seniorsUsed + minSeniors <= 2;
}

export function legalLineups(players: Player[], format: Format): Player[][] {
  const isSenior = (p: Player) => p.sl >= 6;
  const out: Player[][] = [];
  const pick = (start: number, cur: Player[], slSum: number, seniorCount: number) => {
    if (cur.length === 5) {
      if (slSum <= CAP && seniorCount <= 2) out.push([...cur]);
      return;
    }
    for (let i = start; i < players.length; i++) {
      const p = players[i];
      pick(i + 1, [...cur, p], slSum + p.sl, seniorCount + (isSenior(p) ? 1 : 0));
    }
  };
  pick(0, [], 0, 0);
  return out;
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

export function likelyOpponentSet(avail: Player[], k: number, budget: number, format: Format): Player[] {
  const size = Math.min(k, avail.length);
  if (size <= 0) return [];
  let best: Player[] = [];
  let bestScore = -1;
  const isSenior = (p: Player) => p.sl >= 6;
  for (const group of combos(avail, size)) {
    const sl = group.reduce((x, p) => x + p.sl, 0);
    const seniors = group.reduce((x, p) => x + (isSenior(p) ? 1 : 0), 0);
    if (sl > budget || seniors > 2) continue;
    const score = group.reduce((x, p) => x + rating(p), 0) + sl * 0.001;
    if (score > bestScore) {
      bestScore = score;
      best = group;
    }
  }
  return best;
}

export function bestAssignment(
  ours: Player[], theirs: Player[], budget: number,
  outlookFn: (ours: Player, theirs: Player) => Outlook,
  format: Format, seniorsUsed: number = 0
): { value: number; pairs: Pairing[] } {
  const k = theirs.length;
  if (k === 0) return { value: 0, pairs: [] };
  let best = -Infinity;
  let bestPairs: Pairing[] = [];
  const used = new Set<string>();
  const cur: Pairing[] = [];
  const isSenior = (p: Player) => p.sl >= 6;
  const dfs = (i: number, sum: number, slLeft: number, senLeft: number) => {
    if (i === k) {
      if (sum > best) {
        best = sum;
        bestPairs = cur.slice();
      }
      return;
    }
    for (const p of ours) {
      if (used.has(p.id) || p.sl > slLeft || (isSenior(p) && senLeft === 0)) continue;
      const o = outlookFn(p, theirs[i]);
      used.add(p.id);
      cur.push({ ours: p, theirs: theirs[i], o });
      dfs(i + 1, sum + o.swing, slLeft - p.sl, senLeft - (isSenior(p) ? 1 : 0));
      cur.pop();
      used.delete(p.id);
    }
  };
  dfs(0, 0, budget, 2 - seniorsUsed);
  return best === -Infinity ? { value: 0, pairs: [] } : { value: best, pairs: bestPairs };
}

export function future(
  ours: Player[], theirs: Player[], k: number, ourBudget: number, theirBudget: number,
  outlookFn: (ours: Player, theirs: Player) => Outlook, format: Format, seniorsUsedOur: number, seniorsUsedTheir: number
) {
  if (k <= 0) return { value: 0, pairs: [] as Pairing[] };
  return bestAssignment(ours, likelyOpponentSet(theirs, k, theirBudget, format), ourBudget, outlookFn, format, seniorsUsedOur);
}

const byScore = (a: Option, b: Option) => {
  if (a.legal !== b.legal) return Number(b.legal) - Number(a.legal);
  if (Math.abs(b.score - a.score) > 0.04) return b.score - a.score;
  return (b.o?.pWin ?? 0) - (a.o?.pWin ?? 0);
};

export function counterOptions(
  ours: Player[], theirsAfter: Player[], opp: Player, roundsAfter: number,
  ourBudget: number, theirBudgetAfter: number, weight: number,
  outlookFn: (ours: Player, theirs: Player) => Outlook, format: Format,
  ourSeniorsUsed: number = 0, theirSeniorsUsed: number = 0
): Option[] {
  const isSenior = (p: Player) => p.sl >= 6;
  return ours
    .map((c): Option => {
      const cSenior = isSenior(c) ? 1 : 0;
      const rest = ours.filter((p) => p.id !== c.id);
      const legal = c.sl <= ourBudget && ourSeniorsUsed + cSenior <= 2 && canComplete(rest, roundsAfter, ourBudget - c.sl, format, ourSeniorsUsed + cSenior);
      const o = outlookFn(c, opp);
      const score = legal
        ? o.swing + weight * future(rest, theirsAfter, roundsAfter, ourBudget - c.sl, theirBudgetAfter, outlookFn, format, ourSeniorsUsed + cSenior, theirSeniorsUsed).value
        : -99;
      return { player: c, o, legal, score };
    })
    .sort(byScore);
}

export function putUpOptions(
  ours: Player[], theirs: Player[], roundsAfter: number,
  ourBudget: number, theirBudget: number, weight: number,
  outlookFn: (ours: Player, theirs: Player) => Outlook, format: Format,
  ourSeniorsUsed: number = 0, theirSeniorsUsed: number = 0
): Option[] {
  const isSenior = (p: Player) => p.sl >= 6;
  return ours
    .map((c): Option => {
      const cSenior = isSenior(c) ? 1 : 0;
      const rest = ours.filter((p) => p.id !== c.id);
      const legal = c.sl <= ourBudget && ourSeniorsUsed + cSenior <= 2 && canComplete(rest, roundsAfter, ourBudget - c.sl, format, ourSeniorsUsed + cSenior);
      if (!legal) return { player: c, o: null, legal, score: -99, response: null };
      
      const answers = theirs.filter(
        (r) => {
          const rSenior = isSenior(r) ? 1 : 0;
          return r.sl <= theirBudget && theirSeniorsUsed + rSenior <= 2 && canComplete(theirs.filter((x) => x.id !== r.id), roundsAfter, theirBudget - r.sl, format, theirSeniorsUsed + rSenior);
        }
      );
      if (answers.length === 0) return { player: c, o: null, legal, score: rating(c) - 0.5, response: null };
      
      let worst = Infinity;
      let worstAnswer = answers[0];
      for (const r of answers) {
        const rSenior = isSenior(r) ? 1 : 0;
        const v =
          outlookFn(c, r).swing +
          weight * future(rest, theirs.filter((x) => x.id !== r.id), roundsAfter, ourBudget - c.sl, theirBudget - r.sl, outlookFn, format, ourSeniorsUsed + cSenior, theirSeniorsUsed + rSenior).value;
        if (v < worst) {
          worst = v;
          worstAnswer = r;
        }
      }
      return { player: c, o: outlookFn(c, worstAnswer), legal, score: worst, response: worstAnswer };
    })
    .sort(byScore);
}
