'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { MATCHES, OUR_TEAM, TEAMS, race, record, type Form, type Player, type Team } from '@/lib/toc/data';
import {
  CAP,
  ROUNDS,
  canComplete,
  canFit,
  combined,
  counterOptions,
  fromOf,
  future,
  matchPoints,
  orderings,
  outlook,
  putUpOptions,
  strategy,
  threat,
  uniqueSets,
  type Mode,
  type Outlook,
  type Option,
  type ThreatLevel,
} from '@/lib/toc/engine';

/* ============================== types & state ============================== */

type Side = 'us' | 'them';
type MatchId = keyof typeof MATCHES;
type Tab = 'match' | 'plan' | 'players' | 'setup';

interface Round {
  declarer: Side;
  ourId: string | null;
  theirId: string | null;
  locked: boolean;
  racks: [number, number];
  winner: Side | null;
  /** Side that forfeited this round (no legal player). No SL is used by either side. */
  forfeit?: Side;
  /** Set at lock-in and at the result, for pace-of-play projections. */
  startedAt?: number;
  endedAt?: number;
}

interface MatchState {
  opponent: string;
  tossWinner: Side | null;
  firstDeclarer: Side | null;
  rounds: Round[];
}

interface AppState {
  v: 4;
  active: MatchId;
  tab: Tab;
  matches: Record<MatchId, MatchState>;
  present: Record<string, boolean>;
  sl: Record<string, number>;
  form: Record<string, Form>;
  added: Record<string, Player[]>;
  customTeams: { key: string; name: string }[];
  viewTeam: string | null;
  /** Player who must play round 1 of each match (team call). */
  firstUp: Record<MatchId, string | null>;
  /** Per match: our player id → 0-based index of the first round they can play. Missing means round 1. */
  availableFrom: Record<MatchId, Record<string, number>>;
  /** Team points a forfeited round hands the other side. Confirm with the director. */
  forfeitPoints: 2 | 3;
}

interface LiveRow {
  sl: number;
  w: number;
  l: number;
  played: number;
}

const STORAGE_KEY = 'ticue-toc-2026-09-13-v4';
const HERE_TODAY = ['jason', 'felix', 'fahad', 'tristen', 'mircea', 'umber'];
const FALLBACK_ROUND_MS = 40 * 60 * 1000;
const freshMatch = (opponent: string): MatchState => ({ opponent, tossWinner: null, firstDeclarer: null, rounds: [] });
const DEFAULT_STATE: AppState = {
  v: 4,
  active: 'm10',
  tab: 'match',
  matches: { m10: freshMatch('roc'), m21: freshMatch('wolfpack') },
  present: Object.fromEntries(OUR_TEAM.players.map((p) => [p.id, HERE_TODAY.includes(p.id)])),
  sl: {},
  form: {},
  added: {},
  customTeams: [],
  viewTeam: null,
  firstUp: { m10: 'mircea', m21: null },
  availableFrom: { m10: { tristen: 4 }, m21: {} },
  forfeitPoints: 3,
};

const other = (s: Side): Side => (s === 'us' ? 'them' : 'us');
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`;
const DISPLAY = 'font-[family-name:var(--font-display)]';
const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const firstName = (p: Player) => p.name.split(' ')[0];
const names = (list: Player[]) => list.map(firstName).join(' / ');

/* ============================== small UI pieces ============================== */

function SL({ n, tone = 'dark', size = 'md' }: { n: number; tone?: 'dark' | 'turq' | 'gold'; size?: 'md' | 'lg' }) {
  const tones = {
    dark: 'bg-[#04090A] text-[#FCFCFC] ring-1 ring-[#17393A]',
    turq: 'bg-[#00D8D8] text-[#04090A]',
    gold: 'bg-[#FCC048] text-[#04090A]',
  };
  return (
    <span
      className={`${DISPLAY} inline-flex shrink-0 items-center justify-center rounded-lg font-extrabold tabular-nums ${tones[tone]} ${
        size === 'lg' ? 'h-11 w-11 text-2xl' : 'h-8 w-8 text-lg'
      }`}
    >
      {n}
    </span>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#17393A] bg-[#0A1516] p-4 ${className}`}>{children}</section>;
}

function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`${DISPLAY} text-[13px] font-bold uppercase tracking-[0.16em] text-[#6E9696] ${className}`}>{children}</p>;
}

const THREAT_STYLE: Record<ThreatLevel, string> = {
  Max: 'bg-[#3A1414] text-[#FF7A7A] ring-1 ring-[#6B2626]',
  High: 'bg-[#3A2D0E] text-[#FCC048] ring-1 ring-[#6B5418]',
  Medium: 'bg-[#062B2C] text-[#00D8D8] ring-1 ring-[#0E4E50]',
  Low: 'bg-[#0F2021] text-[#8FB0B0] ring-1 ring-[#17393A]',
};

function ThreatBadge({ level }: { level: ThreatLevel }) {
  return (
    <span className={`${DISPLAY} rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${THREAT_STYLE[level]}`}>
      {level === 'Max' ? '🚨 Max threat' : `${level} threat`}
    </span>
  );
}

const MODE_STYLE: Record<Mode, string> = {
  Chase: 'bg-[#3A1414] text-[#FF7A7A]',
  Balanced: 'bg-[#062B2C] text-[#00D8D8]',
  Protect: 'bg-[#3A2D0E] text-[#FCC048]',
  Clinched: 'bg-[#FCC048] text-[#04090A]',
  Eliminated: 'bg-[#3A1414] text-[#FF7A7A]',
  Final: 'bg-[#0F2021] text-[#FCFCFC]',
};

function ModeChip({ mode }: { mode: Mode }) {
  const label = mode === 'Chase' ? 'Chase mode' : mode === 'Protect' ? 'Protect mode' : mode === 'Balanced' ? 'Balanced' : mode;
  return <span className={`${DISPLAY} rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider ${MODE_STYLE[mode]}`}>{label}</span>;
}

function WinBar({ p }: { p: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#04090A]">
      <div className="h-full rounded-full bg-gradient-to-r from-[#009C9C] to-[#00D8D8]" style={{ width: `${Math.round(p * 100)}%` }} />
    </div>
  );
}

function FormToggle({ value, onChange }: { value: Form | undefined; onChange: (f: Form | undefined) => void }) {
  return (
    <div className="flex gap-1" role="group" aria-label="Today's form">
      {(['hot', 'cold'] as Form[]).map((f) => (
        <button
          key={f}
          onClick={() => onChange(value === f ? undefined : f)}
          aria-pressed={value === f}
          className={`h-8 w-9 rounded-lg text-base ring-1 ${value === f ? (f === 'hot' ? 'bg-[#3A2D0E] ring-[#FCC048]' : 'bg-[#062B2C] ring-[#00D8D8]') : 'bg-[#04090A] ring-[#17393A] opacity-60'}`}
          title={f === 'hot' ? 'Shooting well today' : 'Struggling today'}
        >
          {f === 'hot' ? '🔥' : '❄️'}
        </button>
      ))}
    </div>
  );
}

function SlSelect({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="min-h-10 rounded-lg border border-[#17393A] bg-[#04090A] px-2 text-sm font-bold text-[#FCFCFC]"
    >
      {[2, 3, 4, 5, 6, 7].map((n) => (
        <option key={n} value={n}>
          SL {n}
        </option>
      ))}
    </select>
  );
}

/* ============================== page ============================== */

export default function TocMatchDay() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState<{ status: 'loading' | 'ok' | 'offline'; updated: string | null; rows: Record<string, LiveRow> }>({
    status: 'loading',
    updated: null,
    rows: {},
  });
  const [addName, setAddName] = useState('');
  const [addSl, setAddSl] = useState(4);
  const [addW, setAddW] = useState('');
  const [addL, setAddL] = useState('');
  const [newTeam, setNewTeam] = useState('');
  /** Wall clock for time projections; 0 until mounted so the server and first client render agree. */
  const [now, setNow] = useState(0);
  const history = useRef<AppState[]>([]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  /* ---- persistence (this browser) ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed?.v === 4 && parsed.matches?.m10 && parsed.matches?.m21) setState({ ...DEFAULT_STATE, ...parsed });
      }
    } catch {
      /* storage blocked: start fresh */
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

  /* ---- live data from Supabase (falls back to the built-in snapshot) ---- */
  useEffect(() => {
    let cancelled = false;
    const names = [OUR_TEAM, ...Object.values(TEAMS)].map((t) => t.dbName).filter((n): n is string => !!n);
    supabase
      .from('simi_valley_players')
      .select('name, team_name, skill_level, matches_played, matches_won, losses, scraped_at')
      .in('team_name', names)
      .eq('format', '8ball')
      .eq('is_current', true)
      .then(
        ({ data, error }) => {
          if (cancelled) return;
          if (error || !data) {
            setLive((s) => ({ ...s, status: 'offline' }));
            return;
          }
          const rows: Record<string, LiveRow> = {};
          let updated: string | null = null;
          for (const r of data as {
            name: string;
            team_name: string;
            skill_level: number | null;
            matches_played: number | null;
            matches_won: number | null;
            losses: number | null;
            scraped_at: string | null;
          }[]) {
            const key = `${r.team_name}|${r.name}`;
            const played = r.matches_played ?? 0;
            const prev = rows[key];
            if (!prev || played > prev.played) {
              rows[key] = { sl: r.skill_level ?? prev?.sl ?? 0, w: r.matches_won ?? 0, l: r.losses ?? 0, played };
            }
            if (r.scraped_at && (!updated || r.scraped_at > updated)) updated = r.scraped_at;
          }
          setLive({ status: 'ok', updated, rows });
        },
        () => {
          if (!cancelled) setLive((s) => ({ ...s, status: 'offline' }));
        },
      );
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- state helpers ---- */
  const commit = (next: AppState) => {
    history.current = [...history.current.slice(-60), state];
    setState(next);
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) setState({ ...prev, tab: state.tab });
  };
  const m = state.matches[state.active];
  const updateMatch = (fn: (mm: MatchState) => MatchState) =>
    commit({ ...state, matches: { ...state.matches, [state.active]: fn(state.matches[state.active]) } });
  const setTab = (tab: Tab) => {
    setState({ ...state, tab });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  /* ---- teams and players ---- */
  const teamByKey = (key: string): Team =>
    key === 'tic'
      ? OUR_TEAM
      : TEAMS[key] ?? {
          key,
          name: state.customTeams.find((t) => t.key === key)?.name ?? 'Opponent',
          short: 'OPP',
          number: '',
          note: 'Added today. Add players as they put up.',
          players: [],
        };

  const decorate = (team: Team) => (p: Player): Player => {
    const lr = team.dbName ? live.rows[`${team.dbName}|${p.alias ?? p.name}`] : undefined;
    const liveRecord = lr && lr.played > 0 ? { wins: lr.w, losses: lr.l } : {};
    const liveSl = lr && lr.sl > 0 ? lr.sl : p.sl;
    const availableFrom = team.key === 'tic' ? state.availableFrom?.[state.active]?.[p.id] ?? 0 : 0;
    return { ...p, ...liveRecord, sl: state.sl[p.id] ?? liveSl, form: state.form[p.id], availableFrom };
  };
  const playersOf = (key: string): Player[] => {
    const t = teamByKey(key);
    return [...t.players, ...(state.added[key] ?? [])].map(decorate(t));
  };

  const info = MATCHES[state.active];
  const oppTeam = teamByKey(m.opponent);
  const oppShort = oppTeam.name.replace(/!$/, '');
  const ours = playersOf('tic');
  const theirs = playersOf(m.opponent);
  const everyone = [...ours, ...theirs];
  const byId = (id: string | null) => (id ? everyone.find((p) => p.id === id) ?? null : null);

  /* ---- match state ---- */
  const roundPts = (r: Round): [number, number] => {
    if (r.forfeit === 'us') return [0, state.forfeitPoints];
    if (r.forfeit === 'them') return [state.forfeitPoints, 0];
    if (!r.winner) return [0, 0];
    const o = byId(r.ourId);
    const t = byId(r.theirId);
    return o && t ? matchPoints(r.winner, r.racks, race(o.sl, t.sl)) : [0, 0];
  };
  const done = m.rounds.filter((r) => r.winner);
  const usPts = done.reduce((a, r) => a + roundPts(r)[0], 0);
  const themPts = done.reduce((a, r) => a + roundPts(r)[1], 0);
  const usWins = done.filter((r) => r.winner === 'us').length;
  const themWins = done.length - usWins;
  const last = m.rounds[m.rounds.length - 1];
  const current = last && !last.winner ? last : null;
  const roundIndex = current ? m.rounds.length - 1 : m.rounds.length;
  const roundsLeft = ROUNDS - done.length;
  const roundsAfter = Math.max(0, ROUNDS - roundIndex - 1);
  const declarerFor = (i: number): Side | null => (m.firstDeclarer ? (i % 2 === 0 ? m.firstDeclarer : other(m.firstDeclarer)) : null);
  const declarer = declarerFor(roundIndex);

  const played = m.rounds.filter((r) => !r.forfeit);
  const usedOurs = played.map((r) => r.ourId).filter((x): x is string => !!x);
  const usedTheirs = played.map((r) => r.theirId).filter((x): x is string => !!x);
  const slOf = (id: string) => byId(id)?.sl ?? 0;
  const ourBudget = CAP - usedOurs.reduce((a, id) => a + slOf(id), 0);
  const theirBudget = CAP - usedTheirs.reduce((a, id) => a + slOf(id), 0);
  const ourAvail = ours.filter((p) => state.present[p.id] && !usedOurs.includes(p.id));
  const theirAvail = theirs.filter((p) => !usedTheirs.includes(p.id));
  const ourPick = byId(current?.ourId ?? null);
  const theirPick = byId(current?.theirId ?? null);
  const locked = !!current?.locked;
  const ourPoolNow = ourPick ? [...ourAvail, ourPick] : ourAvail;
  const ourBudgetNow = ourBudget + (ourPick?.sl ?? 0);
  const theirPoolNow = theirPick ? [...theirAvail, theirPick] : theirAvail;
  const theirBudgetNow = theirBudget + (theirPick?.sl ?? 0);

  const strat = strategy(usPts, themPts, roundsLeft);
  const matchOver = strat.mode === 'Clinched' || strat.mode === 'Eliminated' || strat.mode === 'Final';
  const firstUpId = state.firstUp?.[state.active] ?? null;
  const forcedId = roundIndex === 0 && firstUpId && ourPoolNow.some((p) => p.id === firstUpId) ? firstUpId : null;
  const forcedName = forcedId ? byId(forcedId)?.name.split(' ')[0] ?? '' : '';

  /* ---- late arrivals ---- */
  const isLate = (p: Player) => fromOf(p) > roundIndex;
  const latePlayers = ours
    .filter((p) => state.present[p.id] && !usedOurs.includes(p.id) && fromOf(p) > 0 && fromOf(p) >= roundIndex)
    .sort((a, b) => fromOf(a) - fromOf(b));

  const calcKey = JSON.stringify([
    state.active,
    m,
    state.present,
    state.sl,
    state.form,
    state.added,
    state.firstUp,
    state.availableFrom,
    state.forfeitPoints,
    live.updated,
    live.status,
  ]);

  const counters = useMemo<Option[]>(
    () =>
      declarer === 'them' && theirPick && !locked
        ? counterOptions(ourPoolNow, theirAvail, theirPick, roundsAfter, ourBudgetNow, theirBudget, strat.weight, roundIndex)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcKey],
  );
  const putUps = useMemo<Option[]>(
    () =>
      declarer === 'us' && !locked && m.rounds.length < ROUNDS + (current ? 1 : 0)
        ? putUpOptions(ourPoolNow, theirPoolNow, roundsAfter, ourBudgetNow, theirBudgetNow, strat.weight, roundIndex)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcKey],
  );
  const plan = useMemo(() => {
    const planned = forcedId && !ourPick ? byId(forcedId) : current && !ourPick && counters[0]?.legal ? counters[0].player : null;
    const reserve = planned && (current || forcedId) ? planned : null;
    const k = ROUNDS - m.rounds.length - (reserve && !current ? 1 : 0);
    const pool = reserve ? ourAvail.filter((p) => p.id !== reserve.id) : ourAvail;
    const budget = ourBudget - (reserve?.sl ?? 0);
    if (!m.firstDeclarer && !reserve) return future(ours.filter((p) => state.present[p.id]), theirs, ROUNDS, CAP, CAP);
    return future(pool, theirAvail, k, budget, theirBudget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcKey, counters]);

  const lockOthers = (list: Option[]): Option[] =>
    forcedId && list.some((o) => o.player.id === forcedId)
      ? [
          ...list.filter((o) => o.player.id === forcedId),
          ...list.filter((o) => o.player.id !== forcedId).map((o) => ({ ...o, legal: false, lockedOut: true, forfeits: 0 })),
        ]
      : list;
  const shownCounters = lockOthers(counters);
  const shownPutUps = lockOthers(putUps);

  /* ---- legal lineups: rounds we still have to fill, ordered so every late arrival lands in a round they can make ---- */
  const consumed = new Set(m.rounds.map((r, i) => (r.ourId || r.forfeit ? i : -1)).filter((i) => i >= 0));
  const openRounds = Array.from({ length: ROUNDS }, (_, i) => i).filter((i) => !consumed.has(i));
  const lastOpen = openRounds.length ? openRounds[openRounds.length - 1] : -1;
  const lineupPool = ours.filter((p) => state.present[p.id] && !usedOurs.includes(p.id));
  const forcedRounds: Record<number, string> =
    firstUpId && openRounds.includes(0) && lineupPool.some((p) => p.id === firstUpId) ? { 0: firstUpId } : {};
  const usedPlayers = usedOurs.map((id) => byId(id)).filter((p): p is Player => !!p);
  const fullOrders = orderings(lineupPool, openRounds, ourBudget, forcedRounds);
  const fallbackRounds = openRounds.slice(0, -1);
  const fallbackOrders = openRounds.length > 0 ? orderings(lineupPool, fallbackRounds, ourBudget, forcedRounds) : [];
  /** Every legal way to play all remaining rounds (used players included). */
  const legalLineups = uniqueSets(fullOrders).map((set) => [...usedPlayers, ...set]);
  /** Play one fewer and forfeit the last open round. */
  const fallbackLineups = uniqueSets(fallbackOrders).map((set) => [...usedPlayers, ...set]);
  const mustPlay = legalLineups.length ? lineupPool.filter((p) => legalLineups.every((l) => l.some((x) => x.id === p.id))) : [];
  const lineupSl = (l: Player[]) => l.reduce((a, p) => a + p.sl, 0);
  const lineupText = (l: Player[]) =>
    l
      .slice()
      .sort((a, b) => b.sl - a.sl)
      .map((p) => `${firstName(p)} ${p.sl}`)
      .join(' · ');

  /* ---- actions ---- */
  const choose = (side: Side, id: string | null) =>
    updateMatch((mm) => {
      const rounds = [...mm.rounds];
      const lr = rounds[rounds.length - 1];
      if (lr && !lr.winner) {
        const next: Round = side === 'us' ? { ...lr, ourId: id, locked: false } : { ...lr, theirId: id };
        if (!next.ourId && !next.theirId) rounds.pop();
        else rounds[rounds.length - 1] = next;
      } else if (id) {
        const i = rounds.length;
        const dec: Side = mm.firstDeclarer ? (i % 2 === 0 ? mm.firstDeclarer : other(mm.firstDeclarer)) : 'them';
        rounds.push({ declarer: dec, ourId: side === 'us' ? id : null, theirId: side === 'them' ? id : null, locked: false, racks: [0, 0], winner: null });
      }
      return { ...mm, rounds };
    });

  const setLocked = (value: boolean) =>
    updateMatch((mm) => {
      const rounds = [...mm.rounds];
      const lr = rounds[rounds.length - 1];
      if (!lr || lr.winner || !lr.ourId) return mm;
      rounds[rounds.length - 1] = { ...lr, locked: value, startedAt: value ? lr.startedAt ?? Date.now() : lr.startedAt };
      return { ...mm, rounds };
    });

  /** No legal player on `side`: the round is lost by forfeit, no SL is used, and the declarer order moves on. */
  const forfeitRound = (side: Side) => {
    const who = side === 'us' ? 'We' : oppShort;
    const gets = side === 'us' ? oppShort : 'Table I-Cue';
    if (typeof window !== 'undefined' && !window.confirm(`${who} forfeit round ${roundIndex + 1}? ${gets} gets ${state.forfeitPoints} points. Undo can bring it back.`)) return;
    updateMatch((mm) => {
      const rounds = [...mm.rounds];
      const lr = rounds[rounds.length - 1];
      const open = lr && !lr.winner ? lr : null;
      const i = open ? rounds.length - 1 : rounds.length;
      if (i >= ROUNDS) return mm;
      const dec: Side = open ? open.declarer : mm.firstDeclarer ? (i % 2 === 0 ? mm.firstDeclarer : other(mm.firstDeclarer)) : 'them';
      const stamp = Date.now();
      const f: Round = {
        declarer: dec,
        ourId: null,
        theirId: null,
        locked: true,
        racks: [0, 0],
        winner: other(side),
        forfeit: side,
        startedAt: open?.startedAt ?? stamp,
        endedAt: stamp,
      };
      if (open) rounds[i] = f;
      else rounds.push(f);
      return { ...mm, rounds };
    });
  };

  const addRack = (side: Side, delta: 1 | -1) =>
    updateMatch((mm) => {
      const rounds = [...mm.rounds];
      const lr = rounds[rounds.length - 1];
      if (!lr || !lr.ourId || !lr.theirId) return mm;
      const o = byId(lr.ourId);
      const t = byId(lr.theirId);
      if (!o || !t) return mm;
      const target = race(o.sl, t.sl);
      const idx = side === 'us' ? 0 : 1;
      const racks: [number, number] = [lr.racks[0], lr.racks[1]];
      racks[idx] = Math.max(0, Math.min(target[idx], racks[idx] + delta));
      const winner: Side | null = racks[0] >= target[0] ? 'us' : racks[1] >= target[1] ? 'them' : null;
      const endedAt = winner ? (lr.winner ? lr.endedAt : Date.now()) : undefined;
      rounds[rounds.length - 1] = { ...lr, racks, winner, locked: true, startedAt: lr.startedAt ?? Date.now(), endedAt };
      return { ...mm, rounds };
    });

  const reopenLast = () =>
    updateMatch((mm) => {
      const rounds = [...mm.rounds];
      const lr = rounds[rounds.length - 1];
      if (!lr || lr.forfeit) return mm;
      const o = byId(lr.ourId);
      const t = byId(lr.theirId);
      const target = o && t ? race(o.sl, t.sl) : [9, 9];
      rounds[rounds.length - 1] = { ...lr, winner: null, endedAt: undefined, racks: [Math.min(lr.racks[0], target[0] - 1), Math.min(lr.racks[1], target[1] - 1)] };
      return { ...mm, rounds };
    });

  const deleteLast = () => updateMatch((mm) => ({ ...mm, rounds: mm.rounds.slice(0, -1) }));

  const resetMatch = () => {
    if (typeof window !== 'undefined' && !window.confirm(`Reset ${info.label}? This clears the coin toss and every round. Roster and settings stay. Undo can bring it back.`)) return;
    updateMatch((mm) => freshMatch(mm.opponent));
  };

  const resetAll = () => {
    if (typeof window !== 'undefined' && !window.confirm('Reset everything? Both matches, who is here, SL fixes, form taps, and added players go back to this morning. Undo can bring it back.')) return;
    commit({ ...DEFAULT_STATE, tab: 'match' });
  };

  const addPlayer = (teamKey: string) => {
    const name = addName.trim();
    if (!name) return;
    const w = addW === '' ? null : Number(addW);
    const l = addL === '' ? null : Number(addL);
    const p: Player = { id: `x-${Date.now().toString(36)}`, name, sl: addSl, wins: w, losses: l, scout: 'Added today.' };
    commit({ ...state, added: { ...state.added, [teamKey]: [...(state.added[teamKey] ?? []), p] } });
    setAddName('');
    setAddW('');
    setAddL('');
  };

  const addTeam = () => {
    const name = newTeam.trim();
    if (!name) return;
    const key = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36).slice(-3)}`;
    commit({
      ...state,
      customTeams: [...state.customTeams, { key, name }],
      matches: { ...state.matches, m21: { ...state.matches.m21, opponent: key } },
    });
    setNewTeam('');
  };

  /* ---- explanations ---- */
  const bestChanceId = (list: Option[]) =>
    list.filter((o) => o.legal && o.o).reduce<Option | null>((a, b) => (!a || (b.o?.pWin ?? 0) > (a.o?.pWin ?? 0) ? b : a), null)?.player.id;

  /* ---- put-up counter and matchup drawers ---- */
  const capSide = (side: Side, extra: Player | null = null) => {
    const usedIds = [...(side === 'us' ? usedOurs : usedTheirs)];
    const taken = new Set(m.rounds.map((r, i) => ((side === 'us' ? r.ourId : r.theirId) || r.forfeit ? i : -1)).filter((i) => i >= 0));
    if (extra && !usedIds.includes(extra.id)) {
      usedIds.push(extra.id);
      taken.add(roundIndex);
    }
    const open = Array.from({ length: ROUNDS }, (_, i) => i).filter((i) => !taken.has(i));
    const roster = side === 'us' ? ours.filter((p) => state.present[p.id] || usedIds.includes(p.id)) : theirs;
    const up = usedIds.map((id) => byId(id)).filter((p): p is Player => !!p);
    const usedSl = up.reduce((a, p) => a + p.sl, 0);
    const left = CAP - usedSl;
    const k = open.length;
    const remaining = roster.filter((p) => !usedIds.includes(p.id));
    const fits = remaining.filter((p) => canFit(p, remaining.filter((x) => x.id !== p.id), k, left, side === 'us' ? open : undefined));
    const out = remaining.filter((p) => !fits.some((f) => f.id === p.id));
    return { up, usedSl, left, k, fits, out };
  };

  const answersFor = (c: Player) => {
    const k = ROUNDS - roundIndex;
    return theirAvail
      .filter((r) => r.sl <= theirBudget && canComplete(theirAvail.filter((x) => x.id !== r.id), k - 1, theirBudget - r.sl))
      .map((r) => ({ r, o: outlook(c, r) }))
      .sort((a, b) => a.o.swing - b.o.swing);
  };

  const winTone = (p: number) => (p < 0.4 ? 'text-[#FF7A7A]' : p < 0.55 ? 'text-[#FCC048]' : 'text-[#00D8D8]');

  const nameChip = (p: Player, tone: 'up' | 'fit' | 'out') => (
    <span
      key={p.id}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        tone === 'up'
          ? 'bg-[#0F2021] text-[#FCFCFC] ring-1 ring-[#17393A]'
          : tone === 'fit'
            ? 'bg-[#062B2C] text-[#00D8D8]'
            : 'bg-[#3A1414] text-[#FF7A7A] line-through'
      }`}
    >
      {p.name.split(' ')[0]} {p.sl}
      {tone !== 'up' && isLate(p) && <span className="opacity-75">· from R{fromOf(p) + 1}</span>}
    </span>
  );

  const capCounter = () => (
    <div className="grid grid-cols-2 gap-2">
      {([
        ['us', OUR_TEAM.short],
        ['them', oppTeam.short],
      ] as [Side, string][]).map(([side, label]) => {
        const c = capSide(side);
        return (
          <div key={side} className={`rounded-2xl border p-3 ${side === 'us' ? 'border-[#0E4E50] bg-[#051819]' : 'border-[#17393A] bg-[#0A1516]'}`}>
            <p className={`${DISPLAY} text-xs font-bold uppercase tracking-widest ${side === 'us' ? 'text-[#00D8D8]' : 'text-[#6E9696]'}`}>{label} put-ups</p>
            <p className={`${DISPLAY} mt-0.5 text-4xl font-extrabold leading-none tabular-nums text-[#FCFCFC]`}>
              {c.usedSl}
              <span className="text-lg text-[#6E9696]">/23</span>
            </p>
            <p className="mt-1 text-xs tabular-nums text-[#9FBDBD]">
              {c.left} left · {c.k} to play{c.k > 0 ? ` · avg ${(c.left / c.k).toFixed(1)}` : ''}
            </p>
            {c.up.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.up.map((p) => nameChip(p, 'up'))}</div>}
            {c.k > 0 && (
              <>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-[#6E9696]">Can still play</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.fits.length ? c.fits.map((p) => nameChip(p, 'fit')) : <span className="text-xs text-[#FF7A7A]">nobody fits</span>}
                </div>
                {c.out.length > 0 && (
                  <>
                    <p className="mt-2 text-[10px] uppercase tracking-wider text-[#6E9696]">Can&apos;t fit</p>
                    <div className="mt-1 flex flex-wrap gap-1">{c.out.map((p) => nameChip(p, 'out'))}</div>
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  const statBlock = (p: Player, isOurs: boolean) => {
    const c = combined(p);
    const summer =
      p.wins != null && p.losses != null && p.wins + p.losses > 0 ? `${p.wins}-${p.losses} (${pct(p.wins / (p.wins + p.losses))})` : 'no record';
    return (
      <div className="min-w-0 rounded-xl bg-[#04090A] p-2.5">
        <div className="flex items-center gap-2">
          <SL n={p.sl} tone={isOurs ? 'turq' : 'dark'} />
          <p className="min-w-0 truncate text-sm font-semibold text-[#FCFCFC]">{p.name}</p>
        </div>
        {!isOurs && (
          <div className="mt-1.5">
            <ThreatBadge level={threat(p)} />
          </div>
        )}
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
          <dt className="text-[#6E9696]">Summer</dt>
          <dd className="text-right tabular-nums text-[#FCFCFC]">{summer}</dd>
          {c && (p.otherTeams?.length ?? 0) > 0 && (
            <>
              <dt className="text-[#6E9696]">All 8-ball</dt>
              <dd className="text-right tabular-nums text-[#FCFCFC]">
                {c.w}-{c.l}
              </dd>
            </>
          )}
          {p.recent && (
            <>
              <dt className="text-[#6E9696]">Last 4 wks</dt>
              <dd className="text-right tabular-nums text-[#FCFCFC]">
                {p.recent.w}-{p.recent.l}
              </dd>
            </>
          )}
          {p.form && (
            <>
              <dt className="text-[#6E9696]">Today</dt>
              <dd className="text-right">{p.form === 'hot' ? '🔥' : '❄️'}</dd>
            </>
          )}
        </dl>
        {p.scout && <p className="mt-2 text-[11px] leading-snug text-[#9FBDBD]">{p.scout}</p>}
      </div>
    );
  };

  const outcomeGrid = (o: Outlook) => (
    <div className="grid grid-cols-3 gap-1 text-center text-[11px] tabular-nums">
      {([
        ['Win 3-0', o.win30, true],
        ['Win 2-0', o.win20, true],
        ['Win 2-1', o.win21, true],
        ['Lose 1-2', o.lose12, false],
        ['Lose 0-2', o.lose02, false],
        ['Lose 0-3', o.lose03, false],
      ] as [string, number, boolean][]).map(([label, v, win]) => (
        <div key={label} className={`rounded-lg px-1 py-1.5 ${win ? 'bg-[#062B2C] text-[#00D8D8]' : 'bg-[#1C0B0B] text-[#FF9A9A]'}`}>
          <p className={`${DISPLAY} text-base font-extrabold`}>{pct(v)}</p>
          <p className="text-[10px] opacity-80">{label}</p>
        </div>
      ))}
    </div>
  );

  const drawer = (o: Option, vs: Player | null) => {
    const c = o.player;
    const after = capSide('us', c);
    const answers = vs ? [] : answersFor(c);
    return (
      <div className="border-t border-[#17393A] px-3 pb-3 pt-3">
        {vs && o.o ? (
          <>
            <Eyebrow>Matchup</Eyebrow>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {statBlock(c, true)}
              {statBlock(vs, false)}
            </div>
            <p className="mt-2 text-center text-sm text-[#9FBDBD]">
              Race {o.o.race[0]}-{o.o.race[1]} · <span className={`font-semibold ${winTone(o.o.pWin)}`}>{pct(o.o.pWin)} to win</span>
            </p>
            <div className="mt-2">{outcomeGrid(o.o)}</div>
          </>
        ) : (
          <>
            <Eyebrow>If we put up {c.name.split(' ')[0]} · every answer they have</Eyebrow>
            <p className="mt-1 text-xs text-[#6E9696]">Toughest for us first. Tap any player for both stat lines.</p>
            <div className="mt-2 grid gap-1.5">
              {answers.map(({ r, o: ro }, idx) => (
                <details key={r.id} className="rounded-xl bg-[#04090A]">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2">
                    <SL n={r.sl} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#FCFCFC]">
                        {r.name}
                        {idx < 3 && <span className="ml-1.5 text-[10px] font-bold uppercase text-[#FCC048]">likely</span>}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6E9696]">
                        {record(r)} <ThreatBadge level={threat(r)} />
                      </span>
                    </span>
                    <span className="text-right">
                      <span className={`${DISPLAY} block text-xl font-extrabold tabular-nums ${winTone(ro.pWin)}`}>{pct(ro.pWin)}</span>
                      <span className="block text-[10px] text-[#6E9696]">
                        race {ro.race[0]}-{ro.race[1]}
                      </span>
                    </span>
                  </summary>
                  <div className="grid gap-2 px-2.5 pb-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      {statBlock(c, true)}
                      {statBlock(r, false)}
                    </div>
                    {outcomeGrid(ro)}
                  </div>
                </details>
              ))}
              {answers.length === 0 && <p className="text-sm text-[#6E9696]">No {oppShort} players on file.</p>}
            </div>
          </>
        )}
        <div className="mt-3 rounded-xl border border-[#0E4E50] bg-[#051819] p-2.5 text-xs">
          <p className="text-[#FCFCFC]">
            After {c.name.split(' ')[0]}:{' '}
            <span className="tabular-nums">
              {after.usedSl}/23 used · {after.left} left for {after.k}
            </span>
          </p>
          {after.k > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {after.fits.map((p) => nameChip(p, 'fit'))}
              {after.out.map((p) => nameChip(p, 'out'))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const toughest = (c: Player) =>
    answersFor(c)
      .slice(0, 3)
      .map(({ r, o: ro }) => `${r.name.split(' ')[0]} ${pct(ro.pWin)}`)
      .join(' · ');

  const reasonFor = (o: Option, list: Option[], vs: Player | null): string => {
    const p = o.player;
    const first = p.name.split(' ')[0];
    if (o.lockedOut) return `${forcedName} plays round 1 by team call. Available from round 2.`;
    if (!o.legal) return 'Would break the 23 cap for the rest of our lineup.';
    const isTop = list[0]?.player.id === p.id;
    if (!vs) {
      const t = toughest(p);
      const lead = forcedId === p.id ? 'Plays round 1 by team call. ' : isTop ? 'Holds up best against every answer. ' : '';
      return `${lead}Toughest answers: ${t || 'none on file'}.`;
    }
    if (!o.o) return 'No data on their roster yet. Ranked by our record only.';
    if (forcedId === p.id) return `Plays round 1 by team call. ${pct(o.o.pWin)} to win against ${vs.name.split(' ')[0]}.`;
    if (vs.avoid?.includes(p.id)) return `Avoid. ${vs.name} is ${record(vs)} and this is exactly their best spot.`;
    const bc = bestChanceId(list);
    if (p.sl <= 3 && vs.sl >= 6) {
      return `Trap play: ${vs.name} must win ${o.o.race[1]}, ${first} needs ${o.o.race[0]}. Spends their ${vs.sl} on our ${p.sl}${isTop ? ' and keeps our best for later.' : '.'}`;
    }
    if (strat.mode === 'Chase' && isTop) return 'Chase mode: highest point swing right now. Nothing held back.';
    if (isTop && bc && bc !== p.id) {
      const bcName = list.find((x) => x.player.id === bc)?.player.name.split(' ')[0];
      return `Saves ${bcName} for a bigger spot later. Best result across the rest of the match.`;
    }
    if (isTop) return 'Best chance and best point swing, and our lineup stays legal.';
    if (bc === p.id) return 'Highest win chance this round, but costs us later in the match.';
    return `Expected points ${signed(o.o.swing)} this round.`;
  };

  /* ============================== render helpers ============================== */

  const OptionCard = ({ o, i, list, vs }: { o: Option; i: number; list: Option[]; vs: Player | null }) => {
    const top = i === 0 && o.legal;
    const bc = bestChanceId(list) === o.player.id && !top;
    const avoid = !!vs?.avoid?.includes(o.player.id);
    const selected = current?.ourId === o.player.id;
    return (
      <div
        className={`overflow-hidden rounded-2xl border transition ${
          selected
            ? 'border-[#FCC048] bg-[#1A1606] ring-2 ring-[#FCC048]'
            : top
              ? 'border-[#00D8D8] bg-[#062B2C]'
              : avoid
                ? 'border-[#6B2626] bg-[#0F2021]'
                : 'border-[#17393A] bg-[#0F2021]'
        } ${!o.legal ? 'opacity-40' : ''}`}
      >
        <button
          onClick={() => choose('us', selected ? null : o.player.id)}
          disabled={!o.legal}
          aria-expanded={selected}
          className="w-full p-3 text-left active:scale-[0.99]"
        >
          <div className="flex items-start gap-3">
            <SL n={o.player.sl} tone={selected ? 'gold' : top ? 'turq' : 'dark'} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-[#FCFCFC]">{o.player.name}</span>
                {top && <span className={`${DISPLAY} rounded-full bg-[#00D8D8] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#04090A]`}>Recommended</span>}
                {bc && <span className={`${DISPLAY} rounded-full bg-[#3A2D0E] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#FCC048]`}>Best chance</span>}
                {avoid && <span className={`${DISPLAY} rounded-full bg-[#3A1414] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#FF7A7A]`}>Avoid</span>}
                {o.player.form === 'hot' && <span aria-label="hot today">🔥</span>}
                {o.player.form === 'cold' && <span aria-label="cold today">❄️</span>}
              </div>
              <p className={`mt-0.5 text-sm leading-snug ${top ? 'text-[#BFF3F3]' : 'text-[#9FBDBD]'}`}>{reasonFor(o, list, vs)}</p>
            </div>
            {o.legal && o.o && (
              <div className="text-right">
                <div className={`${DISPLAY} text-3xl font-extrabold leading-none tabular-nums text-[#FCFCFC]`}>{pct(o.o.pWin)}</div>
                <div className="mt-1 text-[11px] text-[#6E9696]">
                  race {o.o.race[0]}-{o.o.race[1]}
                  {!vs && o.response ? ` vs ${o.response.name.split(' ')[0]}` : ''}
                </div>
              </div>
            )}
          </div>
          {o.legal && o.o && (
            <div className="mt-2.5 grid gap-1.5">
              <WinBar p={o.o.pWin} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-[#6E9696]">
                <span>3-0 win {pct(o.o.win30)}</span>
                <span>2-1 loss {pct(o.o.lose12)}</span>
                <span className="text-[#9FBDBD]">points {signed(o.o.swing)}</span>
                <span className="ml-auto font-semibold text-[#FCC048]">{selected ? 'Hide ▴' : 'Matchups ▾'}</span>
              </div>
            </div>
          )}
        </button>
        {selected && o.legal && drawer(o, vs)}
      </div>
    );
  };

  const TheirGrid = ({ vsOurs }: { vsOurs: Player | null }) => {
    const k = ROUNDS - roundIndex;
    const sorted = [...theirAvail].sort((a, b) => b.sl - a.sl || a.name.localeCompare(b.name));
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {sorted.map((p) => {
          const legal = p.sl <= theirBudgetNow && canComplete(theirPoolNow.filter((x) => x.id !== p.id), k - 1, theirBudgetNow - p.sl);
          const o = vsOurs ? outlook(vsOurs, p) : null;
          return (
            <button
              key={p.id}
              onClick={() => choose('them', p.id)}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#17393A] bg-[#0F2021] px-3 py-2 text-left active:scale-[0.99]"
            >
              <SL n={p.sl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[#FCFCFC]">
                  {p.name} {p.form === 'hot' ? '🔥' : p.form === 'cold' ? '❄️' : ''}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#6E9696]">
                  {record(p)} <ThreatBadge level={threat(p)} />
                  {!legal && <span className="text-[#FCC048]">cap</span>}
                </span>
              </span>
              {o && (
                <span className="text-right">
                  <span className={`${DISPLAY} block text-xl font-extrabold tabular-nums text-[#FCFCFC]`}>{pct(o.pWin)}</span>
                  <span className="block text-[10px] text-[#6E9696]">
                    {o.race[0]}-{o.race[1]} · us
                  </span>
                </span>
              )}
            </button>
          );
        })}
        {sorted.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#17393A] p-3 text-sm text-[#9FBDBD] sm:col-span-2">
            No {oppShort} players on file. Add them in <button className="underline" onClick={() => setTab('setup')}>Setup</button> as they put up.
          </div>
        )}
      </div>
    );
  };

  const counterFor = (p: Player, teamKey: string): Option[] => {
    const isCurrent = teamKey === m.opponent;
    if (isCurrent && !usedTheirs.includes(p.id)) {
      return counterOptions(ourPoolNow, theirPoolNow.filter((x) => x.id !== p.id), p, roundsAfter, ourBudgetNow, theirBudgetNow - p.sl, strat.weight, roundIndex);
    }
    const pool = ours.filter((x) => state.present[x.id]);
    return counterOptions(pool, playersOf(teamKey).filter((x) => x.id !== p.id), p, ROUNDS - 1, CAP, CAP - p.sl, 0.5);
  };

  /* ---- forfeits ---- */
  const kNow = ROUNDS - roundIndex;
  const theirLegalNow = theirAvail.filter(
    (p) => p.sl <= theirBudgetNow && canComplete(theirPoolNow.filter((x) => x.id !== p.id), kNow - 1, theirBudgetNow - p.sl),
  );
  const forfeitButton = (side: Side, prominent: boolean) => (
    <button
      onClick={() => forfeitRound(side)}
      className={
        prominent
          ? `${DISPLAY} mt-3 w-full rounded-xl bg-[#3A1414] py-3 text-base font-extrabold uppercase text-[#FF7A7A] ring-1 ring-[#6B2626]`
          : 'mt-3 w-full rounded-lg border border-[#6B2626] py-2 text-xs font-semibold text-[#FF7A7A]'
      }
    >
      {side === 'us' ? 'Forfeit this round (no legal player)' : `They forfeit${prominent ? ' (no legal player)' : ''}`}
    </button>
  );

  /* ---- pace of play, for the late arrival's round ---- */
  const durations = m.rounds
    .filter((r) => r.winner && !r.forfeit && r.startedAt && r.endedAt && r.endedAt > r.startedAt)
    .map((r) => (r.endedAt as number) - (r.startedAt as number));
  const avgRoundMs = durations.length
    ? Math.min(120 * 60_000, Math.max(5 * 60_000, durations.reduce((a, b) => a + b, 0) / durations.length))
    : FALLBACK_ROUND_MS;
  const scheduledMs = (() => {
    const mt = /(\d+):(\d+)\s*(AM|PM)/i.exec(info.time);
    if (!mt || !now) return 0;
    const d = new Date(now);
    d.setHours((Number(mt[1]) % 12) + (/pm/i.test(mt[3]) ? 12 : 0), Number(mt[2]), 0, 0);
    return d.getTime();
  })();
  /** Projected start of round `idx` (0-based): the running round (or now) plus one average round per round in between. */
  const roundStartEstimate = (idx: number): number | null => {
    if (!now) return null;
    const base = current?.locked && current.startedAt ? current.startedAt : Math.max(now, scheduledMs);
    return base + avgRoundMs * Math.max(0, idx - roundIndex);
  };

  const TimingCard = () => {
    const late = latePlayers[0];
    if (!late) return null;
    const lateRound = fromOf(late);
    const forkRound = lateRound - 1;
    const forkPos = openRounds.indexOf(forkRound);
    const fbPos = fallbackRounds.indexOf(forkRound);
    const distinct = (list: Player[]) => list.filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i);
    const forkA = forkPos >= 0 ? distinct(fullOrders.map((o) => o[forkPos])) : [];
    const forkB = fbPos >= 0 ? distinct(fallbackOrders.map((o) => o[fbPos])).filter((p) => !forkA.some((a) => a.id === p.id)) : [];
    const est = roundStartEstimate(lateRound);
    const ways = (n: number) => `${n} way${n === 1 ? '' : 's'}`;
    return (
      <Card className="border-[#6B5418]">
        <Eyebrow>Timing · {firstName(late)} arrives late</Eyebrow>
        <p className={`${DISPLAY} mt-1 text-2xl font-extrabold uppercase leading-tight text-[#FCFCFC]`}>
          {roundIndex >= lateRound ? `${firstName(late)} can play now (round ${lateRound + 1})` : `${firstName(late)} is needed for round ${lateRound + 1}`}
        </p>
        {late.scout && <p className="mt-1 text-xs text-[#9FBDBD]">{late.scout}</p>}
        <div className="mt-3 grid gap-1.5 text-sm">
          <p className={legalLineups.length ? 'text-[#00D8D8]' : 'text-[#FF7A7A]'}>
            {legalLineups.length ? `Full five still legal · ${ways(legalLineups.length)}.` : 'No legal full five left.'}
            {openRounds.length > 0 && (
              <span className="text-[#9FBDBD]">
                {' '}
                {fallbackLineups.length ? ways(fallbackLineups.length) : 'No way'} to play {usedPlayers.length + fallbackRounds.length} and forfeit R{lastOpen + 1}.
              </span>
            )}
          </p>
          {roundIndex <= forkRound && forkPos >= 0 && (
            <p className="text-[#FCFCFC]">
              <span className="font-semibold text-[#FCC048]">
                Round {forkRound + 1}
                {roundIndex === forkRound ? ' (now)' : ''}:
              </span>{' '}
              {forkA.length ? `play ${names(forkA)} and keep ${firstName(late)} for R${lateRound + 1}` : 'no pick keeps the full five'}
              {forkB.length ? `, or play ${names(forkB)} and forfeit R${lastOpen + 1}.` : '.'}
            </p>
          )}
          <p className="text-[#9FBDBD]">
            {est !== null && (
              <>
                <span className="font-semibold text-[#FCFCFC]">
                  R{lateRound + 1} est. ~{fmtTime(est)}
                </span>
                {' · '}
              </>
            )}
            {durations.length
              ? `avg ${Math.round(avgRoundMs / 60_000)} min over ${durations.length} round${durations.length === 1 ? '' : 's'}`
              : 'assuming 40 min per round'}
          </p>
        </div>
      </Card>
    );
  };

  /* ============================== tabs ============================== */

  const MatchTab = (
    <div className="grid gap-3">
      {info.opponents.length > 1 && (
        <Card>
          <Eyebrow>Match #21 opponent · winner of Match #9</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...info.opponents, ...state.customTeams.map((t) => t.key)].map((k) => (
              <button
                key={k}
                onClick={() => commit({ ...state, matches: { ...state.matches, m21: { ...state.matches.m21, opponent: k } } })}
                aria-pressed={m.opponent === k}
                className={`${DISPLAY} rounded-xl border px-4 py-2.5 text-base font-bold uppercase tracking-wide ${
                  m.opponent === k ? 'border-[#00D8D8] bg-[#062B2C] text-[#FCFCFC]' : 'border-[#17393A] bg-[#0F2021] text-[#9FBDBD]'
                }`}
              >
                {teamByKey(k).name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {!m.firstDeclarer && (
        <Card className="border-[#0E4E50]">
          <Eyebrow>Step 1 · Coin toss</Eyebrow>
          <h2 className={`${DISPLAY} mt-1 text-3xl font-extrabold uppercase text-[#FCFCFC]`}>Who won the toss?</h2>
          <p className="mt-2 rounded-xl border border-[#6B5418] bg-[#1A1606] px-3 py-2 text-sm text-[#FCC048]">
            <span className="font-semibold">If we win: make {oppShort} put up first.</span>{' '}
            {firstUpId
              ? `${byId(firstUpId)?.name.split(' ')[0]} still plays round 1 but stays hidden, they only counter in rounds 2 and 4, and we get the last counter-pick in round 5.`
              : 'We counter in rounds 1, 3 and 5, including the last pick of the match.'}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['us', 'them'] as Side[]).map((s) => (
              <button
                key={s}
                onClick={() => updateMatch((mm) => ({ ...mm, tossWinner: s }))}
                aria-pressed={m.tossWinner === s}
                className={`${DISPLAY} min-h-16 rounded-2xl border text-xl font-extrabold uppercase ${
                  m.tossWinner === s ? 'border-[#00D8D8] bg-[#062B2C] text-[#FCFCFC]' : 'border-[#17393A] bg-[#0F2021] text-[#9FBDBD]'
                }`}
              >
                {s === 'us' ? 'We won' : `${oppShort} won`}
              </button>
            ))}
          </div>
          {m.tossWinner && (
            <>
              <h3 className={`${DISPLAY} mt-5 text-xl font-bold uppercase text-[#FCFCFC]`}>Who puts up first in round 1?</h3>
              {m.tossWinner === 'us' && (
                <p className="mt-1 text-sm text-[#FCC048]">
                  {firstUpId
                    ? `Recommended: make them put up first. ${byId(firstUpId)?.name.split(' ')[0]} plays round 1 either way, so they can't pick a matchup against ${byId(firstUpId)?.name.split(' ')[0]}. We counter in rounds 3 and 5.`
                    : 'Recommended: make them put up first. We get the counter-pick in rounds 1, 3 and 5.'}
                </p>
              )}
              {m.tossWinner === 'them' && firstUpId && (
                <p className="mt-1 text-sm text-[#FF7A7A]">
                  If they make us put up first, {byId(firstUpId)?.name.split(' ')[0]} is revealed in round 1 and they get to counter.
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateMatch((mm) => ({ ...mm, firstDeclarer: 'them' }))}
                  className={`min-h-14 rounded-2xl border px-2 font-semibold ${
                    m.tossWinner === 'us' ? 'border-[#FCC048] bg-[#1A1606] text-[#FCC048]' : 'border-[#17393A] bg-[#0F2021] text-[#FCFCFC]'
                  }`}
                >
                  {oppShort} puts up first
                </button>
                <button onClick={() => updateMatch((mm) => ({ ...mm, firstDeclarer: 'us' }))} className="min-h-14 rounded-2xl border border-[#17393A] bg-[#0F2021] px-2 font-semibold text-[#FCFCFC]">
                  We put up first
                </button>
              </div>
            </>
          )}
        </Card>
      )}

      {roundIndex === 0 && firstUpId && (
        <div className="rounded-2xl border border-[#6B5418] bg-[#1A1606] p-3 text-sm text-[#FCC048]">
          <p>
            <span className="font-semibold">{byId(firstUpId)?.name}</span> plays round 1 (team call).
          </p>
          {mustPlay.filter((p) => p.id !== firstUpId).length > 0 && (
            <p className="mt-0.5 text-[#E8D39A]">
              Cap check: {mustPlay.filter((p) => p.id !== firstUpId).map((p) => p.name.split(' ')[0]).join(' and ')} must play this match. {legalLineups.length} legal lineups left (see Plan).
            </p>
          )}
        </div>
      )}

      {m.firstDeclarer && (
        <div className={`rounded-2xl border p-3 ${strat.mode === 'Chase' ? 'border-[#6B2626] bg-[#1C0B0B]' : strat.mode === 'Protect' || strat.mode === 'Clinched' ? 'border-[#6B5418] bg-[#1A1606]' : 'border-[#0E4E50] bg-[#051819]'}`} aria-live="polite">
          <div className="flex items-center gap-2">
            <ModeChip mode={strat.mode} />
            <span className="text-sm font-semibold text-[#FCFCFC]">{strat.headline}</span>
          </div>
          {strat.detail && <p className="mt-1.5 text-sm text-[#9FBDBD]">{strat.detail}</p>}
        </div>
      )}

      {m.firstDeclarer && !matchOver && latePlayers.length > 0 && <TimingCard />}

      {m.firstDeclarer && capCounter()}

      {m.firstDeclarer && !matchOver && roundIndex < ROUNDS && (
        <Card>
          <div className="flex items-baseline justify-between gap-2">
            <Eyebrow>
              Round {roundIndex + 1} of {ROUNDS} · {declarer === 'us' ? 'we put up first' : `${oppShort} puts up first`}
            </Eyebrow>
            <span className="text-xs tabular-nums text-[#6E9696]">
              cap {ourBudgetNow} vs {theirBudgetNow}
            </span>
          </div>

          {ourPick && theirPick && locked && current ? (
            (() => {
              const target = race(ourPick.sl, theirPick.sl);
              const o = outlook(ourPick, theirPick);
              return (
                <div className="mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['us', ourPick, target[0], current.racks[0]],
                      ['them', theirPick, target[1], current.racks[1]],
                    ] as [Side, Player, number, number][]).map(([side, p, goal, have]) => (
                      <div key={side} className={`rounded-2xl border p-3 ${side === 'us' ? 'border-[#0E4E50] bg-[#062B2C]' : 'border-[#17393A] bg-[#0F2021]'}`}>
                        <p className={`${DISPLAY} text-xs font-bold uppercase tracking-widest ${side === 'us' ? 'text-[#00D8D8]' : 'text-[#6E9696]'}`}>
                          {side === 'us' ? OUR_TEAM.short : oppTeam.short}
                        </p>
                        <p className="mt-0.5 truncate font-semibold text-[#FCFCFC]">
                          {p.name.split(' ')[0]} <span className="text-[#6E9696]">({p.sl})</span>
                        </p>
                        <p className={`${DISPLAY} mt-1 text-6xl font-extrabold leading-none tabular-nums text-[#FCFCFC]`}>
                          {have}
                          <span className="text-2xl text-[#6E9696]">/{goal}</span>
                        </p>
                        <div className="mt-2 flex gap-1">
                          {Array.from({ length: goal }, (_, i) => (
                            <span key={i} className={`h-2 flex-1 rounded-full ${i < have ? (side === 'us' ? 'bg-[#00D8D8]' : 'bg-[#FF7A7A]') : 'bg-[#04090A]'}`} />
                          ))}
                        </div>
                        <button
                          onClick={() => addRack(side, 1)}
                          className={`${DISPLAY} mt-3 min-h-20 w-full rounded-2xl text-2xl font-extrabold uppercase active:scale-[0.98] ${
                            side === 'us' ? 'bg-[#00D8D8] text-[#04090A]' : 'bg-[#FCFCFC] text-[#04090A]'
                          }`}
                        >
                          + Rack
                        </button>
                        <button onClick={() => addRack(side, -1)} className="mt-2 w-full rounded-lg border border-[#17393A] py-1.5 text-xs font-semibold text-[#9FBDBD]">
                          − Remove rack
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-sm text-[#9FBDBD]">
                    Race {target[0]}-{target[1]} · {pct(o.pWin)} for us · hill for {theirPick.name.split(' ')[0]} at {target[1] - 1} means a loss still earns us 1 point
                  </p>
                  {current.racks[0] === 0 && current.racks[1] === 0 && (
                    <button onClick={() => setLocked(false)} className="mt-2 w-full rounded-lg border border-[#17393A] py-2 text-xs font-semibold text-[#9FBDBD]">
                      Unlock and change our player
                    </button>
                  )}
                </div>
              );
            })()
          ) : declarer === 'them' ? (
            !theirPick ? (
              <>
                <h2 className={`${DISPLAY} mt-2 text-2xl font-extrabold uppercase text-[#FCFCFC]`}>Who did {oppShort} put up?</h2>
                <TheirGrid vsOurs={null} />
                {forfeitButton('them', theirLegalNow.length === 0)}
              </>
            ) : (
              <>
                <div className="mt-2 flex items-center gap-3">
                  <SL n={theirPick.sl} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#6E9696]">They put up</p>
                    <p className={`${DISPLAY} truncate text-2xl font-extrabold uppercase text-[#FCFCFC]`}>{theirPick.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#6E9696]">
                      {record(theirPick)} <ThreatBadge level={threat(theirPick)} />
                    </div>
                  </div>
                  <button onClick={() => choose('them', null)} className="rounded-lg border border-[#17393A] px-2.5 py-1.5 text-xs text-[#9FBDBD]">
                    Change
                  </button>
                </div>
                {theirPick.scout && <p className="mt-2 rounded-xl bg-[#0F2021] px-3 py-2 text-sm text-[#9FBDBD]">{theirPick.scout}</p>}
                <Eyebrow className="mt-4">All our options · tap one, then lock in</Eyebrow>
                <div className="mt-2 grid gap-2">
                  {shownCounters.map((o, i, list) => (
                    <OptionCard key={o.player.id} o={o} i={i} list={list} vs={theirPick} />
                  ))}
                </div>
                {forfeitButton('us', !shownCounters.some((o) => o.legal))}
              </>
            )
          ) : !locked ? (
            <>
              <h2 className={`${DISPLAY} mt-2 text-2xl font-extrabold uppercase text-[#FCFCFC]`}>Our put-up</h2>
              <p className="mt-0.5 text-sm text-[#9FBDBD]">Each option assumes their most damaging answer. Tap one, then lock in.</p>
              <div className="mt-3 grid gap-2">
                {shownPutUps.map((o, i, list) => (
                  <OptionCard key={o.player.id} o={o} i={i} list={list} vs={null} />
                ))}
              </div>
              {forfeitButton('us', !shownPutUps.some((o) => o.legal))}
            </>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-3">
                <SL n={ourPick?.sl ?? 0} tone="gold" size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#6E9696]">We put up</p>
                  <p className={`${DISPLAY} truncate text-2xl font-extrabold uppercase text-[#FCFCFC]`}>{ourPick?.name}</p>
                </div>
                <button onClick={() => setLocked(false)} className="rounded-lg border border-[#17393A] px-2.5 py-1.5 text-xs text-[#9FBDBD]">
                  Unlock
                </button>
              </div>
              <h3 className={`${DISPLAY} mt-4 text-xl font-bold uppercase text-[#FCFCFC]`}>Who did they answer with?</h3>
              <TheirGrid vsOurs={ourPick} />
              {forfeitButton('them', theirLegalNow.length === 0)}
            </>
          )}
        </Card>
      )}

      {m.firstDeclarer && current?.ourId && !locked && ourPick && (
        <div className="sticky bottom-[84px] z-20 rounded-2xl border border-[#FCC048] bg-[#1A1606]/95 p-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <SL n={ourPick.sl} tone="gold" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-semibold text-[#FCFCFC]">{ourPick.name}</p>
              <p className="text-xs text-[#FCC048]">
                {theirPick ? `race ${race(ourPick.sl, theirPick.sl).join('-')} · ${pct(outlook(ourPick, theirPick).pWin)} to win` : 'waiting on their answer after lock-in'}
              </p>
            </div>
            <button onClick={() => choose('us', null)} className="rounded-lg px-2 py-2 text-xs text-[#9FBDBD]">
              Clear
            </button>
            <button onClick={() => setLocked(true)} className={`${DISPLAY} rounded-xl bg-[#FCC048] px-5 py-3 text-lg font-extrabold uppercase text-[#04090A]`}>
              Lock in
            </button>
          </div>
        </div>
      )}

      {(matchOver || (m.rounds.length >= ROUNDS && !current)) && m.firstDeclarer && (
        <Card className={usPts > themPts ? 'border-[#FCC048]' : 'border-[#6B2626]'}>
          <Eyebrow>{info.label} result</Eyebrow>
          <p className={`${DISPLAY} mt-1 text-4xl font-extrabold uppercase text-[#FCFCFC]`}>
            {usPts > themPts ? 'Table I-Cue wins' : usPts < themPts ? `${oppShort} wins` : 'Tied on points'} {usPts}-{themPts}
          </p>
          <p className="mt-1 text-sm text-[#9FBDBD]">
            Individual matches {usWins}-{themWins}.{usPts === themPts ? ' Tiebreak goes to more individual wins.' : ''}
          </p>
          {state.active === 'm10' && usPts > themPts && (
            <button
              onClick={() => commit({ ...state, active: 'm21', tab: 'setup' })}
              className={`${DISPLAY} mt-3 w-full rounded-xl bg-[#FCC048] py-3 text-lg font-extrabold uppercase text-[#04090A]`}
            >
              On to Match #21 · set form and opponent
            </button>
          )}
        </Card>
      )}

      {m.rounds.length > 0 && (
        <Card>
          <Eyebrow>Rounds</Eyebrow>
          <ol className="mt-2 grid gap-2">
            {m.rounds.map((r, i) => {
              const o = byId(r.ourId);
              const t = byId(r.theirId);
              const pts = roundPts(r);
              const isLast = i === m.rounds.length - 1;
              return (
                <li key={i} className="flex items-center gap-3 rounded-xl border border-[#17393A] bg-[#0F2021] px-3 py-2">
                  <span className={`${DISPLAY} w-5 text-lg font-extrabold tabular-nums text-[#6E9696]`}>{i + 1}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    {r.forfeit ? (
                      <>
                        <span className={`${DISPLAY} font-extrabold uppercase tracking-wider text-[#FF7A7A]`}>Forfeit</span>
                        <span className="text-[#FCFCFC]"> · {r.forfeit === 'us' ? 'we had no legal player' : `${oppShort} had no legal player`}</span>
                        <span className="block text-xs text-[#6E9696]">
                          {r.declarer === 'us' ? 'we put up' : 'they put up'} · no SL used · {state.forfeitPoints} points to {r.forfeit === 'us' ? oppShort : 'us'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[#FCFCFC]">{o ? `${o.name.split(' ')[0]} (${o.sl})` : '—'}</span>
                        <span className="text-[#6E9696]"> vs </span>
                        <span className="text-[#FCFCFC]">{t ? `${t.name.split(' ')[0]} (${t.sl})` : '—'}</span>
                        <span className="block text-xs text-[#6E9696]">
                          {r.declarer === 'us' ? 'we put up' : 'they put up'} · racks {r.racks[0]}-{r.racks[1]}
                        </span>
                      </>
                    )}
                  </span>
                  <span
                    className={`${DISPLAY} rounded-lg px-2 py-1 text-sm font-extrabold tabular-nums ${
                      r.winner === 'us' ? 'bg-[#062B2C] text-[#00D8D8]' : r.winner === 'them' ? 'bg-[#3A1414] text-[#FF7A7A]' : 'bg-[#3A2D0E] text-[#FCC048]'
                    }`}
                  >
                    {r.winner ? `${pts[0]}-${pts[1]}` : 'LIVE'}
                  </span>
                  {isLast && r.winner && !r.forfeit && (
                    <button onClick={reopenLast} className="rounded-lg border border-[#17393A] px-2 py-1 text-xs text-[#9FBDBD]">
                      Reopen
                    </button>
                  )}
                  {isLast && (
                    <button onClick={deleteLast} className="rounded-lg border border-[#17393A] px-2 py-1 text-xs text-[#9FBDBD]">
                      Delete
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </div>
  );

  const PlanTab = (
    <div className="grid gap-3">
      <Card>
        <div className="flex items-center gap-2">
          <ModeChip mode={m.firstDeclarer ? strat.mode : 'Balanced'} />
          <Eyebrow>Game plan · {info.label}</Eyebrow>
        </div>
        <p className={`${DISPLAY} mt-2 text-2xl font-extrabold uppercase leading-tight text-[#FCFCFC]`}>
          {m.firstDeclarer ? strat.headline : `Before the toss: best projected lineup vs ${oppShort}`}
        </p>
        {m.firstDeclarer && strat.detail && <p className="mt-1 text-sm text-[#9FBDBD]">{strat.detail}</p>}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ['Points', `${usPts}-${themPts}`],
            ['Rounds left', `${roundsLeft}`],
            ['Max swing', `${3 * roundsLeft}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-[#0F2021] px-2 py-2">
              <p className={`${DISPLAY} text-2xl font-extrabold tabular-nums text-[#FCFCFC]`}>{v}</p>
              <p className="text-[11px] uppercase tracking-wider text-[#6E9696]">{k}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Eyebrow>Legal lineups for {info.label}</Eyebrow>
        <p className="mt-1 text-sm text-[#9FBDBD]">
          {legalLineups.length} way{legalLineups.length === 1 ? '' : 's'} to play every round under 23
          {firstUpId && openRounds.includes(0) ? ` with ${byId(firstUpId)?.name.split(' ')[0]} playing first` : ''}
          {latePlayers.length ? `, ${names(latePlayers)} only from R${fromOf(latePlayers[0]) + 1}` : ''}.
          {mustPlay.length ? ` Must play: ${mustPlay.map((p) => p.name.split(' ')[0]).join(', ')}.` : ''}
        </p>
        <p className={`${DISPLAY} mt-3 text-xs font-bold uppercase tracking-widest text-[#00D8D8]`}>
          {openRounds.length === ROUNDS ? 'Full five' : `All ${openRounds.length} remaining rounds`}
          {latePlayers.length ? ` (needs ${names(latePlayers)} by round ${fromOf(latePlayers[0]) + 1})` : ''}
        </p>
        <div className="mt-1.5 grid gap-1.5">
          {legalLineups.slice(0, 8).map((l, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-[#0F2021] px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-[#FCFCFC]">{lineupText(l)}</span>
              <span className={`${DISPLAY} text-lg font-extrabold tabular-nums text-[#00D8D8]`}>{lineupSl(l)}</span>
            </div>
          ))}
          {legalLineups.length > 8 && <p className="text-xs text-[#6E9696]">+{legalLineups.length - 8} more</p>}
          {legalLineups.length === 0 && <p className="text-sm text-[#FF7A7A]">No legal way to play every round with the players marked here. Check Setup.</p>}
        </div>
        {openRounds.length > 0 && (
          <>
            <p className={`${DISPLAY} mt-4 text-xs font-bold uppercase tracking-widest text-[#FCC048]`}>
              {openRounds.length === ROUNDS ? 'Four players' : `${usedPlayers.length + fallbackRounds.length} players`} + forfeit round {lastOpen + 1}
            </p>
            <p className="mt-0.5 text-xs text-[#9FBDBD]">
              Hands {oppShort} {state.forfeitPoints} points for round {lastOpen + 1}. Only if nobody legal is here when it starts.
            </p>
            <div className="mt-1.5 grid gap-1.5">
              {fallbackLineups.slice(0, 8).map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-[#0F2021] px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-[#FCFCFC]">{lineupText(l)}</span>
                  <span className={`${DISPLAY} text-lg font-extrabold tabular-nums text-[#FCC048]`}>{lineupSl(l)}</span>
                </div>
              ))}
              {fallbackLineups.length > 8 && <p className="text-xs text-[#6E9696]">+{fallbackLineups.length - 8} more</p>}
              {fallbackLineups.length === 0 && <p className="text-sm text-[#FF7A7A]">No four-player lineup fits either.</p>}
            </div>
          </>
        )}
      </Card>

      <Card>
        <Eyebrow>Most likely matchups from here</Eyebrow>
        <p className="mt-1 text-sm text-[#9FBDBD]">
          Their strongest legal lineup against our best answers. Updates after every lock-in and result.
        </p>
        <div className="mt-3 grid gap-2">
          {plan.pairs.length === 0 && <p className="text-sm text-[#6E9696]">Nothing to project yet. Add {oppShort} players in Setup.</p>}
          {plan.pairs
            .slice()
            .sort((a, b) => b.theirs.sl - a.theirs.sl)
            .map(({ ours: p, theirs: t, o }) => (
              <div key={`${p.id}-${t.id}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-[#17393A] bg-[#0F2021] p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <SL n={t.sl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#FCFCFC]">{t.name}</p>
                    <ThreatBadge level={threat(t)} />
                  </div>
                </div>
                <div className="text-center">
                  <p className={`${DISPLAY} text-2xl font-extrabold leading-none tabular-nums text-[#FCFCFC]`}>{pct(o.pWin)}</p>
                  <p className="text-[10px] text-[#6E9696]">
                    race {o.race[0]}-{o.race[1]}
                  </p>
                </div>
                <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#00D8D8]">{p.name}</p>
                    <p className="text-[11px] text-[#6E9696]">points {signed(o.swing)}</p>
                  </div>
                  <SL n={p.sl} tone="turq" />
                </div>
              </div>
            ))}
        </div>
      </Card>

      {capCounter()}

      <Card>
        <Eyebrow>{oppShort} still to play</Eyebrow>
        <div className="mt-2 grid gap-1.5">
          {[...theirAvail]
            .sort((a, b) => ['Max', 'High', 'Medium', 'Low'].indexOf(threat(a)) - ['Max', 'High', 'Medium', 'Low'].indexOf(threat(b)) || b.sl - a.sl)
            .map((p) => {
              const best = counterFor(p, m.opponent)[0];
              return (
                <div key={p.id} className="flex items-center gap-2 rounded-xl bg-[#0F2021] px-3 py-2 text-sm">
                  <SL n={p.sl} />
                  <span className="min-w-0 flex-1 truncate text-[#FCFCFC]">{p.name}</span>
                  <ThreatBadge level={threat(p)} />
                  {best?.legal && best.o && (
                    <span className="text-right text-xs text-[#00D8D8]">
                      → {best.player.name.split(' ')[0]} {pct(best.o.pWin)}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );

  const teamKeysForPlayers = Array.from(new Set([m.opponent, 'tic', ...Object.keys(TEAMS), ...state.customTeams.map((t) => t.key)]));
  const viewKey = state.viewTeam && teamKeysForPlayers.includes(state.viewTeam) ? state.viewTeam : m.opponent;
  const viewPlayers = playersOf(viewKey);
  const viewIsOurs = viewKey === 'tic';

  const PlayersTab = (
    <div className="grid gap-3">
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {teamKeysForPlayers.map((k) => (
            <button
              key={k}
              onClick={() => setState({ ...state, viewTeam: k })}
              aria-pressed={viewKey === k}
              className={`${DISPLAY} shrink-0 rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-wide ${
                viewKey === k ? 'border-[#00D8D8] bg-[#062B2C] text-[#FCFCFC]' : 'border-[#17393A] bg-[#0A1516] text-[#9FBDBD]'
              }`}
            >
              {teamByKey(k).name}
              {k === m.opponent ? ' · now' : ''}
            </button>
          ))}
        </div>
      </div>
      {teamByKey(viewKey).note && <p className="text-sm text-[#9FBDBD]">{teamByKey(viewKey).note}</p>}
      {viewPlayers.length === 0 && (
        <Card>
          <p className="text-sm text-[#9FBDBD]">No players on file for {teamByKey(viewKey).name}. Add them in Setup as they put up.</p>
        </Card>
      )}
      {[...viewPlayers]
        .sort((a, b) =>
          viewIsOurs
            ? b.sl - a.sl
            : ['Max', 'High', 'Medium', 'Low'].indexOf(threat(a)) - ['Max', 'High', 'Medium', 'Low'].indexOf(threat(b)) || b.sl - a.sl,
        )
        .map((p) => {
          const c = combined(p);
          const summerPct = p.wins != null && p.losses != null && p.wins + p.losses > 0 ? pct(p.wins / (p.wins + p.losses)) : null;
          const usedRound = m.rounds.findIndex((r) => (viewIsOurs ? r.ourId : r.theirId) === p.id);
          const status =
            viewKey === m.opponent || viewIsOurs
              ? usedRound >= 0
                ? `Played round ${usedRound + 1} of ${info.label}`
                : viewIsOurs && !state.present[p.id]
                  ? 'Marked not here'
                  : 'Available'
              : null;
          const counters3 = !viewIsOurs ? counterFor(p, viewKey).filter((o) => o.legal).slice(0, 3) : [];
          const bestSpots = viewIsOurs
            ? theirAvail
                .map((t) => ({ t, o: outlook(p, t) }))
                .sort((a, b) => b.o.pWin - a.o.pWin)
                .slice(0, 3)
            : [];
          return (
            <Card key={p.id}>
              <div className="flex items-start gap-3">
                <SL n={p.sl} size="lg" tone={viewIsOurs ? 'turq' : 'dark'} />
                <div className="min-w-0 flex-1">
                  <p className={`${DISPLAY} text-2xl font-extrabold uppercase leading-tight text-[#FCFCFC]`}>{p.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {!viewIsOurs && <ThreatBadge level={threat(p)} />}
                    {p.confirm && <span className="text-xs text-[#FCC048]">confirm roster</span>}
                    {status && <span className="text-xs text-[#6E9696]">{status}</span>}
                  </div>
                </div>
                <FormToggle value={state.form[p.id]} onChange={(f) => commit({ ...state, form: Object.fromEntries(Object.entries({ ...state.form, [p.id]: f }).filter(([, v]) => !!v)) as Record<string, Form> })} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#0F2021] px-1 py-2">
                  <p className={`${DISPLAY} text-xl font-extrabold tabular-nums text-[#FCFCFC]`}>{record(p)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#6E9696]">Summer {summerPct ?? ''}</p>
                </div>
                <div className="rounded-xl bg-[#0F2021] px-1 py-2">
                  <p className={`${DISPLAY} text-xl font-extrabold tabular-nums text-[#FCFCFC]`}>{c && (p.otherTeams?.length ?? 0) > 0 ? `${c.w}-${c.l}` : '—'}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#6E9696]">All 8-ball teams</p>
                </div>
                <div className="rounded-xl bg-[#0F2021] px-1 py-2">
                  <p className={`${DISPLAY} text-xl font-extrabold tabular-nums text-[#FCFCFC]`}>{p.recent ? `${p.recent.w}-${p.recent.l}` : '—'}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#6E9696]">Last 4 weeks</p>
                </div>
              </div>

              {(p.otherTeams?.length ?? 0) > 0 && (
                <p className="mt-2 text-xs text-[#6E9696]">Also plays: {p.otherTeams!.map((t) => `${t.team} ${t.w}-${t.l} (SL ${t.sl})`).join(' · ')}</p>
              )}
              {p.scout && <p className="mt-2 text-sm text-[#9FBDBD]">{p.scout}</p>}

              {!viewIsOurs && counters3.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#0E4E50] bg-[#051819] p-3">
                  <Eyebrow>Send against them</Eyebrow>
                  <div className="mt-2 grid gap-1.5">
                    {counters3.map((o, i) => (
                      <div key={o.player.id} className="flex items-center gap-2 text-sm">
                        <SL n={o.player.sl} tone={i === 0 ? 'turq' : 'dark'} />
                        <span className={`min-w-0 flex-1 truncate ${i === 0 ? 'font-semibold text-[#FCFCFC]' : 'text-[#9FBDBD]'}`}>{o.player.name}</span>
                        <span className="text-xs tabular-nums text-[#6E9696]">race {o.o?.race.join('-')}</span>
                        <span className={`${DISPLAY} w-12 text-right text-lg font-extrabold tabular-nums ${i === 0 ? 'text-[#00D8D8]' : 'text-[#FCFCFC]'}`}>{o.o ? pct(o.o.pWin) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewIsOurs && bestSpots.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#0E4E50] bg-[#051819] p-3">
                  <Eyebrow>Best spots vs {oppShort}</Eyebrow>
                  <div className="mt-2 grid gap-1.5">
                    {bestSpots.map(({ t, o }) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <SL n={t.sl} />
                        <span className="min-w-0 flex-1 truncate text-[#FCFCFC]">{t.name}</span>
                        <span className="text-xs tabular-nums text-[#6E9696]">race {o.race.join('-')}</span>
                        <span className={`${DISPLAY} w-12 text-right text-lg font-extrabold tabular-nums text-[#00D8D8]`}>{pct(o.pWin)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
    </div>
  );

  const SetupTab = (
    <div className="grid gap-3">
      <Card>
        <Eyebrow>Data</Eyebrow>
        <p className="mt-1 text-sm text-[#FCFCFC]">
          {live.status === 'ok'
            ? `Live from the league database · last updated ${live.updated ? new Date(live.updated).toLocaleDateString() : 'recently'}`
            : live.status === 'loading'
              ? 'Checking the league database…'
              : 'Offline · using the saved snapshot from this morning'}
        </p>
        <p className="mt-1 text-xs text-[#6E9696]">Everything you tap is saved in this browser and stays after refreshing.</p>
      </Card>

      <Card>
        <Eyebrow>Match #21 opponent</Eyebrow>
        <div className="mt-2 flex flex-wrap gap-2">
          {[...MATCHES.m21.opponents, ...state.customTeams.map((t) => t.key)].map((k) => (
            <button
              key={k}
              onClick={() => commit({ ...state, matches: { ...state.matches, m21: { ...state.matches.m21, opponent: k } } })}
              aria-pressed={state.matches.m21.opponent === k}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                state.matches.m21.opponent === k ? 'border-[#00D8D8] bg-[#062B2C] text-[#FCFCFC]' : 'border-[#17393A] bg-[#0F2021] text-[#9FBDBD]'
              }`}
            >
              {teamByKey(k).name}
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addTeam();
          }}
        >
          <label htmlFor="newTeam" className="sr-only">
            New team name
          </label>
          <input
            id="newTeam"
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            placeholder="Add another team"
            className="min-h-11 flex-1 rounded-xl border border-[#17393A] bg-[#04090A] px-3 text-sm text-[#FCFCFC] placeholder:text-[#6E9696]"
          />
          <button type="submit" className="rounded-xl bg-[#00D8D8] px-4 text-sm font-bold text-[#04090A]">
            Add team
          </button>
        </form>
      </Card>

      <Card>
        <Eyebrow>Our players · who is here</Eyebrow>
        <label className="mt-2 flex items-center gap-2 text-sm text-[#9FBDBD]">
          <span className="flex-1">Must play first in {info.label}</span>
          <select
            value={firstUpId ?? ''}
            onChange={(e) => commit({ ...state, firstUp: { ...state.firstUp, [state.active]: e.target.value || null } })}
            className="min-h-10 rounded-lg border border-[#17393A] bg-[#04090A] px-2 text-sm font-bold text-[#FCFCFC]"
          >
            <option value="">Nobody</option>
            {ours
              .filter((p) => state.present[p.id])
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <div className="mt-2 grid gap-2">
          {ours.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <button
                onClick={() => commit({ ...state, present: { ...state.present, [p.id]: !state.present[p.id] } })}
                aria-pressed={!!state.present[p.id]}
                className={`flex min-h-12 flex-1 items-center gap-3 rounded-xl border px-3 text-left ${
                  state.present[p.id] ? 'border-[#00D8D8] bg-[#062B2C]' : 'border-[#17393A] bg-[#0F2021] opacity-60'
                }`}
              >
                <SL n={p.sl} tone={state.present[p.id] ? 'turq' : 'dark'} />
                <span className="min-w-0 flex-1 truncate font-semibold text-[#FCFCFC]">{p.name}</span>
                <span className="shrink-0 text-xs text-[#6E9696]">
                  {p.confirm ? 'confirm roster' : state.present[p.id] ? (fromOf(p) > 0 ? `from R${fromOf(p) + 1}` : 'here') : 'not here'}
                </span>
              </button>
              <SlSelect value={p.sl} onChange={(v) => commit({ ...state, sl: { ...state.sl, [p.id]: v } })} label={`${p.name} skill level`} />
              <select
                aria-label={`${p.name} available from round`}
                value={fromOf(p)}
                onChange={(e) =>
                  commit({
                    ...state,
                    availableFrom: {
                      ...state.availableFrom,
                      [state.active]: { ...(state.availableFrom?.[state.active] ?? {}), [p.id]: Number(e.target.value) },
                    },
                  })
                }
                className={`min-h-10 rounded-lg border bg-[#04090A] px-2 text-sm font-bold ${fromOf(p) > 0 ? 'border-[#FCC048] text-[#FCC048]' : 'border-[#17393A] text-[#FCFCFC]'}`}
              >
                {Array.from({ length: ROUNDS }, (_, i) => (
                  <option key={i} value={i}>
                    From R{i + 1}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#6E9696]">
          &ldquo;From R5&rdquo; means the player is on the way and can only be put up from round 5. They still count toward the cap plan.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm text-[#9FBDBD]">
          <span className="flex-1">Points a forfeit gives the other team (confirm with director)</span>
          <select
            value={state.forfeitPoints}
            onChange={(e) => commit({ ...state, forfeitPoints: Number(e.target.value) === 2 ? 2 : 3 })}
            className="min-h-10 rounded-lg border border-[#17393A] bg-[#04090A] px-2 text-sm font-bold text-[#FCFCFC]"
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
      </Card>

      <Card>
        <Eyebrow>{oppTeam.name} · fix SLs or add players</Eyebrow>
        <div className="mt-2 grid gap-2">
          {theirs.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl border border-[#17393A] bg-[#0F2021] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#FCFCFC]">{p.name}</span>
              <span className="text-xs text-[#6E9696]">{record(p)}</span>
              <SlSelect value={p.sl} onChange={(v) => commit({ ...state, sl: { ...state.sl, [p.id]: v } })} label={`${p.name} skill level`} />
            </div>
          ))}
        </div>
        <form
          className="mt-3 grid grid-cols-[1fr_auto] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addPlayer(m.opponent);
          }}
        >
          <label htmlFor="addName" className="sr-only">
            Player name
          </label>
          <input
            id="addName"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder={`New ${oppTeam.name} player`}
            className="min-h-11 rounded-xl border border-[#17393A] bg-[#04090A] px-3 text-sm text-[#FCFCFC] placeholder:text-[#6E9696]"
          />
          <SlSelect value={addSl} onChange={setAddSl} label="New player skill level" />
          <div className="col-span-2 grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              inputMode="numeric"
              value={addW}
              onChange={(e) => setAddW(e.target.value.replace(/\D/g, ''))}
              placeholder="Wins (optional)"
              aria-label="Wins"
              className="min-h-11 rounded-xl border border-[#17393A] bg-[#04090A] px-3 text-sm text-[#FCFCFC] placeholder:text-[#6E9696]"
            />
            <input
              inputMode="numeric"
              value={addL}
              onChange={(e) => setAddL(e.target.value.replace(/\D/g, ''))}
              placeholder="Losses (optional)"
              aria-label="Losses"
              className="min-h-11 rounded-xl border border-[#17393A] bg-[#04090A] px-3 text-sm text-[#FCFCFC] placeholder:text-[#6E9696]"
            />
            <button type="submit" className="rounded-xl bg-[#00D8D8] px-4 text-sm font-bold text-[#04090A]">
              Add
            </button>
          </div>
        </form>
      </Card>

      <button onClick={resetMatch} className="rounded-xl border border-[#6B2626] py-3 text-sm font-semibold text-[#FF7A7A]">
        Reset {info.label}
      </button>
      <button onClick={resetAll} className="rounded-xl bg-[#3A1414] py-3 text-sm font-semibold text-[#FF7A7A]">
        Reset everything (both matches, roster, SL fixes)
      </button>
    </div>
  );

  /* ============================== layout ============================== */

  return (
    <div className="min-h-screen bg-[#04090A] pb-28 text-[#BFD6D6]">
      <header className="sticky top-0 z-30 border-b border-[#17393A] bg-[#04090A]/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 pb-3 pt-3">
          <div className="flex items-center gap-2">
            <Image src="/toc/table-icue-logo.png" alt="Table I-Cue" width={1200} height={318} priority className="h-9 w-auto" />
            <div className="ml-auto flex items-center gap-1.5">
              {(Object.keys(MATCHES) as MatchId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setState({ ...state, active: id })}
                  aria-pressed={state.active === id}
                  className={`${DISPLAY} whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                    state.active === id ? 'border-[#00D8D8] bg-[#00D8D8] text-[#04090A]' : 'border-[#17393A] text-[#9FBDBD]'
                  }`}
                >
                  {MATCHES[id].label.replace('Match ', '')} · {MATCHES[id].time.replace(':00 ', '')}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="min-w-0">
              <p className={`${DISPLAY} truncate text-lg font-extrabold uppercase leading-none text-[#00D8D8]`}>Table I-Cue</p>
              <p className="mt-1 text-[11px] tabular-nums text-[#6E9696]">
                cap {ourBudget} · {usWins} wins
              </p>
            </div>
            <div className="text-center">
              <p className={`${DISPLAY} text-5xl font-extrabold leading-none tabular-nums text-[#FCFCFC]`}>
                {usPts}
                <span className="px-1.5 text-[#17393A]">:</span>
                {themPts}
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6E9696]">points</p>
            </div>
            <div className="min-w-0 text-right">
              <p className={`${DISPLAY} truncate text-lg font-extrabold uppercase leading-none text-[#FCFCFC]`}>{oppShort}</p>
              <p className="mt-1 text-[11px] tabular-nums text-[#6E9696]">
                cap {theirBudget} · {themWins} wins
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={undo}
              disabled={history.current.length === 0}
              className="rounded-full border border-[#17393A] px-3 py-1.5 text-xs font-semibold text-[#FCFCFC] disabled:opacity-35"
              aria-label="Undo last change"
            >
              ↶ Undo
            </button>
            <div className="flex flex-1 justify-center gap-1.5" aria-label="Rounds">
              {Array.from({ length: ROUNDS }, (_, i) => {
                const r = m.rounds[i];
                const c = r?.winner === 'us' ? 'bg-[#00D8D8]' : r?.winner === 'them' ? 'bg-[#FF7A7A]' : i === roundIndex && m.firstDeclarer ? 'bg-[#FCC048]' : 'bg-[#17393A]';
                return <span key={i} className={`h-1.5 w-7 rounded-full ${c}`} />;
              })}
            </div>
            <button
              onClick={resetMatch}
              className="rounded-full border border-[#6B2626] px-3 py-1.5 text-xs font-semibold text-[#FF7A7A]"
              aria-label={`Reset ${info.label}`}
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {state.tab === 'match' && MatchTab}
        {state.tab === 'plan' && PlanTab}
        {state.tab === 'players' && PlayersTab}
        {state.tab === 'setup' && SetupTab}
        <p className="pt-5 text-center text-[11px] text-[#4F7272]">
          Chances come from 8-ball records and the APA race chart. A guide, not a guarantee.
        </p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#17393A] bg-[#04090A]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Sections">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {([
            ['match', 'Match'],
            ['plan', 'Plan'],
            ['players', 'Players'],
            ['setup', 'Setup'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-current={state.tab === key ? 'page' : undefined}
              className={`${DISPLAY} relative min-h-16 text-base font-extrabold uppercase tracking-wider ${state.tab === key ? 'text-[#00D8D8]' : 'text-[#6E9696]'}`}
            >
              {state.tab === key && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-[#FCC048]" />}
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
