import { recordsSource } from './records-source.ts';

const account = (roster: number) => `96000000000000${String(roster).padStart(4, '0')}`;
export interface DraftOptions { id: string; rounds?: number; slots?: number; order?: number[]; keepers?: Record<string, boolean>; traded?: Record<string, number>; source?: object; settings?: object }
/** A four-team draft. `order` lists the roster at each slot, `traded` the roster that made a pick from someone else's slot. Round 3, slot 2 picks player 32. */
export function draftOf({ id, rounds = 4, slots = rounds, order = [1, 2, 3, 4], keepers = {}, traded = {}, source = {}, settings = {} }: DraftOptions) {
  const picks = Array.from({ length: rounds * 4 }, (_, index) => {
    const round = Math.floor(index / 4) + 1;
    const slot = round % 2 ? index % 4 + 1 : 4 - index % 4;
    const player = `${round}${slot}`;
    return { draft_id: id, player_id: player, roster_id: traded[player] ?? order[slot - 1], picked_by: '', round, draft_slot: slot, pick_no: index + 1, is_keeper: keepers[player] ?? null, metadata: { team: 'TB' } };
  });
  return { draft: { draft_id: id, sport: 'nfl', type: 'snake', status: 'complete', settings: { teams: 4, rounds, slots_qb: 1, slots_flex: 1, slots_bn: slots - 2, player_type: 0, ...settings },
    draft_order: Object.fromEntries(order.map((roster, index) => [account(roster), index + 1])), ...source }, picks };
}
/** Two regular weeks and a title game each year, newest year first. A lineup is one week's started players and points by roster. */
export function draftsSource(seasons: { year: string; complete?: boolean; champion?: 1 | 2 | null; drafts: ReturnType<typeof draftOf>[]; lineups?: Record<number, Record<string, number>>[]; accounts?: Record<number, string> }[]) {
  const responses: Record<string, any> = { 'state/nfl': { season: seasons[0].year, week: 4 }, 'players/nfl': {} };
  seasons.forEach(({ year, complete = true, champion = 1, drafts, lineups = [], accounts = {} }, index) => {
    const base = recordsSource([[100, 90, 80, 70], [100, 90, 80, 70], champion === 2 ? [90, 100, 0, 0] : [100, 90, 0, 0]]);
    const id = `90000000000000${year}`;
    for (const [path, value] of Object.entries(base.responses)) if (path.startsWith('league/')) responses[path.replace(base.seedLeagueId, id)] = value;
    const league = responses[`league/${id}`];
    Object.assign(league, { league_id: id, season: year, status: complete ? 'complete' : 'in_season', roster_positions: ['QB', 'FLEX', 'BN', 'BN'], previous_league_id: seasons[index + 1] ? `90000000000000${seasons[index + 1].year}` : null });
    league.settings.playoff_week_start = 3;
    if (champion) responses[`league/${id}/winners_bracket`] = [{ r: 1, m: 1, t1: 1, t2: 2, w: champion, l: 3 - champion, p: 1 }];
    for (const row of responses[`league/${id}/matchups/3`].slice(champion ? 2 : 0)) row.matchup_id = null;
    lineups.forEach((lineup, week) => Object.entries(lineup).forEach(([roster, players]) => {
      Object.assign(responses[`league/${id}/matchups/${week + 1}`][Number(roster) - 1], { starters: Object.keys(players), starters_points: Object.values(players), players: Object.keys(players), players_points: players });
    }));
    for (const [roster, user] of Object.entries(accounts)) {
      responses[`league/${id}/users`].push({ user_id: user, display_name: `Newcomer ${roster}`, avatar: null });
      responses[`league/${id}/rosters`][Number(roster) - 1].owner_id = user;
    }
    responses[`league/${id}/drafts`] = drafts.map(({ draft }) => ({ ...draft, league_id: id, season: year }));
    for (const { draft, picks } of drafts) {
      responses[`draft/${draft.draft_id}/picks`] = picks;
      for (const pick of picks) responses['players/nfl'][pick.player_id] = { full_name: `Player ${pick.player_id}`, position: 'QB' };
    }
  });
  return { seedLeagueId: `90000000000000${seasons[0].year}`, responses };
}
