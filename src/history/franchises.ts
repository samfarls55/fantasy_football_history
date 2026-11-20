import { readArchive } from './store.ts';
import { careerFacts, extendTenure, readManagerSeason, recordedRange, type HistorySelection, type TimelineEvent, type Tenure, type ManagerGameSort } from './managers.ts';
import type { Archive, Franchise, Person, Season, SeasonTeam } from './types.ts';

type TeamSeason = { season: Season; team: SeasonTeam };
interface OwnershipTenure extends Tenure { owner: Person }

/** Roster continuity spans people; each ownership span retains its own attribution. */
function ownershipTenures(archive: Archive, entries: TeamSeason[]): OwnershipTenure[] {
  const tenures: OwnershipTenure[] = [];
  for (const [index, { season, team }] of entries.entries()) {
    const previous = entries[index - 1];
    const owner = archive.people.find(person => person.id === team.personId)!;
    const adjacent = previous && Number(previous.season.year) + 1 === Number(season.year);
    if (!adjacent || previous.team.personId !== team.personId) {
      const predecessor = adjacent ? archive.people.find(person => person.id === previous.team.personId) ?? null : null;
      const returning = entries.slice(0, index).some(entry => entry.team.personId === team.personId);
      const kind = predecessor ? 'takeover' : returning ? 'return' : 'recorded';
      const label = predecessor ? `Took over from ${predecessor.name}` : returning ? 'Next season in the archive' : 'First season in the archive';
      const events: TimelineEvent[] = [{ year: season.year, kind, label, predecessor }];
      if (team.nameSource === 'historical-roster') events.push({ year: season.year, kind: 'name', label: `Played as ${team.name}`, predecessor: null });
      tenures.push({ franchiseId: team.franchiseId, owner, start: season.year, end: season.year, range: season.year, events });
    } else {
      extendTenure(tenures.at(-1)!, season.year, team, previous.team);
    }
  }
  return tenures;
}

function profile(archive: Archive, franchise: Franchise, options: HistorySelection) {
  const entries = archive.seasons.flatMap(season => season.teams.filter(team => team.franchiseId === franchise.id).map(team => ({ season, team }))).sort((a, b) => a.season.year.localeCompare(b.season.year));
  const latest = entries.at(-1)!;
  const owner = archive.people.find(person => person.id === latest.team.personId)!;
  const tenures = ownershipTenures(archive, entries);
  const seasons = entries.filter(({ season }) => !options.season || season.year === options.season).reverse().map(({ season, team }) => ({ ...team, year: season.year, complete: season.complete, owner: archive.people.find(person => person.id === team.personId)!, facts: careerFacts(archive, { franchiseId: franchise.id }, { ...options, season: season.year }), championship: season.championId === team.personId, runnerUp: season.runnerUpId === team.personId, playoffAppearance: season.playoffPersonIds.includes(team.personId) }));
  const periods: Array<{ start: string; end: string }> = [];
  for (const { season } of entries) {
    const last = periods.at(-1);
    if (last && Number(last.end) + 1 === Number(season.year)) last.end = season.year;
    else periods.push({ start: season.year, end: season.year });
  }
  return { ...franchise, name: latest.team.name, avatar: latest.team.avatar, teamName: latest.team.name, franchiseId: franchise.id, owner, range: periods.map(period => recordedRange(period.start, period.end)).join(', '), tenures, seasons, years: entries.map(({ season }) => season.year).reverse(), facts: careerFacts(archive, { franchiseId: franchise.id }, options), scope: options.scope ?? 'regular', selectedSeason: options.season ?? null };
}

export const franchiseSorts = ['name', 'owner', 'seasons', 'record', 'titles'] as const;
export type FranchiseSort = typeof franchiseSorts[number];

export async function readFranchises(options: HistorySelection & { sort?: FranchiseSort } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  const rows = archive.franchises.map(franchise => profile(archive, franchise, options));
  return rows.sort((a, b) => (options.sort === 'owner' ? a.owner.name.localeCompare(b.owner.name) : options.sort === 'seasons' ? b.years.length - a.years.length : options.sort === 'record' ? b.facts.wins - a.facts.wins : options.sort === 'titles' ? b.facts.championships - a.facts.championships : 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export async function readFranchise(franchiseId: string, options: HistorySelection = {}) {
  const archive = await readArchive(options.storePath);
  const franchise = archive?.franchises.find(franchise => franchise.id === franchiseId);
  return archive && franchise ? profile(archive, franchise, options) : null;
}

export async function readFranchiseSeason(franchiseId: string, year: string, options: HistorySelection & { sort?: ManagerGameSort } = {}) {
  const archive = await readArchive(options.storePath);
  const franchise = archive?.franchises.find(franchise => franchise.id === franchiseId);
  const team = archive?.seasons.find(season => season.year === year)?.teams.find(team => team.franchiseId === franchiseId);
  if (!archive || !franchise || !team) return null;
  const ownerSeason = await readManagerSeason(team.personId, year, options);
  if (!ownerSeason) return null;
  return { ...profile(archive, franchise, { ...options, season: year }), year, team, seasonOwner: archive.people.find(person => person.id === team.personId)!, games: ownerSeason.games, sort: ownerSeason.sort };
}
