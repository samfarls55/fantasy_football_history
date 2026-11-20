import { readArchive } from './store.ts';
import { inScope } from './scope.ts';
import { careerFacts } from './metrics.ts';
export { careerFacts } from './metrics.ts';
export type { CareerFacts } from './metrics.ts';
import type { Archive, Person, Scope, Season, SeasonTeam } from './types.ts';

export interface HistorySelection { storePath?: string; scope?: Scope; season?: string }
export interface TimelineEvent {
  year: string; kind: 'recorded' | 'takeover' | 'return' | 'name'; label: string;
  predecessor: Person | null;
}
export interface Tenure {
  franchiseId: string; start: string; end: string; range: string; events: TimelineEvent[];
}
type TeamSeason = { season: Season; team: SeasonTeam };

export function recordedRange(start: string, end: string) { return start === end ? start : `${start}–${end}`; }

export function extendTenure(tenure: Tenure, year: string, team: SeasonTeam, previousTeam: SeasonTeam): void {
  tenure.end = year;
  tenure.range = recordedRange(tenure.start, tenure.end);
  if (team.nameSource === 'historical-roster' && team.name !== previousTeam.name) tenure.events.push({ year, kind: 'name', label: `Played as ${team.name}`, predecessor: null });
}

function personSeasons(archive: Archive, personId: string): TeamSeason[] {
  return archive.seasons.flatMap(season => season.teams.filter(team => team.personId === personId).map(team => ({ season, team }))).sort((a, b) => a.season.year.localeCompare(b.season.year));
}

/** Year precision comes from season rosters; account metadata never establishes historical names. */
function personTenures(archive: Archive, entries: TeamSeason[]): Tenure[] {
  const tenures: Tenure[] = [];
  for (const [index, { season, team }] of entries.entries()) {
    const previous = entries[index - 1];
    const continuous = previous && previous.team.franchiseId === team.franchiseId && Number(previous.season.year) + 1 === Number(season.year);
    if (!continuous) {
      const predecessorTeam = archive.seasons.find(item => Number(item.year) === Number(season.year) - 1)?.teams.find(item => item.franchiseId === team.franchiseId && item.personId !== team.personId);
      const predecessor = archive.people.find(person => person.id === predecessorTeam?.personId) ?? null;
      const kind = predecessor ? 'takeover' : index ? 'return' : 'recorded';
      const label = predecessor ? `Took over from ${predecessor.name}` : index ? 'Next season in the archive' : 'First season in the archive';
      const events: TimelineEvent[] = [{ year: season.year, kind, label, predecessor }];
      if (team.nameSource === 'historical-roster') events.push({ year: season.year, kind: 'name', label: `Played as ${team.name}`, predecessor: null });
      tenures.push({ franchiseId: team.franchiseId, start: season.year, end: season.year, range: season.year, events });
    } else {
      extendTenure(tenures.at(-1)!, season.year, team, previous.team);
    }
  }
  return tenures;
}

function profile(archive: Archive, person: Person, options: HistorySelection) {
  const entries = personSeasons(archive, person.id);
  const tenures = personTenures(archive, entries);
  const latest = entries.at(-1)!;
  const seasons = entries.filter(({ season }) => !options.season || season.year === options.season).reverse().map(({ season, team }) => ({ ...team, year: season.year, complete: season.complete, facts: careerFacts(archive, { personId: person.id }, { ...options, season: season.year }), championship: season.championId === person.id, runnerUp: season.runnerUpId === person.id, playoffAppearance: season.playoffPersonIds.includes(person.id) }));
  return { ...person, avatar: latest.team.avatar, teamName: latest.team.name, franchiseId: latest.team.franchiseId, range: tenures.map(tenure => tenure.range).join(', '), tenures, seasons, years: entries.map(({ season }) => season.year).reverse(), facts: careerFacts(archive, { personId: person.id }, options), scope: options.scope ?? 'regular', selectedSeason: options.season ?? null };
}

export async function readManagers(options: HistorySelection = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  return archive.people.map(person => profile(archive, person, options)).sort((a, b) => Number(b.current) - Number(a.current) || a.name.localeCompare(b.name));
}

export async function readManager(personId: string, options: HistorySelection = {}) {
  const archive = await readArchive(options.storePath);
  const person = archive?.people.find(person => person.id === personId);
  return archive && person ? profile(archive, person, options) : null;
}

export const managerGameSorts = ['newest', 'oldest', 'points'] as const;
export type ManagerGameSort = typeof managerGameSorts[number];

export async function readManagerSeason(personId: string, year: string, options: HistorySelection & { sort?: ManagerGameSort } = {}) {
  const archive = await readArchive(options.storePath);
  const person = archive?.people.find(person => person.id === personId);
  const season = archive?.seasons.find(season => season.year === year);
  const team = season?.teams.find(team => team.personId === personId);
  if (!archive || !person || !season || !team) return null;
  const context = profile(archive, person, { ...options, season: year });
  const games = archive.contests.filter(game => game.seasonId === season.id && inScope(game.competition, options.scope ?? 'regular') && game.sides.some(side => side.personId === personId) && game.performanceIds.length).map(game => {
    const side = game.sides.find(side => side.personId === personId)!;
    const opponent = game.sides.find(side => side.personId !== personId)!;
    const opponentTeam = season.teams.find(team => team.personId === opponent.personId)!;
    const completedWeek = Math.max(...archive.performances.filter(row => row.contestId === game.id).map(row => row.week));
    return { ...game, side, opponent: { ...opponent, name: archive.people.find(person => person.id === opponent.personId)!.name, avatar: opponentTeam.avatar }, completedWeek,
      result: !game.complete ? '—' : game.tie ? 'T' : game.winnerId === personId ? 'W' : 'L',
      href: `/seasons/${year}/matchups/${game.id}/?scope=${options.scope ?? 'regular'}&week=${completedWeek}` };
  });
  games.sort((a, b) => options.sort === 'oldest' ? a.weeks[0] - b.weeks[0] || a.id.localeCompare(b.id) : options.sort === 'points' ? b.side.points - a.side.points || b.weeks[0] - a.weeks[0] : b.weeks[0] - a.weeks[0] || a.id.localeCompare(b.id));
  return { ...context, year, team, games, sort: options.sort ?? 'newest' };
}
