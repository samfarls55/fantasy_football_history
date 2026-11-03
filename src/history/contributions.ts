import { contextualPickups, pickupStarts } from './pickups.ts';
import { contextualDrops, selectedDrop } from './drops.ts';
import { resolveOwnership } from './ownership.ts';
import { readArchive } from './store.ts';
import { exactSum } from './decimal.ts';
import { inScope } from './scope.ts';
import type { Archive, Performance, Scope } from './types.ts';
import type { RecordCandidate, RecordSelection } from './records.ts';

export interface ContributionIdentity { personId?: string; franchiseId?: string }
export const contributionViews = ['all', 'pickups', 'drops'] as const;
export type ContributionView = typeof contributionViews[number];
export interface ContributionSelection { storePath?: string; season?: string; scope?: Scope; pickup?: string; view?: ContributionView; event?: string }
export interface RecordedStart { performance: Performance; playerId: string; points: number }

/** Completed paired weekly legs are the shared actual-start boundary, including unresolved multiweek contests. */
export function recordedStarts(archive: Archive, identity: ContributionIdentity = {}, selection: ContributionSelection = {}): RecordedStart[] {
  return archive.performances.filter(row => (!identity.personId || row.personId === identity.personId)
    && (!identity.franchiseId || row.franchiseId === identity.franchiseId)
    && (!selection.season || row.year === selection.season)
    && inScope(row.competition, selection.scope ?? 'regular')).flatMap(performance => performance.starters
    .filter(player => player.playerId !== '0' && player.points !== null)
    .map(player => ({ performance, playerId: player.playerId, points: player.points! })));
}

function context(archive: Archive, identity: ContributionIdentity) {
  const person = archive.people.find(person => person.id === identity.personId);
  const franchise = archive.franchises.find(franchise => franchise.id === identity.franchiseId);
  if (!person && !franchise) return null;
  const entries = archive.seasons.flatMap(season => season.teams.filter(team => person ? team.personId === person.id : team.franchiseId === franchise!.id).map(team => ({ year: season.year, team }))).sort((a, b) => b.year.localeCompare(a.year));
  const latest = entries[0];
  if (!latest) return null;
  return { id: person?.id ?? franchise!.id, name: person?.name ?? latest.team.name, kind: person ? 'person' as const : 'franchise' as const,
    path: person ? `/managers/${person.id}/` : `/franchises/${franchise!.id}/`, avatar: latest.team.avatar, entries, years: entries.map(entry => entry.year) };
}
function query(scope: Scope, season?: string) { const params = new URLSearchParams({ scope }); if (season) params.set('season', season); return params.toString(); }
export function playerContributionHref(identity: ContributionIdentity, playerId: string, selection: ContributionSelection = {}): string {
  return `/${identity.personId ? `managers/${identity.personId}` : `franchises/${identity.franchiseId}`}/players/${playerId}/?${query(selection.scope ?? 'regular', selection.season)}`;
}
/** One historical game context for every actual-start contribution view. */
export function startGame(archive: Archive, start: RecordedStart, scope: Scope) {
  const performance = start.performance;
  const contest = archive.contests.find(contest => contest.id === performance.contestId)!;
  const opponentPerformance = archive.performances.find(other => other.contestId === contest.id && other.week === performance.week && other.rosterId !== performance.rosterId)!;
  const owner = archive.people.find(person => person.id === performance.personId)!;
  const opponent = archive.people.find(person => person.id === opponentPerformance.personId)!;
  return { year: performance.year, week: performance.week, points: start.points, owner, opponent, teamPoints: performance.points, opponentPoints: opponentPerformance.points,
    result: contest.complete ? contest.tie ? 'T' : contest.winnerId === owner.id ? 'W' : 'L' : '—',
    href: `/seasons/${performance.year}/matchups/${contest.id}/?scope=${scope}&week=${performance.week}&player=${start.playerId}&team=${performance.rosterId}#player-${performance.rosterId}-${start.playerId}`,
    opponentHref: `/managers/${opponent.id}/seasons/${performance.year}/?scope=${scope}`,
    ownerHref: playerContributionHref({ personId: owner.id }, start.playerId, { scope, season: performance.year }) };
}
function summarize(archive: Archive, starts: RecordedStart[]) {
  const metric = exactSum(starts.map(row => row.points));
  const years = [...new Set(starts.map(row => row.performance.year))].sort();
  const owners = [...new Set(starts.map(row => row.performance.personId))].map(id => archive.people.find(person => person.id === id)!);
  return { metric, points: metric.toNumber(), starts: starts.length, range: years.length ? years[0] === years.at(-1) ? years[0] : `${years[0]}–${years.at(-1)}` : '—', owners };
}
function contributors(archive: Archive, identity: ContributionIdentity, selection: ContributionSelection) {
  const starts = recordedStarts(archive, identity, selection);
  const grouped = new Map<string, RecordedStart[]>();
  for (const start of starts) {
    const key = identity.personId || identity.franchiseId ? start.playerId : `${start.playerId}:${start.performance.personId}`;
    const group = grouped.get(key) ?? []; group.push(start); grouped.set(key, group);
  }
  return [...grouped.entries()].map(([id, starts]) => {
    const first = starts[0];
    const player = archive.players.find(player => player.id === first.playerId)!;
    const scopedIdentity = identity.personId || identity.franchiseId ? identity : { personId: first.performance.personId };
    const owner = archive.people.find(person => person.id === first.performance.personId)!;
    return { id, playerId: player.id, name: player.name, owner, ...summarize(archive, starts), href: playerContributionHref(scopedIdentity, player.id, selection), performances: starts };
  }).sort((a, b) => b.metric.compare(a.metric) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/** Lists actual starting contributors in the selected person, franchise or whole-season context. */
export async function readContributors(identity: ContributionIdentity = {}, selection: ContributionSelection = {}) {
  const archive = await readArchive(selection.storePath);
  if (!archive) return null;
  const selectedContext = identity.personId || identity.franchiseId ? context(archive, identity) : null;
  if ((identity.personId || identity.franchiseId) && !selectedContext) return null;
  const years = selectedContext?.years ?? archive.seasons.map(season => season.year);
  const season = years.includes(selection.season!) ? selection.season : undefined;
  const drop = selection.event ? selectedDrop(archive, identity, { ...selection, season }) : null;
  if (selection.event && !drop) return null;
  return { pickups: contextualPickups(archive, identity, { ...selection, season }), drops: contextualDrops(archive, identity, { ...selection, season }), selectedDrop: drop,
    view: contributionViews.includes(selection.view!) ? selection.view! : 'all',
    rows: contributors(archive, identity, { ...selection, season }).map(({ metric, performances, ...row }) => row), years, season, scope: selection.scope ?? 'regular', context: selectedContext };
}

/** Player detail totals cover the whole scope; its season selector applies locally to the game list. */
export async function readPlayerContributions(identity: ContributionIdentity, playerId: string, selection: ContributionSelection = {}) {
  const archive = await readArchive(selection.storePath);
  if (!archive) return null;
  const selectedContext = context(archive, identity);
  const player = archive.players.find(player => player.id === playerId);
  if (!selectedContext || !player) return null;
  const scope = selection.scope ?? 'regular';
  const spell = selection.pickup ? resolveOwnership(archive).spells.find(spell => spell.id === selection.pickup && spell.pickupCandidate && spell.playerId === playerId && spell.personId === identity.personId) : null;
  if (selection.pickup && !spell) return null;
  const starts = spell ? pickupStarts(archive, spell, { scope }) : recordedStarts(archive, identity, { scope }).filter(row => row.playerId === playerId);
  const { metric, ...totals } = summarize(archive, starts);
  const seasons = selectedContext.entries.flatMap(({ year, team }) => {
    const rows = starts.filter(row => row.performance.year === year);
    if (!rows.length) return [];
    const { metric, ...summary } = summarize(archive, rows);
    return [{ year, ...summary, owner: archive.people.find(person => person.id === team.personId)!, href: `${selectedContext.path}seasons/${year}/?tab=players&scope=${scope}` }];
  });
  const season = spell?.year ?? (selectedContext.years.includes(selection.season!) ? selection.season! : seasons[0]?.year ?? selectedContext.years[0]);
  const selectedTeam = selectedContext.entries.find(entry => entry.year === season)!.team;
  const games = starts.filter(row => row.performance.year === season).sort((a, b) => b.performance.week - a.performance.week).map(start => startGame(archive, start, scope));
  return { player, context: selectedContext, ...totals, seasons, season, years: spell ? [spell.year] : selectedContext.years, games, scope,
    pickup: spell ? { id: spell.id, year: spell.year, week: spell.addWeek, departureWeek: spell.departureWeek } : null,
    wholeHistoryHref: spell ? playerContributionHref(identity, playerId, { scope, season: spell.year }) : null,
    contextHref: spell ? `${selectedContext.path}seasons/${spell.year}/?tab=players&scope=${scope}` : `${selectedContext.path}?tab=players&${query(scope, selection.season)}`,
    franchiseHref: identity.personId && !spell ? playerContributionHref({ franchiseId: selectedTeam.franchiseId }, playerId, { scope, season }) : null };
}

/** Player/person pairs use the same exact totals as the contextual contributor lists. */
export function contributionCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  return contributors(archive, {}, selection).map(row => {
    const latest = [...row.performances].sort((a, b) => b.performance.year.localeCompare(a.performance.year) || b.performance.week - a.performance.week)[0].performance;
    return { id: row.id, personId: row.owner.id, name: row.name, avatar: null, metric: row.metric,
      sample: `${row.starts} ${row.starts === 1 ? 'start' : 'starts'}`, leaderContext: `${row.owner.name} · ${row.starts} ${row.starts === 1 ? 'start' : 'starts'}`, period: { year: latest.year, week: latest.week, playedAt: latest.playedAt }, href: row.href, historyLabel: 'Open player history',
      secondary: [{ name: row.owner.name, href: `/managers/${row.owner.id}/?tab=players&${query(selection.scope ?? 'regular', selection.season)}` }] };
  });
}
