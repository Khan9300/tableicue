// Match-day data for the APA Summer 2026 8-Ball Tournament of Champions, Sun Sep 13 2026.
// Records: Supabase simi_valley_players / simi_valley_player_stats (8-ball), pulled 2026-09-13.
// Scouting notes: Sep 8 APA member-site scouting report.

export interface TeamRecord {
  team: string;
  w: number;
  l: number;
  sl: number;
}

export type Form = 'hot' | 'cold';

export interface Player {
  id: string;
  name: string;
  sl: number;
  /** Summer 2026 record on this team. */
  wins: number | null;
  losses: number | null;
  /** Other 8-ball teams this player is on (matched by name). */
  otherTeams?: TeamRecord[];
  /** Record change Aug 12 → Sep 11. */
  recent?: { w: number; l: number } | null;
  scout?: string;
  /** Name used in the league database, if different. */
  alias?: string;
  maxThreat?: boolean;
  confirm?: boolean;
  /** Our player ids that should not be sent against this opponent. */
  avoid?: string[];
  /** Set at runtime from the captain's hot/cold taps. */
  form?: Form;
}

export interface Team {
  key: string;
  name: string;
  short: string;
  number: string;
  /** Exact team_name in Supabase, for live refresh. */
  dbName?: string;
  note?: string;
  players: Player[];
}

export const OUR_TEAM: Team = {
  key: 'tic',
  name: 'Table I-Cue',
  short: 'TIC',
  number: '02114',
  dbName: 'Table I-Cue',
  players: [
    { id: 'jason', name: 'Jason Krepel', sl: 6, wins: 6, losses: 2, otherTeams: [{ team: "We've Got This", w: 7, l: 4, sl: 6 }], recent: { w: 0, l: 1 }, scout: 'Cowboy. Can match their 6 or hunt their 5s and 4s.' },
    { id: 'felix', name: 'Felix Katz', sl: 6, wins: 5, losses: 3, otherTeams: [{ team: 'Oracle', w: 7, l: 3, sl: 6 }], recent: { w: 1, l: 1 }, scout: 'Aggressive pocketing. Strong option to sub for Jason.' },
    { id: 'kobe', name: 'Kobe Barredo', sl: 6, wins: 2, losses: 2, recent: { w: 0, l: 0 }, scout: 'Career 8-3 on the team. High ceiling shotmaker.' },
    { id: 'fahad', name: 'Fahad Khan', sl: 5, wins: 8, losses: 2, otherTeams: [{ team: 'The Predators 8', w: 5, l: 5, sl: 5 }], recent: { w: 1, l: 0 }, scout: 'Team MVP form. Game control and safeties.' },
    { id: 'tristen', name: 'Tristen Waters', sl: 4, wins: 7, losses: 5, recent: { w: 2, l: 0 }, scout: 'Arrives about 4:15 PM, plays round 5. Battle-tested under pressure.' },
    { id: 'mircea', name: 'Paul Marinescu', alias: 'Mircea Marinescu', sl: 4, wins: 4, losses: 3, recent: { w: 1, l: 1 }, scout: 'Goes by Paul (Mircea on some records). Reliable pocketing, disciplined shot selection. Plays round 2 of Match #10 (leaves for work at 4), back for Match #21.' },
    { id: 'umber', name: 'Umber Chohan', sl: 3, wins: 2, losses: 7, recent: { w: 0, l: 1 }, scout: 'Only needs 2 games. Best against a 3, or as a trap against a 7.' },
    { id: 'bailey', name: 'Bailey Watts', sl: 3, wins: 2, losses: 2, recent: { w: 0, l: 1 }, confirm: true, scout: 'Confirm TOC roster eligibility.' },
  ],
};

export const TEAMS: Record<string, Team> = {
  roc: {
    key: 'roc',
    name: 'Right On Cue!',
    short: 'ROC',
    number: '02409',
    dbName: 'Right On Cue!',
    note: 'East Valley Tuesday (024) champion. Match #10 at 2:00 PM.',
    players: [
      { id: 'roc-fernando', name: 'Fernando Garcia', sl: 7, wins: 8, losses: 3, maxThreat: true, scout: '11 years active. Career 211-81 (72%), 17 break-and-runs, 37 rackless. Summer: 3 B&R, 3 rackless.' },
      { id: 'roc-mark', name: 'Mark Matthews', sl: 6, wins: 5, losses: 3, scout: 'Career 45-40. Dangerous on open tables.' },
      { id: 'roc-vatche', name: 'Vatche Garabedian', sl: 5, wins: 8, losses: 4, scout: 'Career 49-37. Tied their team lead in wins, 2 rackless.' },
      { id: 'roc-jose', name: 'Jose Flores', sl: 5, wins: 4, losses: 4, scout: '14-year vet, career 203-186. Shotmaker, weak defense. Plays open pool.' },
      { id: 'roc-ric', name: 'Ric Robles', sl: 4, wins: 7, losses: 1, maxThreat: true, avoid: ['umber', 'bailey'], scout: 'Their hottest player. 1.88 points per match, shooting like a 5 or 6.' },
      { id: 'roc-larry', name: 'Larry Ottina', sl: 4, wins: 9, losses: 8, scout: '22 straight years active, 1,000+ matches. Career 477-601.' },
      { id: 'roc-anthony', name: 'Anthony Ortiz', sl: 3, wins: 7, losses: 3, maxThreat: true, scout: 'Rookie year, 1.80 points per match. Not a free point.' },
      { id: 'roc-maureen', name: 'Maureen Kostin', sl: 3, wins: 3, losses: 4, scout: '20-year vet, career 243-270. Patient, lower pocketing consistency.' },
    ],
  },
  wolfpack: {
    key: 'wolfpack',
    name: 'Wolfpack',
    short: 'WOLF',
    number: '01310',
    dbName: 'Wolfpack',
    note: '#1 seed, Monday division (013). Plays The Force in Match #9.',
    players: [
      { id: 'wp-jesse', name: 'Jesse Ramirez', sl: 7, wins: 1, losses: 3, recent: { w: 0, l: 0 }, scout: 'Ice cold this session. Also 1-5 in 9-ball.' },
      { id: 'wp-dubois', name: 'Joshua DuBois', sl: 6, wins: 6, losses: 4, otherTeams: [{ team: 'Ma Cue-Lit Squad', w: 6, l: 3, sl: 6 }], recent: { w: 0, l: 1 }, scout: 'Their anchor. High-volume starter, aggressive runner.' },
      { id: 'wp-ortiz', name: 'Jose Ortiz', sl: 5, wins: 6, losses: 1, recent: { w: 1, l: 0 }, maxThreat: true, avoid: ['tristen', 'mircea'], scout: 'Best record on the squad. Counter with Fahad.' },
      { id: 'wp-reyes', name: 'Alex Reyes', sl: 5, wins: 6, losses: 5, recent: { w: 1, l: 1 }, scout: 'Workhorse, 11 matches. Exploitable in safety exchanges.' },
      { id: 'wp-perry', name: 'Lori Perry', sl: 5, wins: 4, losses: 5, recent: { w: 1, l: 1 }, scout: 'Vulnerable to aggressive safety play. Target for our 4s.' },
      { id: 'wp-lozano', name: 'William Lozano', sl: 4, wins: 3, losses: 1, recent: { w: 1, l: 0 }, scout: 'Small sample but hot. Do not underestimate.' },
      { id: 'wp-pierangeli', name: 'Michael Pierangeli', sl: 4, wins: 5, losses: 3, recent: { w: 1, l: 1 }, scout: 'Reliable pocketing, dangerous in a race to 3.' },
      { id: 'wp-blanca', name: 'Blanca Ramirez', sl: 4, wins: 2, losses: 2, recent: { w: 1, l: 0 }, scout: 'Even-keeled, tournament tested.' },
      { id: 'wp-hudgins', name: 'Roland Hudgins', sl: 3, wins: null, losses: null, scout: 'Cap balance player. No Summer 8-ball record.' },
    ],
  },
  force: {
    key: 'force',
    name: 'The Force',
    short: 'FORCE',
    number: '03107',
    note: 'Ojai division 031 (APA lists them as 03107, not 03101). Tied 2nd with 129 pts; won division playoffs 9-5 and 8-3. Low-SL team. Records: APA league site, Summer 2026.',
    players: [
      { id: 'force-peet', name: 'James Peet', sl: 3, wins: 7, losses: 5, scout: 'Most wins on the team. 1.58 points per match.' },
      { id: 'force-marcel', name: 'Marcel Pena', sl: 5, wins: 6, losses: 4, scout: 'Their highest SL. 1.40 points per match. Lost Fall week 1.' },
      { id: 'force-milo', name: 'Milo Helgesen', sl: 2, wins: 5, losses: 2, maxThreat: true, scout: 'Best win % on the team at SL 2. Won Fall week 1 3-0. Only needs 2 games against anyone.' },
      { id: 'force-james-n', name: 'James Northway', sl: 4, wins: 5, losses: 6, scout: '1.27 points per match. Won Fall week 1.' },
      { id: 'force-janine', name: 'Janine Northway', sl: 4, wins: 4, losses: 7, scout: 'Weakest record on the team. 1.00 points per match.' },
      { id: 'force-geovanny', name: 'Geovanny Basaldua', sl: 4, wins: 4, losses: 3, scout: 'Best points per match among regulars (1.86).' },
      { id: 'force-jayme', name: 'Jayme Pena', sl: 2, wins: 3, losses: 2, confirm: true, scout: 'SL 3 on the Summer roster, SL 2 in Fall. Confirm his SL on the scoresheet.' },
      { id: 'force-nicholson', name: 'Anthony Nicholson', sl: 3, wins: 1, losses: 1, scout: 'Only 2 matches. 2.00 points per match.' },
    ],
  },
  shooters: {
    key: 'shooters',
    name: "Shooter's Call",
    short: 'SHOOT',
    number: '03101',
    note: "Backup: 03101 was Shooter's Call in Summer. Use only if the bracket's team number turns out to mean them. Last names only on the APA roster page.",
    players: [
      { id: 'sc-cowlishaw', name: 'Cowlishaw', sl: 5, wins: 9, losses: 3 },
      { id: 'sc-hall', name: 'Hall', sl: 4, wins: 7, losses: 3 },
      { id: 'sc-albert', name: 'Albert', sl: 2, wins: 5, losses: 4 },
      { id: 'sc-n-adams', name: 'N. Adams', sl: 5, wins: 4, losses: 5 },
      { id: 'sc-b-adams', name: 'B. Adams', sl: 3, wins: 3, losses: 1 },
      { id: 'sc-alvarez', name: 'Alvarez', sl: 3, wins: 2, losses: 2 },
      { id: 'sc-hiskett', name: 'Hiskett', sl: 6, wins: 2, losses: 4 },
      { id: 'sc-hanna', name: 'Hanna Jr', sl: 7, wins: 2, losses: 8 },
    ],
  },
};

export const MATCHES = {
  m10: { label: 'Match #10', time: '2:00 PM', opponents: ['roc'] },
  m21: { label: 'Match #21', time: '7:00 PM', opponents: ['wolfpack', 'force', 'shooters'] },
} as const;

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
  const clamp = (n: number) => Math.min(7, Math.max(2, n || 2));
  return RACE[clamp(ours)][clamp(theirs)];
}

export function record(p: Player): string {
  return p.wins == null || p.losses == null ? 'no record' : `${p.wins}-${p.losses}`;
}
