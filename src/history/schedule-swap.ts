import { readSeason } from './read.ts';
import { completedContests } from './scope.ts';
import { readArchive } from './store.ts';
import type { Archive } from './types.ts';

/** The completed seasons with regular-season games to swap, the newest first. */
export function swapSeasons(archive: Archive) {
  return archive.seasons.filter(season => season.complete && completedContests(archive, { seasonId: season.id }).length);
}

/** One completed season's managers, best actual record first, each with their record under every manager's schedule in that same order; the newest season unless another is named. */
export async function readScheduleSwap(options: { storePath?: string; season?: string } = {}) {
  const archive = await readArchive(options.storePath);
  const seasons = archive ? swapSeasons(archive) : [];
  const season = seasons.find(season => season.year === options.season) ?? seasons[0];
  if (!archive || !season) return null;
  const games = completedContests(archive, { seasonId: season.id });
  const scores = new Map(games.flatMap(game => game.sides.map(side => [`${game.weeks[0]}/${side.rosterId}`, side.points] as const)));
  const teams = (await readSeason(season.year, options))!.rows;
  /** Weeks either manager had a bye hold no game. */
  const swap = (rosterId: string, schedule: string) => {
    let wins = 0, losses = 0, ties = 0;
    for (const { weeks, sides } of games) {
      const owner = sides.find(side => side.rosterId === schedule);
      const points = scores.get(`${weeks[0]}/${rosterId}`);
      if (!owner || points === undefined) continue;
      const opponent = sides.find(side => side !== owner)!;
      // A manager can't play themself, so they play the schedule's owner instead.
      const against = opponent.rosterId === rosterId ? owner.points : opponent.points;
      if (points > against) wins++; else if (points < against) losses++; else ties++;
    }
    return { wins, losses, ties, games: wins + losses + ties };
  };
  const rows = teams.map(team => {
    const actual = swap(team.rosterId, team.rosterId);
    return { id: team.personId, name: team.personName, cells: teams.map(({ rosterId }) => {
      const { wins, losses, ties, games } = swap(team.rosterId, rosterId);
      // Never in a game the same week: no record, rather than 0–0.
      return games ? { ties, record: [wins, losses, ...ties ? [ties] : []].join('–'), actual: rosterId === team.rosterId,
        better: (2 * wins + ties) * actual.games > (2 * actual.wins + actual.ties) * games } : null;
    }) };
  });
  return { year: season.year, years: seasons.map(season => season.year), rows };
}
