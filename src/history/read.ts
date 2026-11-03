import { loadArchive } from './store.ts';
import type { Archive, Season, SeasonTeam, Scope, Competition } from './types.ts';
import { sumPoints } from './decimal.ts';

export const standingSorts = ['standing', 'name', 'record', 'points'] as const;
export type StandingSort = typeof standingSorts[number];
export interface StandingRow extends SeasonTeam { personName: string; record: string; wins: number; losses: number; ties: number; points: number }

export async function readSeasons(storePath?: string): Promise<Season[]> {
  return (await loadArchive(storePath))?.seasons ?? [];
}

function standings(archive: Archive, season: Season, scope: Scope): StandingRow[] {
  const rows = season.teams.map(team => {
    const games = completedContests(archive, { seasonId: season.id, scope }).filter(game => game.sides.some(side => side.rosterId === team.rosterId));
    const wins = games.filter(game => game.winnerId === team.personId).length;
    const ties = games.filter(game => game.tie).length;
    const losses = games.length - wins - ties;
    const points = sumPoints(archive.performances.filter(performance => performance.seasonId === season.id && inScope(performance.competition, scope) && performance.rosterId === team.rosterId).map(performance => performance.points));
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
export async function readSeason(year: string, options: { storePath?: string; sort?: StandingSort; scope?: Scope } = {}) {
  const archive = await loadArchive(options.storePath);
  const season = archive?.seasons.find(season => season.year === year);
  if (!archive || !season) return null;
  const rows = standings(archive, season, options.scope ?? 'regular');
  if (options.sort === 'name') rows.sort((a, b) => a.personName.localeCompare(b.personName));
  if (options.sort === 'points') rows.sort((a, b) => b.points - a.points || a.personName.localeCompare(b.personName));
  return { ...season, rows };
}

export const gameScopes: Scope[] = ['regular', 'playoffs', 'combined', 'consolation', 'placement'];
export const competitionLabels: Record<Scope, string> = { regular: 'Regular season', playoffs: 'Championship playoffs', combined: 'Regular + playoffs', consolation: 'Consolation', placement: 'Placement' };
export function inScope(competition: Competition, scope: Scope): boolean {
  return scope === 'combined' ? competition === 'regular' || competition === 'playoffs' : competition === scope;
}

/** Shared W-L-T boundary. Weekly score/start queries deliberately use performances instead. */
export function completedContests(archive: Archive, options: { scope?: Scope; seasonId?: string } = {}) {
  return archive.contests.filter(game => game.complete && (!options.seasonId || game.seasonId === options.seasonId) && inScope(game.competition, options.scope ?? 'regular'));
}

/** Completed weekly legs remain visitable even while the encompassing contest is unresolved. */
export async function readSeasonMatchups(year: string, options: { storePath?: string; scope?: Scope; week?: number } = {}) {
  const archive = await loadArchive(options.storePath);
  const season = archive?.seasons.find(season => season.year === year);
  if (!archive || !season) return null;
  const scope = options.scope ?? 'regular';
  const eligible = archive.contests.filter(game => game.seasonId === season.id && inScope(game.competition, scope));
  const weeks = [...new Set(archive.performances.filter(performance => performance.seasonId === season.id && inScope(performance.competition, scope)).map(performance => performance.week))].sort((a, b) => a - b);
  const week = options.week && season.completedWeeks.includes(options.week) ? options.week : weeks.at(-1) ?? season.completedWeeks.at(-1) ?? null;
  const games = eligible.filter(game => game.weeks.includes(week!) && game.performanceIds.some(id => archive.performances.some(performance => performance.id === id && performance.week === week))).map(game => ({ ...game, weeklySides: game.sides.map(side => ({ ...side, points: archive.performances.find(performance => performance.contestId === game.id && performance.week === week && performance.rosterId === side.rosterId)!.points, avatar: season.teams.find(team => team.rosterId === side.rosterId)!.avatar })) }));
  return { year, scope, week, weeks: season.completedWeeks, games };
}

export async function readMatchup(year: string, contestId: string, options: { storePath?: string; week?: number } = {}) {
  const archive = await loadArchive(options.storePath);
  const season = archive?.seasons.find(season => season.year === year);
  const contest = archive?.contests.find(game => game.id === contestId && game.seasonId === season?.id);
  if (!archive || !season || !contest) return null;
  const performances = archive.performances.filter(performance => performance.contestId === contest.id);
  const weeks = [...new Set(performances.map(performance => performance.week))].sort((a, b) => a - b);
  if (!weeks.length) return null;
  const week = options.week && weeks.includes(options.week) ? options.week : weeks.at(-1)!;
  const lineups = contest.sides.map(side => {
    const performance = performances.find(performance => performance.week === week && performance.rosterId === side.rosterId)!;
    const team = season.teams.find(team => team.rosterId === side.rosterId)!;
    const named = (players: typeof performance.starters) => players.map(player => ({ ...player, name: archive.players.find(item => item.id === player.playerId)?.name ?? `Player ${player.playerId}` }));
    return { ...performance, avatar: team.avatar, personName: archive.people.find(person => person.id === team.personId)!.name, starters: named(performance.starters), bench: named(performance.bench) };
  });
  return { ...contest, week, completedWeeks: weeks, lineups };
}
