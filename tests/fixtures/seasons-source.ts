import { recordsSource } from './records-source.ts';

/** Two rosters and their scores. */
export type Game = [a: number, b: number, scoreA: number, scoreB: number];
export interface Year { owners?: number[]; weeks: Game[][]; playoffs?: { start: number; type?: number; bracket: object[]; lower?: object[] }; live?: boolean }
const id = (year: number) => `90000000000000${year}`;

/** Linked seasons from 2021 on, four rosters each, owned in order unless a season says otherwise. */
export function seasonsSource(...years: Year[]) {
  const responses: Record<string, unknown> = {};
  years.forEach(({ owners = [1, 2, 3, 4], weeks, playoffs, live }, index) => {
    const year = 2021 + index;
    const source = recordsSource(weeks.length ? weeks.map(() => [0, 0, 0, 0]) : [[0, 0, 0, 0]]);
    for (const [path, value] of Object.entries(source.responses)) responses[path.replace(source.seedLeagueId, id(year))] = value;
    const season = responses[`league/${id(year)}`] as any;
    Object.assign(season, { league_id: id(year), season: String(year), previous_league_id: index ? id(year - 1) : null, status: live ? 'in_season' : 'complete' });
    Object.assign(season.settings, { playoff_week_start: playoffs?.start ?? Math.max(2, weeks.length + 1), playoff_round_type: playoffs?.type ?? 0 });
    responses[`league/${id(year)}/winners_bracket`] = playoffs?.bracket ?? [];
    responses[`league/${id(year)}/losers_bracket`] = playoffs?.lower ?? [];
    owners.forEach((owner, roster) => {
      (responses[`league/${id(year)}/rosters`] as any[])[roster].owner_id = `96000000000000000${owner}`;
      Object.assign((responses[`league/${id(year)}/users`] as any[])[roster], { user_id: `96000000000000000${owner}`, display_name: `M${owner}` });
    });
    weeks.forEach((games, week) => {
      const rows = responses[`league/${id(year)}/matchups/${week + 1}`] as any[];
      for (const row of rows) row.matchup_id = null;
      games.forEach(([a, b, scoreA, scoreB], matchup) => {
        Object.assign(rows[a - 1], { matchup_id: matchup + 1, points: scoreA });
        Object.assign(rows[b - 1], { matchup_id: matchup + 1, points: scoreB });
      });
    });
    responses['state/nfl'] = { season: String(year), week: weeks.length + 1 };
  });
  return { seedLeagueId: id(2020 + years.length), responses };
}
/** A season whose only playoff game is the final in its last week. */
export const titled = (weeks: Game[][], winner: number, loser: number, owners?: number[]): Year => ({ owners, weeks, playoffs: { start: weeks.length, bracket: [final(winner, loser)] } });
export const final = (winner: number, loser: number) => ({ r: 1, m: 1, t1: winner, t2: loser, w: winner, l: loser, p: 1 });
