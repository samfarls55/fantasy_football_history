import { loadArchive } from './store.ts';
import { Exact, exactSum } from './decimal.ts';
import { completedContests } from './scope.ts';
import { comparePeriods } from './records.ts';
import type { HistorySelection } from './managers.ts';
import type { Archive, Person } from './types.ts';

export function rivalryHref(a: string, b: string, options: HistorySelection & { limit?: 'all' } = {}) {
  const query = new URLSearchParams({ a, b });
  if (options.season) query.set('season', options.season);
  query.set('scope', options.scope ?? 'regular');
  if (options.limit === 'all') query.set('limit', 'all');
  return `/rivalries/?${query}`;
}

function rivalry(archive: Archive, a: Person, b: Person, options: HistorySelection) {
  const games = completedContests(archive, options)
    .filter(game => (!options.season || game.year === options.season) && game.sides.some(side => side.personId === a.id) && game.sides.some(side => side.personId === b.id))
    .map(game => {
      const side = game.sides.find(side => side.personId === a.id)!;
      const opponent = game.sides.find(side => side.personId === b.id)!;
      const week = Math.max(...game.weeks);
      return { id: game.id, year: game.year, week, playedAt: game.playedAt, weeks: game.weeks, side, opponent,
        margin: Exact.from(side.points).subtract(opponent.points).toNumber(),
        result: game.tie ? 'T' as const : game.winnerId === a.id ? 'W' as const : 'L' as const,
        href: `/seasons/${game.year}/matchups/${game.id}/?scope=${options.scope ?? 'regular'}&week=${week}` };
    }).sort((left, right) => comparePeriods(right, left) || left.id.localeCompare(right.id));
  const wins = games.filter(game => game.result === 'W').length;
  const losses = games.filter(game => game.result === 'L').length;
  const ties = games.length - wins - losses;
  const latest = games[0]?.result;
  const streak = latest && latest !== 'T' ? { result: latest, count: games.findIndex(game => game.result !== latest) < 0 ? games.length : games.findIndex(game => game.result !== latest), person: latest === 'W' ? a : b } : null;
  const averageMargin = games.length ? exactSum(games.map(game => Exact.from(game.side.points).subtract(game.opponent.points))).divide(games.length).toNumber() : null;
  return { a, b, scope: options.scope ?? 'regular', wins, losses, ties, meetings: games.length, record: `${wins}–${losses}${ties ? `–${ties}` : ''}`, averageMargin, streak, games, href: rivalryHref(a.id, b.id, options) };
}

/** Every public comparison reads the last durable publication. An absent history is not zero meetings. */
export async function readRivalry(a: string, b: string, options: HistorySelection = {}) {
  const archive = await loadArchive(options.storePath);
  const first = archive?.people.find(person => person.id === a);
  const second = archive?.people.find(person => person.id === b);
  return archive && first && second && first.id !== second.id ? rivalry(archive, first, second, options) : null;
}

function opponents(archive: Archive, person: Person, options: HistorySelection) {
  return archive.people.filter(opponent => opponent.id !== person.id).map(opponent => rivalry(archive, person, opponent, options)).filter(row => row.meetings).sort((a, b) => a.b.name.localeCompare(b.b.name) || a.b.id.localeCompare(b.b.id));
}

export async function readManagerRivalries(personId: string, options: HistorySelection = {}) {
  const archive = await loadArchive(options.storePath);
  const person = archive?.people.find(person => person.id === personId);
  if (!archive || !person) return null;
  const rows = opponents(archive, person, options);
  const deficit = Math.max(0, ...rows.map(row => row.losses - row.wins));
  return { person, rows, nemeses: deficit ? rows.filter(row => row.losses - row.wins === deficit) : [] };
}

export async function readFranchiseRivalries(franchiseId: string, options: HistorySelection = {}) {
  const archive = await loadArchive(options.storePath);
  const franchise = archive?.franchises.find(franchise => franchise.id === franchiseId);
  if (!archive || !franchise) return null;
  const rows = archive.seasons.filter(season => !options.season || season.year === options.season).flatMap(season => {
    const team = season.teams.find(team => team.franchiseId === franchiseId);
    if (!team) return [];
    const owner = archive.people.find(person => person.id === team.personId)!;
    return opponents(archive, owner, { ...options, season: season.year }).map(row => ({ ...row, year: season.year }));
  }).sort((a, b) => b.year.localeCompare(a.year) || a.a.name.localeCompare(b.a.name) || a.b.name.localeCompare(b.b.name));
  return { franchise, rows };
}

export async function readRivalriesPage(options: HistorySelection & { a?: string; b?: string; limit?: string } = {}) {
  const archive = await loadArchive(options.storePath);
  if (!archive) return null;
  const people = archive.people.map(person => {
    const latest = archive.seasons.toSorted((a, b) => b.year.localeCompare(a.year)).flatMap(season => season.teams.filter(team => team.personId === person.id))[0];
    return { ...person, avatar: latest?.avatar ?? person.avatar };
  }).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const a = people.find(person => person.id === options.a);
  const b = people.find(person => person.id === options.b);
  const comparison = a && b && a.id !== b.id ? rivalry(archive, a, b, options) : null;
  const games = options.limit === 'all' ? comparison?.games ?? [] : comparison?.games.slice(0, 10) ?? [];
  return { people, years: archive.seasons.map(season => season.year).sort().reverse(), a: a?.id ?? '', b: b?.id ?? '', comparison, games,
    nextHref: comparison && comparison.meetings > games.length ? rivalryHref(comparison.a.id, comparison.b.id, { ...options, limit: 'all' }) : null };
}

export function streakLabel(row: { meetings: number; streak: { person: Person; count: number } | null }): string {
  return row.streak ? `${row.streak.person.name}, ${row.streak.count} ${row.streak.count === 1 ? 'win' : 'wins'}` : row.meetings ? 'Last meeting tied' : '—';
}
