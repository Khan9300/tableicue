export type Format = '8ball' | '9ball';

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
  wins: number | null;
  losses: number | null;
  otherTeams?: TeamRecord[];
  recent?: { w: number; l: number } | null;
  scout?: string;
  alias?: string;
  maxThreat?: boolean;
  confirm?: boolean;
  avoid?: string[];
  form?: Form;
}

export interface TeamConfig {
  key: string;
  name: string;
  number: string;
  format: Format;
  night: string;
  divisionId: {
    summer: string;
    fall: string;
  };
  captain: string;
  homeVenue: string;
  players: Player[];
}

export interface Availability {
  present: boolean;
  fromRound?: number;
  untilRound?: number;
  forcedRound?: number;
}

export interface MatchNight {
  team: TeamConfig;
  date: string;
  opponent?: TeamConfig;
}

export interface Round {
  ourPlayer: Player;
  theirPlayer: Player;
  ourPoints: number;
  theirPoints: number;
}

export type ThreatLevel = 'Max' | 'High' | 'Medium' | 'Low';

export interface Outlook {
  race: [number, number];
  pWin: number;
  win30?: number;
  win21?: number;
  win20?: number;
  lose03?: number;
  lose12?: number;
  lose02?: number;
  pointsDist?: Record<number, number>;
  ePts: number;
  eOpp: number;
  swing: number;
}

export interface Option {
  player: Player;
  o: Outlook | null;
  legal: boolean;
  score: number;
  response?: Player | null;
  lockedOut?: boolean;
}

export interface Pairing {
  ours: Player;
  theirs: Player;
  o: Outlook;
}

export type Mode = 'Chase' | 'Balanced' | 'Protect' | 'Clinched' | 'Eliminated' | 'Final';
