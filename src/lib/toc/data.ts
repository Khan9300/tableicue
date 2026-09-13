// Match-day data for the APA Summer 2026 8-Ball Tournament of Champions, Sun Sep 13 2026.
// Records are Summer 2026 division play (Supabase simi_valley_players, checked 2026-09-13).

export interface Player {
  id: string;
  name: string;
  sl: number;
  wins: number | null;
  losses: number | null;
  hot?: boolean;
  confirm?: boolean;
  note?: string;
  /** Our player ids that should not be sent against this opponent. */
  avoid?: string[];
}

export type OpponentKey = 'roc' | 'wolfpack' | 'force';

export interface Opponent {
  key: OpponentKey;
  name: string;
  number: string;
  players: Player[];
}

export const OUR_TEAM = { name: 'Table I-Cue', short: 'TIC', number: '02114' };

export const OUR_PLAYERS: Player[] = [
  { id: 'jason', name: 'Jason', sl: 6, wins: 6, losses: 2, note: 'Cowboy' },
  { id: 'felix', name: 'Felix', sl: 6, wins: 5, losses: 3 },
  { id: 'kobe', name: 'Kobe', sl: 6, wins: 2, losses: 2 },
  { id: 'fahad', name: 'Fahad', sl: 5, wins: 8, losses: 2 },
  { id: 'tristen', name: 'Tristen', sl: 4, wins: 7, losses: 5 },
  { id: 'mircea', name: 'Mircea', sl: 4, wins: 4, losses: 3 },
  { id: 'umber', name: 'Umber', sl: 3, wins: 2, losses: 7 },
  { id: 'bailey', name: 'Bailey', sl: 3, wins: 2, losses: 2, confirm: true, note: 'Confirm TOC roster' },
];

export const OPPONENTS: Record<OpponentKey, Opponent> = {
  roc: {
    key: 'roc',
    name: 'Right On Cue!',
    number: '02409',
    players: [
      { id: 'roc-fernando', name: 'Fernando Garcia', sl: 7, wins: 8, losses: 3, hot: true, note: '11-yr vet, 72% career' },
      { id: 'roc-mark', name: 'Mark Matthews', sl: 6, wins: 5, losses: 3 },
      { id: 'roc-vatche', name: 'Vatche Garabedian', sl: 5, wins: 8, losses: 4 },
      { id: 'roc-jose', name: 'Jose Flores', sl: 5, wins: 4, losses: 4, note: 'Plays open pool' },
      { id: 'roc-ric', name: 'Ric Robles', sl: 4, wins: 7, losses: 1, hot: true, avoid: ['umber', 'bailey'], note: 'Shooting above his SL' },
      { id: 'roc-larry', name: 'Larry Ottina', sl: 4, wins: 9, losses: 8 },
      { id: 'roc-anthony', name: 'Anthony Ortiz', sl: 3, wins: 7, losses: 3, hot: true, note: 'Not a free point' },
      { id: 'roc-maureen', name: 'Maureen Kostin', sl: 3, wins: 3, losses: 4 },
    ],
  },
  wolfpack: {
    key: 'wolfpack',
    name: 'Wolfpack',
    number: '01310',
    players: [
      { id: 'wp-jesse', name: 'Jesse Ramirez', sl: 7, wins: 1, losses: 3, note: 'Cold this session' },
      { id: 'wp-dubois', name: 'Joshua DuBois', sl: 6, wins: 6, losses: 4 },
      { id: 'wp-ortiz', name: 'Jose Ortiz', sl: 5, wins: 6, losses: 1, hot: true, avoid: ['tristen', 'mircea'], note: 'Their best record' },
      { id: 'wp-reyes', name: 'Alex Reyes', sl: 5, wins: 6, losses: 5 },
      { id: 'wp-perry', name: 'Lori Perry', sl: 5, wins: 4, losses: 5 },
      { id: 'wp-lozano', name: 'William Lozano', sl: 4, wins: 3, losses: 1, hot: true, note: 'Small sample, hot' },
      { id: 'wp-pierangeli', name: 'Michael Pierangeli', sl: 4, wins: 5, losses: 3 },
      { id: 'wp-blanca', name: 'Blanca Ramirez', sl: 4, wins: 2, losses: 2 },
      { id: 'wp-hudgins', name: 'Roland Hudgins', sl: 3, wins: null, losses: null, note: 'No Summer record' },
    ],
  },
  force: { key: 'force', name: 'The Force', number: '03101', players: [] },
};

export const MATCHES = {
  m10: { label: 'Match #10', time: '2:00 PM', options: ['roc'] as OpponentKey[] },
  m21: { label: 'Match #21', time: '7:00 PM', options: ['wolfpack', 'force'] as OpponentKey[] },
};

/** APA 8-Ball Equalizer "games must win": RACE[our SL][their SL] = [our games, their games]. */
export const RACE: Record<number, Record<number, [number, number]>> = {
  2: { 2: [2, 2], 3: [2, 3], 4: [2, 4], 5: [2, 5], 6: [2, 6], 7: [2, 7] },
  3: { 2: [3, 2], 3: [2, 2], 4: [2, 3], 5: [2, 4], 6: [2, 5], 7: [2, 6] },
  4: { 2: [4, 2], 3: [3, 2], 4: [3, 3], 5: [3, 4], 6: [3, 5], 7: [2, 5] },
  5: { 2: [5, 2], 3: [4, 2], 4: [4, 3], 5: [4, 4], 6: [4, 5], 7: [3, 5] },
  6: { 2: [6, 2], 3: [5, 2], 4: [5, 3], 5: [5, 4], 6: [5, 5], 7: [4, 5] },
  7: { 2: [7, 2], 3: [6, 2], 4: [5, 2], 5: [5, 3], 6: [5, 4], 7: [5, 5] },
};

export function race(ours: number, theirs: number): [number, number] {
  const clamp = (n: number) => Math.min(7, Math.max(2, n));
  return RACE[clamp(ours)][clamp(theirs)];
}

export function record(p: Player): string {
  return p.wins == null || p.losses == null ? 'no record' : `${p.wins}-${p.losses}`;
}
