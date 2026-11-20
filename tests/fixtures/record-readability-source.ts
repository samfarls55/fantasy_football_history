import { recordsSource } from './records-source.ts';

/** Isolated completed season with distinct scoring percentages that round alike at one decimal. */
export function recordReadabilitySource(previousLeagueId: string) {
  // The league average is exactly 100, so the first two values are 20.004% and 20.003%.
  const base = recordsSource([[120.004, 120.003, 79.997, 79.996]]);
  const id = '970000000000002023';
  const responses: Record<string, any> = {};
  for (const [path, value] of Object.entries(base.responses)) responses[path.replace(base.seedLeagueId, id)] = structuredClone(value);
  const league = responses[`league/${id}`];
  league.league_id = id;
  league.season = '2023';
  league.status = 'complete';
  league.previous_league_id = previousLeagueId;
  for (const user of responses[`league/${id}/users`]) {
    user.user_id = user.user_id.replace('960', '970');
    user.display_name = user.display_name.replace('Record', 'Precision');
  }
  for (const roster of responses[`league/${id}/rosters`]) {
    roster.roster_id += 200;
    roster.owner_id = roster.owner_id.replace('960', '970');
  }
  for (const row of responses[`league/${id}/matchups/1`]) row.roster_id += 200;
  delete responses['state/nfl'];
  delete responses['players/nfl'];
  return { seedLeagueId: id, responses };
}
