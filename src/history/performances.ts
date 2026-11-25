import { perArchive } from './per-archive.ts';
import type { Archive, Performance } from './types.ts';

const opponents = perArchive(archive => {
  const legs = Map.groupBy(archive.performances, row => `${row.contestId}/${row.week}`);
  return new Map(archive.performances.map(own => [own, legs.get(`${own.contestId}/${own.week}`)!.find(other => other !== own)!]));
});
/** The other side of a weekly leg. */
export function opponentOf(archive: Archive, own: Performance): Performance { return opponents(archive).get(own)!; }

/** How a side fared in a weekly leg. */
export function legResult(own: Performance, opponent: Performance): 'won' | 'lost' | 'tied' {
  return own.points > opponent.points ? 'won' : own.points < opponent.points ? 'lost' : 'tied';
}

/** Every team's regular-season weeks. */
export const regularWeeks = (archive: Archive) => archive.performances.filter(row => row.competition === 'regular');
/** Each regular-season score beside its game and every score of that week. A regular-season game is one week long. */
export function regularScores(archive: Archive) {
  const games = new Map(archive.contests.map(game => [game.id, game]));
  const scores = regularWeeks(archive);
  const weeks = Map.groupBy(scores, row => `${row.seasonId}/${row.week}`);
  return scores.map(own => ({ own, game: games.get(own.contestId)!, week: weeks.get(`${own.seasonId}/${own.week}`)! }));
}

/** Weeks whose lineups their managers set. Sleeper sets a best-ball season's. */
export function managedWeeks(archive: Archive): Performance[] {
  const managed = new Set(archive.seasons.filter(season => season.settings.best_ball !== 1).map(season => season.id));
  return archive.performances.filter(row => managed.has(row.seasonId));
}
