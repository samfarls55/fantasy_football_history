import { recordsSource } from './records-source.ts';

/** Synthetic 2024 response chain with isolated roster identities for browser rivalry flows. */
export function rivalriesSource(previousLeagueId: string) {
  const base = recordsSource(Array.from({ length: 13 }, (_, week) => week === 12 ? [10,0,10,10,10,10] : [10,0,0,10,10,0]));
  const id = '960000000000002024';
  const responses: Record<string, any> = {};
  for (const [path, value] of Object.entries(base.responses)) responses[path.replace(base.seedLeagueId, id)] = structuredClone(value);
  const league = responses[`league/${id}`];
  league.league_id = id; league.season = '2024'; league.previous_league_id = previousLeagueId;
  for (const user of responses[`league/${id}/users`]) user.display_name = user.display_name.replace('Record', 'Rivalry');
  responses[`league/${id}/users`][0].display_name = 'Rivalry Manager With A Very Long Display Name That Wraps Across Lines';
  responses[`league/${id}/users`][0].avatar = 'controlled-rivalry-image';
  for (const roster of responses[`league/${id}/rosters`]) roster.roster_id += 100;
  for (let week = 1; week <= 13; week++) {
    const rows = responses[`league/${id}/matchups/${week}`];
    for (const row of rows) row.roster_id += 100;
    if (week >= 7 && week <= 12) {
      rows[2].matchup_id = rows[4].matchup_id = 2;
      rows[3].matchup_id = rows[5].matchup_id = 3;
    }
  }
  delete responses['state/nfl'];
  delete responses['players/nfl'];
  return { seedLeagueId: id, responses };
}
