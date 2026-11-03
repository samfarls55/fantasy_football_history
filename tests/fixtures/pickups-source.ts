/** Controlled later-full-week ownership history, never copied league statistics. */
export function pickupsSource(base: any) {
  const source = structuredClone(base);
  const id = source.seedLeagueId;
  const league = source.responses[`league/${id}`];
  league.settings.last_scored_leg = 7;
  league.settings.playoff_week_start = 8;
  source.responses['state/nfl'].week = 8;
  // Five full regular weeks follow the initial add; moved-week starts remain visible but uncredited.
  for (let week = 4; week <= 7; week++) source.responses[`league/${id}/matchups/${week}`] = structuredClone(source.responses[`league/${id}/matchups/3`]);
  for (let week = 0; week <= 18; week++) source.responses[`league/${id}/transactions/${week}`] = [];
  function event(id: string, week: number, type: string, adds: any, drops: any, status = 'complete') {
    const row = { transaction_id: id, leg: week, status, type, status_updated: 1000 + Number(id.slice(-2)), created: 900, adds, drops, draft_picks: [], waiver_budget: [], metadata: null };
    source.responses[`league/${source.seedLeagueId}/transactions/${week}`].push(row);
    return row;
  }
  event('920000000000000001', 1, 'waiver', { '50': 7 }, null);
  event('920000000000000002', 4, 'commissioner', null, { '50': 7 });
  event('920000000000000003', 4, 'free_agent', { '50': 10 }, null);
  event('920000000000000004', 5, 'free_agent', null, { '50': 10 });
  event('920000000000000005', 5, 'free_agent', { '50': 7 }, null);
  event('920000000000000006', 7, 'trade', { '50': 10 }, { '50': 7 });
  event('920000000000000007', 2, 'waiver', { '90': 7 }, null, 'failed');
  event('920000000000000008', 2, 'waiver', { '90': 7 }, null, 'pending');
  const trade = event('920000000000000009', 2, 'trade', { '60': 7 }, { '60': 10 });
  trade.draft_picks = [{ season: '2022', round: 1, roster_id: 7, owner_id: 10 }] as any;
  trade.waiver_budget = [{ sender: 7, receiver: 10, amount: 5 }] as any;
  event('920000000000000010', 5, 'commissioner', { '90': 7 }, null);
  // Full weeks 2/3 = 7.1 + 11.2 = 18.3; reacquisition full week 6 = 13.4.
  const points: Record<number, number> = { 1: 100, 2: 7.1, 3: 11.2, 4: 200, 5: 300, 6: 13.4, 7: 400 };
  for (let week = 1; week <= 7; week++) {
    const rows = source.responses[`league/${id}/matchups/${week}`];
    for (const row of rows) {
      row.starters = row.starters.filter((p: string) => !['50', '60'].includes(p));
      row.players = row.players.filter((p: string) => !['50', '60'].includes(p));
      row.starters_points = row.starters.map((p: string) => row.players_points[p] ?? 0);
      delete row.players_points['50']; delete row.players_points['60'];
    }
    const owner = rows.find((r: any) => r.roster_id === (week === 4 || week === 7 ? 10 : 7));
    owner.starters.push('50'); owner.starters_points.push(points[week]); owner.players.push('50'); owner.players_points['50'] = points[week];
    const traded = rows.find((r: any) => r.roster_id === (week === 1 ? 10 : 7));
    traded.starters.push('60'); traded.starters_points.push(6); traded.players.push('60'); traded.players_points['60'] = 6;
  }
  return source;
}
