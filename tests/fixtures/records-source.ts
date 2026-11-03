/** Synthetic provider responses for rank-boundary checks, never a normalized archive. */
export function recordsSource(scores: number[][]) {
  const id = '900000000000002021';
  const count = scores[0].length;
  const responses: Record<string, unknown> = {
    'state/nfl': { season: '2021', week: scores.length + 1 }, 'players/nfl': {},
    [`league/${id}`]: { league_id: id, previous_league_id: null, season: '2021', season_type: 'regular', sport: 'nfl', status: 'in_season', name: 'Controlled records history', total_rosters: count, roster_positions: ['QB'], scoring_settings: { pass_td: 4 }, settings: { num_teams: count, start_week: 1, playoff_week_start: scores.length + 1, playoff_teams: 2, playoff_round_type: 0, last_scored_leg: scores.length, leg: scores.length } },
    [`league/${id}/users`]: Array.from({ length: count }, (_, index) => ({ user_id: `96000000000000${String(index + 1).padStart(4, '0')}`, display_name: `Record manager ${String(index + 1).padStart(2, '0')}`, avatar: null })),
    [`league/${id}/rosters`]: Array.from({ length: count }, (_, index) => ({ roster_id: index + 1, owner_id: `96000000000000${String(index + 1).padStart(4, '0')}`, metadata: null })),
    [`league/${id}/winners_bracket`]: [], [`league/${id}/losers_bracket`]: [], [`league/${id}/drafts`]: [],
  };
  for (let round = 0; round <= 18; round++) responses[`league/${id}/transactions/${round}`] = [];
  scores.forEach((week, index) => { responses[`league/${id}/matchups/${index + 1}`] = week.map((points, roster) => ({ roster_id: roster + 1, matchup_id: Math.floor(roster / 2) + 1, points, custom_points: null, starters: ['0'], starters_points: [0], players: [], players_points: {} })); });
  return { seedLeagueId: id, responses };
}
