import { recordsSource } from './records-source.ts';

/** Two linked seasons: a playoff loss is outside the regular-season streak. */
export function streaksSource() {
  const source = recordsSource([[2, 1, 1, 2], [2, 2, 1, 2], [2, 1, 1, 2], [2, 1, 1, 2]]);
  const oldId = '900000000000002020';
  const old = recordsSource([[2, 1, 1, 2], [2, 1, 1, 2], [1, 2, 0, 0]]);
  for (const [path, value] of Object.entries(old.responses)) {
    if (path.startsWith('league/')) source.responses[path.replace(old.seedLeagueId, oldId)] = structuredClone(value);
  }
  const previous = source.responses[`league/${oldId}`] as any;
  Object.assign(previous, { league_id: oldId, season: '2020', status: 'complete' });
  previous.settings.playoff_week_start = 3;
  (source.responses[`league/${source.seedLeagueId}`] as any).previous_league_id = oldId;
  source.responses[`league/${oldId}/winners_bracket`] = [{ r: 1, m: 1, t1: 1, t2: 2, w: 2, l: 1, p: 1 }];
  for (const row of (source.responses[`league/${oldId}/matchups/3`] as any[]).slice(2)) row.matchup_id = null;
  return source;
}
