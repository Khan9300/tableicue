'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MATCHES,
  OPPONENTS,
  OUR_PLAYERS,
  OUR_TEAM,
  RACE,
  race,
  record,
  type OpponentKey,
  type Player,
} from '@/lib/toc/data';
import {
  CAP,
  ROUNDS,
  WINS_NEEDED,
  canComplete,
  counterOptions,
  putUpOptions,
  winProb,
  type Option,
} from '@/lib/toc/engine';

type Side = 'us' | 'them';
type MatchId = keyof typeof MATCHES;

interface Round {
  declarer: Side;
  ourId: string | null;
  theirId: string | null;
  racks: [number, number];
  winner: Side | null;
}

interface MatchState {
  opponent: OpponentKey;
  available: Record<string, boolean>;
  sl: Record<string, number>;
  extraOpp: Player[];
  tossWinner: Side | null;
  firstDeclarer: Side | null;
  rounds: Round[];
}

interface AppState {
  active: MatchId;
  matches: Record<MatchId, MatchState>;
}

const STORAGE_KEY = 'ticue-toc-2026-09-13-v1';

const freshMatch = (opponent: OpponentKey): MatchState => ({
  opponent,
  available: Object.fromEntries(OUR_PLAYERS.map((p) => [p.id, !p.confirm])),
  sl: {},
  extraOpp: [],
  tossWinner: null,
  firstDeclarer: null,
  rounds: [],
});

const DEFAULT_STATE: AppState = {
  active: 'm10',
  matches: { m10: freshMatch('roc'), m21: freshMatch('wolfpack') },
};

const other = (s: Side): Side => (s === 'us' ? 'them' : 'us');
const pct = (x: number) => `${Math.round(x * 100)}%`;

/* ---------- small presentational pieces ---------- */

function SL({ n, tone = 'dark' }: { n: number; tone?: 'dark' | 'chalk' }) {
  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-base font-bold tabular-nums ${
        tone === 'chalk' ? 'bg-[#7CC4F0] text-[#0E1B17]' : 'bg-[#0E1B17] text-[#EDF3EE]'
      }`}
    >
      {n}
    </span>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#27403A] bg-[#14251F] p-4 ${className}`}>{children}</section>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8AA196]">{children}</p>;
}

/* ---------- page ---------- */

export default function TocMatchDay() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [panel, setPanel] = useState<'none' | 'setup' | 'chart'>('none');
  const [forceName, setForceName] = useState('');
  const [forceSl, setForceSl] = useState(4);
  const history = useRef<AppState[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed?.matches?.m10 && parsed?.matches?.m21) setState(parsed);
      }
    } catch {
      /* private mode or blocked storage: start fresh */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, loaded]);

  const update = (fn: (m: MatchState) => MatchState) => {
    history.current = [...history.current.slice(-40), state];
    setState({ ...state, matches: { ...state.matches, [state.active]: fn(state.matches[state.active]) } });
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) setState(prev);
  };

  /* ---------- derived match state ---------- */
  const m = state.matches[state.active];
  const info = MATCHES[state.active];
  const opp = OPPONENTS[m.opponent];
  const withSl = (p: Player): Player => (m.sl[p.id] ? { ...p, sl: m.sl[p.id] } : p);
  const ours = OUR_PLAYERS.map(withSl);
  const theirs = [...opp.players, ...m.extraOpp].map(withSl);
  const all = [...ours, ...theirs];
  const byId = (id: string | null) => (id ? all.find((p) => p.id === id) ?? null : null);

  const finished = m.rounds.filter((r) => r.winner);
  const usWins = finished.filter((r) => r.winner === 'us').length;
  const themWins = finished.filter((r) => r.winner === 'them').length;
  const last = m.rounds[m.rounds.length - 1];
  const current = last && !last.winner ? last : null;
  const roundIndex = current ? m.rounds.length - 1 : m.rounds.length;
  const roundsAfter = ROUNDS - roundIndex - 1;
  const declarerFor = (i: number): Side | null =>
    m.firstDeclarer ? (i % 2 === 0 ? m.firstDeclarer : other(m.firstDeclarer)) : null;
  const declarer = declarerFor(roundIndex);

  const usedOurs = m.rounds.map((r) => r.ourId).filter((x): x is string => !!x);
  const usedTheirs = m.rounds.map((r) => r.theirId).filter((x): x is string => !!x);
  const ourBudget = CAP - usedOurs.reduce((a, id) => a + (byId(id)?.sl ?? 0), 0);
  const theirBudget = CAP - usedTheirs.reduce((a, id) => a + (byId(id)?.sl ?? 0), 0);
  const ourAvail = ours.filter((p) => m.available[p.id] && !usedOurs.includes(p.id));
  const theirAvail = theirs.filter((p) => !usedTheirs.includes(p.id));
  const ourPick = byId(current?.ourId ?? null);
  const theirPick = byId(current?.theirId ?? null);
  const matchDecided = usWins >= WINS_NEEDED || themWins >= WINS_NEEDED;
  const allPlayed = m.rounds.length >= ROUNDS && !current;
  const liveRace = ourPick && theirPick ? race(ourPick.sl, theirPick.sl) : null;

  const calcKey = JSON.stringify([state.active, m]);
  const counters = useMemo<Option[]>(
    () =>
      theirPick && !ourPick
        ? counterOptions(ourAvail, theirAvail, theirPick, roundsAfter, ourBudget, theirBudget)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcKey],
  );
  const putUps = useMemo<Option[]>(
    () =>
      declarer === 'us' && !ourPick && !theirPick && !allPlayed
        ? putUpOptions(ourAvail, theirAvail, roundsAfter, ourBudget, theirBudget)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcKey],
  );

  /* ---------- actions ---------- */
  const setPick = (side: Side, id: string | null) =>
    update((mm) => {
      const rounds = [...mm.rounds];
      const lr = rounds[rounds.length - 1];
      const key = side === 'us' ? 'ourId' : 'theirId';
      if (lr && !lr.winner) {
        const next = { ...lr, [key]: id };
        if (!next.ourId && !next.theirId) rounds.pop();
        else rounds[rounds.length - 1] = next;
      } else if (id) {
        const dec = mm.firstDeclarer
          ? rounds.length % 2 === 0
            ? mm.firstDeclarer
            : other(mm.firstDeclarer)
          : 'them';
        rounds.push({ declarer: dec, ourId: side === 'us' ? id : null, theirId: side === 'them' ? id : null, racks: [0, 0], winner: null });
      }
      return { ...mm, rounds };
    });

  const addRack = (side: Side, delta: 1 | -1) =>
    update((mm) => {
      const rounds = [...mm.rounds];
      const lr = rounds[rounds.length - 1];
      if (!lr || !lr.ourId || !lr.theirId) return mm;
      const o = byId(lr.ourId);
      const t = byId(lr.theirId);
      if (!o || !t) return mm;
      const target = race(o.sl, t.sl);
      const idx = side === 'us' ? 0 : 1;
      const racks: [number, number] = [...lr.racks];
      racks[idx] = Math.max(0, Math.min(target[idx], racks[idx] + delta));
      const winner: Side | null = racks[0] >= target[0] ? 'us' : racks[1] >= target[1] ? 'them' : null;
      rounds[rounds.length - 1] = { ...lr, racks, winner };
      return { ...mm, rounds };
    });

  const setWinner = (roundIdx: number, winner: Side | null) =>
    update((mm) => {
      const rounds = [...mm.rounds];
      rounds[roundIdx] = { ...rounds[roundIdx], winner };
      return { ...mm, rounds };
    });

  const reopenRound = (roundIdx: number) =>
    update((mm) => {
      if (roundIdx !== mm.rounds.length - 1) return mm;
      const rounds = [...mm.rounds];
      const r = rounds[roundIdx];
      const o = byId(r.ourId);
      const t = byId(r.theirId);
      const target = o && t ? race(o.sl, t.sl) : [9, 9];
      const racks: [number, number] = [Math.min(r.racks[0], target[0] - 1), Math.min(r.racks[1], target[1] - 1)];
      rounds[roundIdx] = { ...r, winner: null, racks };
      return { ...mm, rounds };
    });

  const removeLastRound = () => update((mm) => ({ ...mm, rounds: mm.rounds.slice(0, -1) }));

  const resetMatch = () => {
    if (typeof window !== 'undefined' && !window.confirm(`Clear everything for ${info.label}?`)) return;
    update((mm) => freshMatch(mm.opponent));
  };

  const addForcePlayer = () => {
    const name = forceName.trim();
    if (!name) return;
    const id = `x-${Date.now().toString(36)}`;
    update((mm) => ({ ...mm, extraOpp: [...mm.extraOpp, { id, name, sl: forceSl, wins: null, losses: null }] }));
    setForceName('');
  };

  /* ---------- advice ---------- */
  const oppShort = opp.name.replace(/!$/, '');
  const tips: { tone: 'good' | 'warn' | 'bad' | 'info'; text: string }[] = [];
  if (!m.tossWinner) {
    tips.push({ tone: 'info', text: 'If we win the toss, make them put up first. We then get the counter-pick in rounds 1, 3 and 5.' });
  }
  if (matchDecided) {
    tips.push(
      usWins >= WINS_NEEDED
        ? { tone: 'good', text: `We won ${info.label} ${usWins}-${themWins}.${state.active === 'm10' ? ' On to Match #21 at 7:00 PM.' : ''}` }
        : { tone: 'bad', text: `${oppShort} took ${info.label} ${themWins}-${usWins}.` },
    );
  } else if (m.firstDeclarer) {
    const need = WINS_NEEDED - usWins;
    const theyNeed = WINS_NEEDED - themWins;
    if (need === 1 && theyNeed === 1) tips.push({ tone: 'warn', text: 'Hill-hill. This round decides the match. Send the best available matchup, save nothing.' });
    else if (need === 1) tips.push({ tone: 'good', text: 'One more win clinches it.' });
    else if (theyNeed === 1) tips.push({ tone: 'bad', text: `${oppShort} is one win away. This round is must-win.` });
  }
  if (m.firstDeclarer && !allPlayed) {
    const k = ROUNDS - roundIndex;
    tips.push({ tone: 'info', text: `Our cap: ${ourBudget} SL left for ${k} player${k === 1 ? '' : 's'}. Theirs: ${theirBudget} for ${k}.` });
    const theirCapped = theirAvail.filter(
      (p) => p.id !== theirPick?.id && !(p.sl <= theirBudget && canComplete(theirAvail.filter((x) => x.id !== p.id), k - 1, theirBudget - p.sl)),
    );
    if (theirCapped.length && !theirPick) {
      tips.push({ tone: 'good', text: `Can't play anymore (their cap): ${theirCapped.map((p) => `${p.name} (${p.sl})`).join(', ')}.` });
    }
    const ourCapped = ourAvail.filter(
      (p) => !(p.sl <= ourBudget && canComplete(ourAvail.filter((x) => x.id !== p.id), k - 1, ourBudget - p.sl)),
    );
    if (ourCapped.length && !ourPick) {
      tips.push({ tone: 'warn', text: `Our cap rules out: ${ourCapped.map((p) => `${p.name} (${p.sl})`).join(', ')}.` });
    }
    const threats = theirAvail.filter((p) => p.hot && p.id !== theirPick?.id);
    if (threats.length) tips.push({ tone: 'warn', text: `Still to play: ${threats.map((p) => `${p.name} (${p.sl}, ${record(p)})`).join(', ')}.` });
    const umber = ourAvail.find((p) => p.id === 'umber');
    if (umber && !ourPick) {
      tips.push({ tone: 'info', text: "Umber's best spots: an even race against a 3 (2-2), or a trap against a 7 (2-6) when we can afford to spend her." });
    }
  }
  if (m.opponent === 'force' && theirs.length === 0) {
    tips.push({ tone: 'warn', text: 'No roster for The Force yet. Add each player as they put up (Rosters & SLs), or pick by SL.' });
  }

  const whyCounter = (o: Option, list: Option[], vs: Player): string => {
    const p = o.player;
    if (!o.legal) return 'Would break the 23 cap for the rest of our lineup.';
    if (vs.avoid?.includes(p.id)) return `Avoid. ${vs.name} is ${record(vs)} and this is their best spot.`;
    if (p.sl <= 3 && vs.sl >= 6) return `Trap: ${vs.name} must win ${o.race[1]}, ${p.name} needs ${o.race[0]}. It spends their ${vs.sl} on our ${p.sl}.`;
    const legal = list.filter((x) => x.legal);
    const topNow = legal.reduce((a, b) => (b.pNow > a.pNow ? b : a), legal[0]);
    if (list[0]?.player.id === p.id && topNow && topNow.player.id !== p.id) {
      return `Keeps ${topNow.player.name} for a bigger spot later. Best projection for the whole match.`;
    }
    if (list[0]?.player.id === p.id) return `Best chance this round and the best projection for the match.`;
    return `${pct(o.pNow)} this round.`;
  };

  const tone = {
    good: 'border-[#2F5E45] bg-[#1B3A2A] text-[#8ED9A8]',
    warn: 'border-[#5E4B22] bg-[#3D3016] text-[#F2BE63]',
    bad: 'border-[#6A3A30] bg-[#3E1F1A] text-[#F28B79]',
    info: 'border-[#27403A] bg-[#1B3029] text-[#B9C9BF]',
  };

  /* ---------- render ---------- */
  const pickButton = (p: Player, onClick: () => void, extra?: React.ReactNode, disabled = false) => (
    <button
      key={p.id}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition active:scale-[0.99] disabled:opacity-40 ${
        p.hot ? 'border-[#6A3A30]' : 'border-[#27403A]'
      } bg-[#1B3029] hover:border-[#7CC4F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7CC4F0]`}
    >
      <SL n={p.sl} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-[#EDF3EE]">{p.name}</span>
        <span className="block text-xs text-[#8AA196]">
          {record(p)}
          {p.hot ? ' · hot' : ''}
          {p.note ? ` · ${p.note}` : ''}
        </span>
      </span>
      {extra}
    </button>
  );

  const optionRow = (o: Option, i: number, list: Option[], onPick: () => void, vs: Player | null) => {
    const best = i === 0 && o.legal;
    const avoid = vs?.avoid?.includes(o.player.id);
    return (
      <button
        key={o.player.id}
        onClick={onPick}
        disabled={!o.legal}
        className={`w-full rounded-xl border p-3 text-left transition active:scale-[0.99] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7CC4F0] ${
          best ? 'border-[#8ED9A8] bg-[#1B3A2A]' : avoid ? 'border-[#6A3A30] bg-[#1B3029]' : 'border-[#27403A] bg-[#1B3029]'
        }`}
      >
        <div className="flex items-center gap-3">
          <SL n={o.player.sl} tone={best ? 'chalk' : 'dark'} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#EDF3EE]">{o.player.name}</span>
              {best && <span className="rounded-full bg-[#8ED9A8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0E1B17]">Send</span>}
              {avoid && <span className="rounded-full bg-[#3E1F1A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F28B79]">Avoid</span>}
            </div>
            <p className={`mt-0.5 text-sm ${best ? 'text-[#8ED9A8]' : 'text-[#B9C9BF]'}`}>
              {vs ? whyCounter(o, list, vs) : o.response ? `Their best answer: ${o.response.name} (${o.response.sl}). ${pct(o.pNow)} for us.` : 'No data on their roster yet.'}
            </p>
          </div>
          {o.legal && o.race[0] > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums text-[#EDF3EE]">
                {o.race[0]}-{o.race[1]}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#8AA196]">us-them</div>
            </div>
          )}
        </div>
        {o.legal && (
          <p className="mt-2 text-xs text-[#8AA196]">
            {pct(o.pNow)} chance this round{o.response ? ` if they answer with ${o.response.name}` : ''}
          </p>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0E1B17] pb-24 text-[#B9C9BF]">
      {/* Sticky scoreboard */}
      <header className="sticky top-0 z-20 border-b border-[#27403A] bg-[#0E1B17]/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 pb-3 pt-3">
          <div className="flex items-center gap-2">
            {(Object.keys(MATCHES) as MatchId[]).map((id) => (
              <button
                key={id}
                onClick={() => setState({ ...state, active: id })}
                aria-pressed={state.active === id}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                  state.active === id ? 'border-[#EDF3EE] bg-[#EDF3EE] text-[#0E1B17]' : 'border-[#27403A] text-[#B9C9BF]'
                }`}
              >
                {MATCHES[id].label} · {MATCHES[id].time}
              </button>
            ))}
            <button onClick={undo} className="ml-auto rounded-full border border-[#27403A] px-3 py-1.5 text-xs font-semibold text-[#B9C9BF]">
              Undo
            </button>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <p className="truncate text-sm font-semibold uppercase tracking-wider text-[#7CC4F0]">{OUR_TEAM.name}</p>
              <p className="text-xs text-[#8AA196]">Cap left {ourBudget}</p>
            </div>
            <div className="text-center text-5xl font-bold tabular-nums leading-none text-[#EDF3EE]">
              {usWins}
              <span className="px-2 text-[#27403A]">–</span>
              {themWins}
            </div>
            <div className="text-right">
              <p className="truncate text-sm font-semibold uppercase tracking-wider text-[#EDF3EE]">{oppShort}</p>
              <p className="text-xs text-[#8AA196]">Cap left {theirBudget}</p>
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-1.5" aria-label="Rounds">
            {Array.from({ length: ROUNDS }, (_, i) => {
              const r = m.rounds[i];
              const c = r?.winner === 'us' ? 'bg-[#7CC4F0]' : r?.winner === 'them' ? 'bg-[#F28B79]' : i === roundIndex && m.firstDeclarer ? 'bg-[#F2BE63]' : 'bg-[#27403A]';
              return <span key={i} className={`h-2 w-8 rounded-full ${c}`} />;
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-2xl gap-3 px-4 pt-4">
        {/* Match #21 opponent selector */}
        {info.options.length > 1 && (
          <Card>
            <Eyebrow>Match #21 opponent (winner of #9)</Eyebrow>
            <div className="mt-2 flex gap-2">
              {info.options.map((k) => (
                <button
                  key={k}
                  onClick={() => update((mm) => ({ ...mm, opponent: k }))}
                  aria-pressed={m.opponent === k}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                    m.opponent === k ? 'border-[#7CC4F0] bg-[#1C3444] text-[#EDF3EE]' : 'border-[#27403A] bg-[#1B3029]'
                  }`}
                >
                  {OPPONENTS[k].name}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* STEP: coin toss */}
        {!m.firstDeclarer && (
          <Card>
            <Eyebrow>Step 1 · Coin toss</Eyebrow>
            <h2 className="mt-1 text-2xl font-bold text-[#EDF3EE]">Who won the toss?</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(['us', 'them'] as Side[]).map((s) => (
                <button
                  key={s}
                  onClick={() => update((mm) => ({ ...mm, tossWinner: s }))}
                  aria-pressed={m.tossWinner === s}
                  className={`min-h-14 rounded-xl border text-lg font-semibold ${
                    m.tossWinner === s ? 'border-[#7CC4F0] bg-[#1C3444] text-[#EDF3EE]' : 'border-[#27403A] bg-[#1B3029]'
                  }`}
                >
                  {s === 'us' ? 'We won' : `${oppShort} won`}
                </button>
              ))}
            </div>
            {m.tossWinner && (
              <>
                <h3 className="mt-5 text-lg font-semibold text-[#EDF3EE]">Who puts up first in round 1?</h3>
                {m.tossWinner === 'us' && <p className="mt-1 text-sm text-[#8ED9A8]">Recommended: make them put up first. We counter in rounds 1, 3 and 5.</p>}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => update((mm) => ({ ...mm, firstDeclarer: 'them' }))}
                    className={`min-h-14 rounded-xl border px-2 font-semibold ${m.tossWinner === 'us' ? 'border-[#8ED9A8] bg-[#1B3A2A] text-[#8ED9A8]' : 'border-[#27403A] bg-[#1B3029]'}`}
                  >
                    {oppShort} puts up first
                  </button>
                  <button onClick={() => update((mm) => ({ ...mm, firstDeclarer: 'us' }))} className="min-h-14 rounded-xl border border-[#27403A] bg-[#1B3029] px-2 font-semibold">
                    We put up first
                  </button>
                </div>
              </>
            )}
          </Card>
        )}

        {/* Advice feed */}
        {tips.length > 0 && (
          <div className="grid gap-2" aria-live="polite">
            {tips.map((t, i) => (
              <p key={i} className={`rounded-xl border px-3 py-2 text-sm ${tone[t.tone]}`}>
                {t.text}
              </p>
            ))}
          </div>
        )}

        {/* STEP: rounds */}
        {m.firstDeclarer && !allPlayed && (
          <Card>
            <div className="flex items-baseline justify-between gap-2">
              <Eyebrow>
                Round {roundIndex + 1} of {ROUNDS} · {declarer === 'us' ? 'We put up first' : `${oppShort} puts up first`}
              </Eyebrow>
              {matchDecided && <span className="text-xs text-[#8AA196]">Match decided · optional</span>}
            </div>

            {/* Both picked: live scoring */}
            {ourPick && theirPick && liveRace && current ? (
              <div className="mt-3">
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['us', ourPick, liveRace[0], current.racks[0]],
                    ['them', theirPick, liveRace[1], current.racks[1]],
                  ] as [Side, Player, number, number][]).map(([side, p, target, have]) => (
                    <div key={side} className={`rounded-xl border p-3 ${side === 'us' ? 'border-[#2B5670] bg-[#16303D]' : 'border-[#27403A] bg-[#1B3029]'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${side === 'us' ? 'text-[#7CC4F0]' : 'text-[#8AA196]'}`}>{side === 'us' ? OUR_TEAM.short : oppShort}</p>
                      <p className="mt-1 truncate text-lg font-bold text-[#EDF3EE]">
                        {p.name} <span className="text-[#8AA196]">({p.sl})</span>
                      </p>
                      <p className="mt-2 text-6xl font-bold tabular-nums leading-none text-[#EDF3EE]">
                        {have}
                        <span className="text-2xl text-[#8AA196]">/{target}</span>
                      </p>
                      <div className="mt-2 flex gap-1">
                        {Array.from({ length: target }, (_, i) => (
                          <span key={i} className={`h-2 flex-1 rounded-full ${i < have ? (side === 'us' ? 'bg-[#7CC4F0]' : 'bg-[#F28B79]') : 'bg-[#0E1B17]'}`} />
                        ))}
                      </div>
                      <button
                        onClick={() => addRack(side, 1)}
                        className={`mt-3 min-h-20 w-full rounded-xl text-xl font-bold active:scale-[0.98] ${side === 'us' ? 'bg-[#7CC4F0] text-[#0E1B17]' : 'bg-[#EDF3EE] text-[#0E1B17]'}`}
                      >
                        + Rack
                      </button>
                      <button onClick={() => addRack(side, -1)} className="mt-2 w-full rounded-lg border border-[#27403A] py-1.5 text-xs font-semibold">
                        − Remove rack
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-sm text-[#8AA196]">
                  Race {liveRace[0]}-{liveRace[1]} · {pct(winProb(ourPick, theirPick))} for us going in
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold">
                  <button onClick={() => setWinner(m.rounds.length - 1, 'us')} className="rounded-lg border border-[#2F5E45] py-2 text-[#8ED9A8]">
                    We won
                  </button>
                  <button onClick={() => setWinner(m.rounds.length - 1, 'them')} className="rounded-lg border border-[#6A3A30] py-2 text-[#F28B79]">
                    They won
                  </button>
                  <button onClick={() => setPick('us', null)} className="rounded-lg border border-[#27403A] py-2">
                    Change our pick
                  </button>
                </div>
              </div>
            ) : declarer === 'them' ? (
              /* They declare first */
              !theirPick ? (
                <div className="mt-3">
                  <h2 className="text-xl font-bold text-[#EDF3EE]">Who did {oppShort} put up?</h2>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {theirAvail.map((p) => {
                      const k = ROUNDS - roundIndex;
                      const legal = p.sl <= theirBudget && canComplete(theirAvail.filter((x) => x.id !== p.id), k - 1, theirBudget - p.sl);
                      return pickButton(p, () => setPick('them', p.id), !legal ? <span className="text-[10px] uppercase text-[#F2BE63]">cap</span> : undefined);
                    })}
                  </div>
                  {theirAvail.length === 0 && <p className="mt-2 text-sm text-[#8AA196]">No players left or no roster. Add them in Rosters &amp; SLs.</p>}
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-bold text-[#EDF3EE]">
                      They put up {theirPick.name} <span className="text-[#8AA196]">({theirPick.sl})</span>
                    </h2>
                    <button onClick={() => setPick('them', null)} className="shrink-0 rounded-lg border border-[#27403A] px-2 py-1 text-xs">
                      Change
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-[#8AA196]">Send one of these. Top pick is highlighted.</p>
                  <div className="mt-3 grid gap-2">{counters.map((o, i, list) => optionRow(o, i, list, () => setPick('us', o.player.id), theirPick))}</div>
                </div>
              )
            ) : /* We declare first */ !ourPick ? (
              <div className="mt-3">
                <h2 className="text-xl font-bold text-[#EDF3EE]">Our put-up</h2>
                <p className="mt-1 text-sm text-[#8AA196]">Ranked by how well each holds up against their best answer.</p>
                <div className="mt-3 grid gap-2">{putUps.map((o, i, list) => optionRow(o, i, list, () => setPick('us', o.player.id), null))}</div>
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-[#EDF3EE]">
                    We put up {ourPick.name} <span className="text-[#8AA196]">({ourPick.sl})</span>
                  </h2>
                  <button onClick={() => setPick('us', null)} className="shrink-0 rounded-lg border border-[#27403A] px-2 py-1 text-xs">
                    Change
                  </button>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[#EDF3EE]">Who did they answer with?</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {theirAvail.map((p) => {
                    const r = race(ourPick.sl, p.sl);
                    return pickButton(
                      p,
                      () => setPick('them', p.id),
                      <span className="text-right">
                        <span className="block text-lg font-bold tabular-nums text-[#EDF3EE]">
                          {r[0]}-{r[1]}
                        </span>
                        <span className="block text-[10px] text-[#8AA196]">{pct(winProb(ourPick, p))} us</span>
                      </span>,
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Round history */}
        {m.rounds.length > 0 && (
          <Card>
            <Eyebrow>Rounds</Eyebrow>
            <ol className="mt-2 grid gap-2">
              {m.rounds.map((r, i) => {
                const o = byId(r.ourId);
                const t = byId(r.theirId);
                const isLast = i === m.rounds.length - 1;
                return (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-[#27403A] bg-[#1B3029] px-3 py-2">
                    <span className="w-6 text-sm font-bold tabular-nums text-[#8AA196]">{i + 1}</span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="text-[#EDF3EE]">{o ? `${o.name} (${o.sl})` : '—'}</span>
                      <span className="text-[#8AA196]"> vs </span>
                      <span className="text-[#EDF3EE]">{t ? `${t.name} (${t.sl})` : '—'}</span>
                      <span className="block text-xs text-[#8AA196]">
                        {r.declarer === 'us' ? 'We put up' : 'They put up'} · racks {r.racks[0]}-{r.racks[1]}
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        r.winner === 'us' ? 'bg-[#1C3444] text-[#7CC4F0]' : r.winner === 'them' ? 'bg-[#3E1F1A] text-[#F28B79]' : 'bg-[#3D3016] text-[#F2BE63]'
                      }`}
                    >
                      {r.winner === 'us' ? 'W' : r.winner === 'them' ? 'L' : 'Live'}
                    </span>
                    {isLast && r.winner && (
                      <button onClick={() => reopenRound(i)} className="rounded-lg border border-[#27403A] px-2 py-1 text-xs">
                        Reopen
                      </button>
                    )}
                    {isLast && (
                      <button onClick={removeLastRound} className="rounded-lg border border-[#27403A] px-2 py-1 text-xs">
                        Delete
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        {/* Panels */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPanel(panel === 'setup' ? 'none' : 'setup')}
            aria-expanded={panel === 'setup'}
            className="min-h-12 rounded-xl border border-[#27403A] bg-[#14251F] text-sm font-semibold text-[#EDF3EE]"
          >
            Rosters &amp; SLs
          </button>
          <button
            onClick={() => setPanel(panel === 'chart' ? 'none' : 'chart')}
            aria-expanded={panel === 'chart'}
            className="min-h-12 rounded-xl border border-[#27403A] bg-[#14251F] text-sm font-semibold text-[#EDF3EE]"
          >
            Race chart
          </button>
        </div>

        {panel === 'setup' && (
          <Card>
            <Eyebrow>Our roster · tap to mark who's here</Eyebrow>
            <div className="mt-2 grid gap-2">
              {ours.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <button
                    onClick={() => update((mm) => ({ ...mm, available: { ...mm.available, [p.id]: !mm.available[p.id] } }))}
                    aria-pressed={!!m.available[p.id]}
                    className={`flex min-h-12 flex-1 items-center gap-3 rounded-xl border px-3 text-left ${
                      m.available[p.id] ? 'border-[#7CC4F0] bg-[#1C3444]' : 'border-[#27403A] bg-[#1B3029] opacity-60'
                    }`}
                  >
                    <SL n={p.sl} tone={m.available[p.id] ? 'chalk' : 'dark'} />
                    <span className="flex-1 font-semibold text-[#EDF3EE]">{p.name}</span>
                    <span className="text-xs text-[#8AA196]">{p.confirm ? 'confirm roster' : record(p)}</span>
                  </button>
                  <SlSelect value={p.sl} onChange={(v) => update((mm) => ({ ...mm, sl: { ...mm.sl, [p.id]: v } }))} label={`${p.name} skill level`} />
                </div>
              ))}
            </div>

            <div className="mt-5">
              <Eyebrow>{opp.name} · fix any SL that changed</Eyebrow>
              <div className="mt-2 grid gap-2">
                {theirs.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-xl border border-[#27403A] bg-[#1B3029] px-3 py-2">
                    <span className="flex-1 text-sm font-semibold text-[#EDF3EE]">{p.name}</span>
                    <span className="text-xs text-[#8AA196]">{record(p)}</span>
                    <SlSelect value={p.sl} onChange={(v) => update((mm) => ({ ...mm, sl: { ...mm.sl, [p.id]: v } }))} label={`${p.name} skill level`} />
                  </div>
                ))}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addForcePlayer();
                }}
              >
                <label className="sr-only" htmlFor="addName">
                  Player name
                </label>
                <input
                  id="addName"
                  value={forceName}
                  onChange={(e) => setForceName(e.target.value)}
                  placeholder={`Add ${opp.name} player`}
                  className="min-h-11 flex-1 rounded-xl border border-[#27403A] bg-[#0E1B17] px-3 text-sm text-[#EDF3EE] placeholder:text-[#8AA196]"
                />
                <SlSelect value={forceSl} onChange={setForceSl} label="New player skill level" />
                <button type="submit" className="min-h-11 rounded-xl bg-[#7CC4F0] px-4 text-sm font-bold text-[#0E1B17]">
                  Add
                </button>
              </form>
            </div>

            <button onClick={resetMatch} className="mt-5 w-full rounded-xl border border-[#6A3A30] py-2.5 text-sm font-semibold text-[#F28B79]">
              Reset {info.label}
            </button>
          </Card>
        )}

        {panel === 'chart' && (
          <Card>
            <Eyebrow>APA 8-Ball · games to win · ours first</Eyebrow>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-center tabular-nums">
                <thead>
                  <tr>
                    <th className="border border-[#27403A] p-2 text-left text-xs text-[#8AA196]">Us ↓ Them →</th>
                    {[3, 4, 5, 6, 7].map((c) => (
                      <th key={c} className="border border-[#27403A] p-2 text-sm text-[#8AA196]">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[3, 4, 5, 6].map((r) => (
                    <tr key={r}>
                      <th className="border border-[#27403A] p-2 text-left text-sm text-[#EDF3EE]">
                        {r} · {ours.filter((p) => p.sl === r).map((p) => p.name).join(', ')}
                      </th>
                      {[3, 4, 5, 6, 7].map((c) => (
                        <td key={c} className="border border-[#27403A] p-2 text-lg font-bold text-[#EDF3EE]">
                          {RACE[r][c][0]}-{RACE[r][c][1]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[#8AA196]">Check against the chart printed on the scoresheet. Timeouts: SL 3 and below get 2 per rack, SL 4 and up get 1.</p>
          </Card>
        )}

        <p className="pt-2 text-center text-xs text-[#8AA196]">
          Saved on this phone. Chances come from Summer 2026 records and are a guide, not a guarantee.
        </p>
      </main>
    </div>
  );
}

function SlSelect({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="min-h-11 rounded-xl border border-[#27403A] bg-[#0E1B17] px-2 text-sm font-bold text-[#EDF3EE]"
    >
      {[2, 3, 4, 5, 6, 7].map((n) => (
        <option key={n} value={n}>
          SL {n}
        </option>
      ))}
    </select>
  );
}
