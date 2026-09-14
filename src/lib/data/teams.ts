import { TeamConfig } from '../engine/types';

export const PREDATORS_8: TeamConfig = {
  key: 'predators-8',
  name: 'The Predators 8',
  number: '01306',
  format: '8ball',
  night: 'Monday',
  divisionId: {
    summer: '433790',
    fall: '441105'
  },
  captain: 'Unknown',
  homeVenue: 'Unknown',
  players: [
    { id: 'alexander-reyes', name: 'Alexander Reyes', sl: 6, wins: 9, losses: 2 },
    { id: 'jose-trejo', name: 'Jose Trejo', sl: 6, wins: 2, losses: 3 },
    { id: 'fahad-khan', name: 'Fahad Khan', sl: 5, wins: 5, losses: 5, otherTeams: [{ team: 'Table I-Cue', w: 8, l: 2, sl: 5 }] },
    { id: 'cruz-gonzalez', name: 'Cruz Gonzalez', sl: 4, wins: 2, losses: 6 },
    { id: 'will-morstad', name: 'Will Morstad', sl: 4, wins: 5, losses: 4 },
    { id: 'andhy-garcia', name: 'Andhy Garcia', sl: 3, wins: 2, losses: 2 },
    { id: 'enrique-villar', name: 'Enrique Villar', sl: 3, wins: 4, losses: 2 },
    { id: 'lindsay-gordon', name: 'Lindsay Gordon', sl: 3, wins: 4, losses: 2 }
  ]
};

export const TABLE_I_CUE: TeamConfig = {
  key: 'table-i-cue',
  name: 'Table I-Cue',
  number: '02110',
  format: '8ball',
  night: 'Tuesday',
  divisionId: {
    summer: '433776',
    fall: '441091'
  },
  captain: 'Fahad Khan',
  homeVenue: 'Unknown',
  players: [
    { id: 'felix-katz', name: 'Felix Katz', sl: 6, wins: 5, losses: 3, otherTeams: [{ team: 'Oracle', w: 7, l: 3, sl: 6 }] },
    { id: 'jason-krepel', name: 'Jason Krepel', sl: 6, wins: 6, losses: 2, otherTeams: [{ team: "We've Got This", w: 7, l: 4, sl: 6 }] },
    { id: 'fahad-khan', name: 'Fahad Khan', sl: 5, wins: 8, losses: 2, otherTeams: [{ team: 'The Predators 8', w: 5, l: 5, sl: 5 }] },
    { id: 'mircea-marinescu', name: 'Mircea Marinescu', sl: 4, wins: 4, losses: 3, alias: 'Paul Marinescu' },
    { id: 'tristen-waters', name: 'Tristen Waters', sl: 4, wins: 7, losses: 5 },
    { id: 'bailey-watts', name: 'Bailey Watts', sl: 3, wins: 2, losses: 2 },
    { id: 'umber-chohan', name: 'Umber Chohan', sl: 3, wins: 2, losses: 7 },
    { id: 'nicholas-petrick', name: 'Nicholas Petrick', sl: 3, wins: null, losses: null }
  ]
};

export const CTRL_ALT_DEFEAT: TeamConfig = {
  key: 'ctrl-alt-defeat',
  name: 'Ctrl Alt Defeat',
  number: '83114',
  format: '9ball',
  night: 'Wednesday',
  divisionId: {
    summer: '433778',
    fall: '441093'
  },
  captain: 'Unknown',
  homeVenue: 'Unknown',
  players: [
    { id: 'sheleph-christian', name: 'Sheleph Christian', sl: 7, wins: 3, losses: 1 },
    { id: 'amis-christian', name: 'Amis Christian', sl: 6, wins: 3, losses: 2 },
    { id: 'arpit-christian', name: 'Arpit Christian', sl: 6, wins: 3, losses: 5 },
    { id: 'fahad-khan', name: 'Fahad Khan', sl: 5, wins: 1, losses: 8 },
    { id: 'ankit-shah', name: 'Ankit Shah', sl: 4, wins: 5, losses: 1 },
    { id: 'chris-soderlund', name: 'Chris Soderlund', sl: 4, wins: 5, losses: 4 },
    { id: 'umber-chohan', name: 'Umber Chohan', sl: 3, wins: 1, losses: 10 },
    { id: 'valentina-christian', name: 'Valentina Christian', sl: 3, wins: 5, losses: 3 }
  ]
};

export const ALL_TEAMS = [PREDATORS_8, TABLE_I_CUE, CTRL_ALT_DEFEAT];

/** Lookup teams by key for quick access. */
export const TEAMS: Record<string, TeamConfig> = Object.fromEntries(
  ALL_TEAMS.map((t) => [t.key, t])
);

/** Get a team config by its URL key. Returns undefined if not found. */
export function getTeamConfig(key: string): TeamConfig | undefined {
  return TEAMS[key];
}
