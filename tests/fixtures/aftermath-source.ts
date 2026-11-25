import { recordsSource } from './records-source.ts';

/** One controlled week: who met whom ("12 34" is roster 1 v 2 and 3 v 4), then each roster's starters and, if any, bench, with their points. */
export interface AftermathWeek { pairs: string; starts: Record<number, Record<string, number>>; bench?: Record<number, Record<string, number>> }
export interface AftermathMove { week: number; type: string; adds?: Record<string, number>; drops?: Record<string, number>; status?: string; draft_picks?: unknown[]; waiver_budget?: unknown[] }

/** Four managers, moves in the order listed, and player names equal to their single-letter labels. */
export function aftermathSource(weeks: AftermathWeek[], moves: AftermathMove[]) {
  const source = recordsSource(weeks.map(() => [100, 90, 80, 70]));
  const responses = source.responses as Record<string, any>;
  const named = [...weeks.flatMap(week => [...Object.values(week.starts), ...Object.values(week.bench ?? {})]), ...moves.flatMap(move => [move.adds ?? {}, move.drops ?? {}])].flatMap(Object.keys);
  for (const name of named) responses['players/nfl'][name] = { full_name: `Player ${name}`, position: 'RB' };
  weeks.forEach(({ pairs, starts, bench = {} }, index) => {
    for (const row of responses[`league/${source.seedLeagueId}/matchups/${index + 1}`]) {
      const started = starts[row.roster_id] ?? {}, points = { ...started, ...bench[row.roster_id] };
      Object.assign(row, { matchup_id: pairs.split(' ').findIndex(pair => pair.includes(row.roster_id)) + 1,
        starters: Object.keys(started), starters_points: Object.values(started), players: Object.keys(points), players_points: points });
    }
  });
  moves.forEach(({ week, type, adds = null, drops = null, status = 'complete', draft_picks = [], waiver_budget = [] }, index) =>
    responses[`league/${source.seedLeagueId}/transactions/${week}`].push({ transaction_id: `93000000000000${String(index).padStart(4, '0')}`, leg: week, type, status, status_updated: 1000 + index, created: 900 + index, adds, drops, roster_ids: [...new Set([...Object.values(adds ?? {}), ...Object.values(drops ?? {})])], draft_picks, waiver_budget, metadata: null }));
  return source;
}

/** The same league with a completed season before it, in which a fifth manager ran roster 1. */
export function withEarlierSeason(source: ReturnType<typeof aftermathSource>, earlier: ReturnType<typeof aftermathSource>) {
  const responses = source.responses as Record<string, any>;
  const past = JSON.parse(JSON.stringify(earlier.responses).replaceAll(earlier.seedLeagueId, '900000000000002020')) as Record<string, any>;
  Object.assign(past['league/900000000000002020'], { season: '2020', status: 'complete' });
  past['league/900000000000002020/users'].push({ user_id: '960000000000000005', display_name: 'Record manager 05', avatar: null });
  past['league/900000000000002020/rosters'][0].owner_id = '960000000000000005';
  responses[`league/${source.seedLeagueId}`].previous_league_id = '900000000000002020';
  Object.assign(responses['players/nfl'], past['players/nfl']);
  return { ...source, responses: { ...past, ...responses } };
}
