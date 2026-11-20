import { Exact } from './decimal.ts';
import { completedContests, inScope } from './scope.ts';
import { readArchive } from './store.ts';
import type { Archive, Contest } from './types.ts';
import type { CategoryDefinition, RecordCandidate, RecordSelection } from './records.ts';

function identity(archive: Archive, personId: string, year: string) {
  const person = archive.people.find(person => person.id === personId)!;
  const team = archive.seasons.find(season => season.year === year)!.teams.find(team => team.personId === personId)!;
  return { personId, name: person.name, avatar: team.avatar };
}

/** Performances are completed weekly legs, including legs of an unresolved contest. */
export const scoreCandidates: NonNullable<CategoryDefinition['candidates']> = (archive, selection) =>
  archive.performances.filter(row => (!selection.season || row.year === selection.season) && inScope(row.competition, selection.scope ?? 'regular')).map(row => ({
    ...identity(archive, row.personId, row.year), id: row.id, metric: Exact.from(row.points), sample: null,
    period: { year: row.year, week: row.week, playedAt: row.playedAt },
    leaderContext: `Week ${row.week} · ${row.year}`,
    href: `/seasons/${row.year}/matchups/${row.contestId}/?scope=${selection.scope ?? 'regular'}&week=${row.week}&team=${row.rosterId}`,
    detail: row.teamName, historyLabel: 'Open matchup',
  }));

/** One final contest, with the two people retained; a tied final has a zero margin. */
export const marginCandidates: NonNullable<CategoryDefinition['candidates']> = (archive, selection) =>
  completedContests(archive, selection).filter(game => !selection.season || game.year === selection.season).map(game => {
    const [side, opponent] = game.sides;
    const scope = selection.scope ?? 'regular';
    const owner = identity(archive, side.personId, game.year);
    const other = identity(archive, opponent.personId, game.year);
    return { ...owner, id: game.id, matchupLabel: `${owner.name} vs ${other.name}`,
      metric: Exact.from(side.points).subtract(opponent.points).abs(), sample: null,
      period: { year: game.year, week: Math.max(...game.weeks), playedAt: game.playedAt },
      leaderContext: `Week ${Math.max(...game.weeks)} · ${game.year}`,
      href: `/seasons/${game.year}/matchups/${game.id}/?scope=${scope}&week=${Math.max(...game.weeks)}`,
      detail: `${side.teamName} vs ${opponent.teamName}`, historyLabel: 'Open matchup',
      secondary: [{ name: other.name, href: `/managers/${opponent.personId}/seasons/${game.year}/?scope=${scope}` }],
    } satisfies RecordCandidate;
  });

type StreakKind = 'winning' | 'losing';
function streakGames(archive: Archive, personId: string, selection: RecordSelection): Contest[] {
  return completedContests(archive, selection)
    .filter(game => (!selection.season || game.year === selection.season) && game.sides.some(side => side.personId === personId))
    .sort((a, b) => a.year.localeCompare(b.year) || Math.max(...a.weeks) - Math.max(...b.weeks) || a.id.localeCompare(b.id));
}
function matchesStreak(game: Contest, personId: string, kind: StreakKind) {
  return !game.tie && (kind === 'winning' ? game.winnerId === personId : game.winnerId !== personId);
}
function longestStreak(archive: Archive, personId: string, kind: StreakKind, selection: RecordSelection): Contest[] {
  const games = streakGames(archive, personId, selection);
  let current: Contest[] = [];
  let longest: Contest[] = [];
  for (const game of games) {
    const matches = matchesStreak(game, personId, kind);
    current = matches ? [...current, game] : [];
    // A repeated personal best retains its latest interval for historical discovery.
    if (current.length && current.length >= longest.length) longest = current;
  }
  return longest;
}
function interval(games: Contest[]) {
  const first = games[0], last = games.at(-1)!;
  return `Week ${Math.min(...first.weeks)} · ${first.year} – Week ${Math.max(...last.weeks)} · ${last.year}`;
}

export function streakCandidates(kind: StreakKind): NonNullable<CategoryDefinition['candidates']> {
  return (archive, selection) => archive.people.flatMap(person => {
    const games = longestStreak(archive, person.id, kind, selection);
    if (!games.length) return [];
    const first = games[0], last = games.at(-1)!;
    const query = new URLSearchParams();
    if (selection.season) query.set('season', selection.season);
    query.set('scope', selection.scope ?? 'regular');
    query.set('streak', kind); query.set('from', first.id); query.set('through', last.id);
    return [{ ...identity(archive, person.id, last.year), id: person.id,
      metric: Exact.from(games.length), sample: null, detail: interval(games), leaderContext: interval(games),
      period: { year: last.year, week: Math.max(...last.weeks), playedAt: last.playedAt },
      href: `/managers/${person.id}/?${query}`, historyLabel: 'Open streak history',
    }];
  });
}

/** A shared history URL keeps its interval even if a later game extends the career best. */
export async function readStreakHistory(personId: string, selection: RecordSelection & { streak?: string | null; from?: string | null; through?: string | null } = {}) {
  if (selection.streak !== 'winning' && selection.streak !== 'losing') return null;
  const archive = await readArchive(selection.storePath);
  if (!archive) return null;
  const eligible = streakGames(archive, personId, selection);
  const start = eligible.findIndex(game => game.id === selection.from);
  const end = eligible.findIndex(game => game.id === selection.through);
  if (start < 0 || end < start) return null;
  const games = eligible.slice(start, end + 1);
  if (!games.every(game => matchesStreak(game, personId, selection.streak as StreakKind))) return null;
  return { kind: selection.streak, interval: interval(games), count: games.length, games: games.map(game => {
    const side = game.sides.find(side => side.personId === personId)!;
    const opponent = game.sides.find(side => side.personId !== personId)!;
    return { id: game.id, year: game.year, weeks: game.weeks, points: side.points, opponentPoints: opponent.points,
      opponentName: archive.people.find(person => person.id === opponent.personId)!.name,
      result: selection.streak === 'winning' ? 'W' : 'L',
      href: `/seasons/${game.year}/matchups/${game.id}/?scope=${selection.scope ?? 'regular'}&week=${Math.max(...game.weeks)}&team=${side.rosterId}`,
    };
  }) };
}
