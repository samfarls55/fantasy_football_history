import { loadArchive } from './store.ts';
import type { Archive, Season, SeasonTeam } from './types.ts';
import { sumPoints } from './decimal.ts';

export const standingSorts = ['standing', 'name', 'record', 'points'] as const;
export type StandingSort = typeof standingSorts[number];
export interface StandingRow extends SeasonTeam { personName: string; record: string; wins: number; losses: number; ties: number; points: number }

export async function readSeasons(storePath?: string): Promise<Season[]> {
  return (await loadArchive(storePath))?.seasons ?? [];
}

function standings(archive: Archive, season: Season): StandingRow[] {
  const rows = season.teams.map(team => {
    const games = archive.contests.filter(game => game.seasonId === season.id && game.competition === 'regular' && game.sides.some(side => side.rosterId === team.rosterId));
    const wins = games.filter(game => game.winnerId === team.personId).length;
    const ties = games.filter(game => game.tie).length;
    const losses = games.length - wins - ties;
    const points = sumPoints(archive.performances.filter(performance => performance.seasonId === season.id && performance.competition === 'regular' && performance.rosterId === team.rosterId).map(performance => performance.points));
    return { ...team, personName: archive.people.find(person => person.id === team.personId)!.name, wins, losses, ties, points, record: `${wins}–${losses}${ties ? `–${ties}` : ''}` };
  });
  rows.sort((a, b) => (b.wins + b.ties / 2) - (a.wins + a.ties / 2) || b.points - a.points || a.rosterId.localeCompare(b.rosterId));
  let standing = 1;
  for (const [index, row] of rows.entries()) {
    if (index && (row.wins + row.ties / 2 !== rows[index - 1].wins + rows[index - 1].ties / 2 || row.points !== rows[index - 1].points)) standing = index + 1;
    row.standing = standing;
  }
  return rows;
}

/** Visitor-facing read model; all routes consume the same imported history. */
export async function readSeason(year: string, options: { storePath?: string; sort?: StandingSort } = {}) {
  const archive = await loadArchive(options.storePath);
  const season = archive?.seasons.find(season => season.year === year);
  if (!archive || !season) return null;
  const rows = standings(archive, season);
  if (options.sort === 'name') rows.sort((a, b) => a.personName.localeCompare(b.personName));
  if (options.sort === 'points') rows.sort((a, b) => b.points - a.points || a.personName.localeCompare(b.personName));
  return { ...season, rows };
}
