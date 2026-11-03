import { sampleHistory } from '../../assets/data/sample-history';

export const gameScopes = [
  { value: 'regular', label: 'Regular season', description: 'Regular season' },
  { value: 'playoffs', label: 'Playoffs', description: 'Championship playoffs' },
  { value: 'combined', label: 'Combined', description: 'Regular season and championship playoffs' },
  { value: 'consolation', label: 'Consolation', description: 'Consolation games' },
  { value: 'placement', label: 'Placement', description: 'Placement games' },
] as const;

const [season, bench, playoff] = sampleHistory.records;
const teamPPG = season.source.teamPoints / season.source.teamGames;
const leaguePPG = season.source.leaguePoints / season.source.leagueTeamGames;
export const dominance = `+${Math.round((teamPPG / leaguePPG - 1) * 100)}%`;

export const records = [
  {
    ...season,
    team: sampleHistory.teams.monkey,
    value: dominance,
    unit: 'PPG above league average',
    when: `${season.season}`,
    method: "Compare a completed season's points per game with that season's league average per team-game. Only seasons without a championship qualify.",
    facts: [
      ['Team scoring', `${season.source.teamPoints.toLocaleString('en-US')} points ÷ ${season.source.teamGames} games = ${teamPPG} PPG`],
      ['League scoring', `${season.source.leaguePoints.toLocaleString('en-US')} points ÷ ${season.source.leagueTeamGames} team-games = ${leaguePPG} PPG`],
      ['Calculation', `(${teamPPG} ÷ ${leaguePPG} − 1) × 100 = ${dominance}`],
      ['Eligibility', 'Completed regular season; no championship'],
      ['Sample coverage', '1 eligible season; no ties'],
    ],
  },
  {
    ...bench,
    team: sampleHistory.teams.champion,
    value: `${bench.source.playerPoints}`,
    unit: 'points in one game',
    when: `Week ${bench.week} · ${bench.season}`,
    method: 'The highest single-game score by one benched player. Historical substitution eligibility is unavailable, so this result does not establish that a legal lineup change could have used those points.',
    facts: [
      ['Player', bench.source.playerName],
      ['Player points', `${bench.source.playerPoints}`],
      ['Lineup', 'Bench'],
      ['Game', `Week ${bench.week}, ${bench.season} · Regular season`],
      ['Sample coverage', '1 eligible bench performance; no ties'],
    ],
  },
  {
    ...playoff,
    team: sampleHistory.teams.monkey,
    value: `${playoff.source.officialPoints}`,
    unit: 'team points in one game',
    when: `Week ${playoff.week} · ${playoff.season}`,
    method: 'Use the official team score for a completed championship-path playoff game. The official result takes precedence over a sum of player points.',
    facts: [
      ['Team score', `${playoff.source.homePoints}`],
      ['Opponent score', `${playoff.source.awayPoints}`],
      ['Game', `Week ${playoff.week}, ${playoff.season} · Championship playoffs`],
      ['Commissioner adjustment', 'None in this fixture'],
      ['Sample coverage', '1 eligible playoff game; no ties'],
    ],
  },
];
