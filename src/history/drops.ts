import { exactSum } from './decimal.ts';
import { recordedStarts, playerContributionHref, startGame, type ContributionIdentity, type ContributionSelection } from './contributions.ts';
import { resolveOwnership, type OwnershipDeparture } from './ownership.ts';
import type { Archive } from './types.ts';
import type { RecordCandidate, RecordSelection } from './records.ts';

/** Every drop keeps its own later same-season history, including starts after a reacquisition. */
export function dropStarts(archive: Archive, event: OwnershipDeparture, selection: ContributionSelection = {}) {
  return recordedStarts(archive, {}, { ...selection, season: event.year }).filter(row => row.playerId === event.playerId && row.performance.seasonId === event.seasonId && row.performance.week > event.week && row.performance.personId !== event.personId);
}
export function dropHref(event: OwnershipDeparture, selection: ContributionSelection = {}) {
  const query = new URLSearchParams({ tab: 'players', scope: selection.scope ?? 'regular', view: 'drops', event: event.id });
  return `/managers/${event.personId}/seasons/${event.year}/?${query}`;
}
function drops(archive: Archive, identity: ContributionIdentity, selection: ContributionSelection) {
  return resolveOwnership(archive).departures.filter(event => event.dropCandidate && (!identity.personId || identity.personId === event.personId) && (!identity.franchiseId || identity.franchiseId === event.franchiseId) && (!selection.season || selection.season === event.year)).map(event => {
    const starts = dropStarts(archive, event, selection), metric = exactSum(starts.map(row => row.points));
    const person = archive.people.find(row => row.id === event.personId)!;
    const player = archive.players.find(row => row.id === event.playerId)!;
    return { event, person, player, starts, metric, href: dropHref(event, selection) };
  }).sort((a, b) => b.metric.compare(a.metric) || a.event.id.localeCompare(b.event.id));
}
export function contextualDrops(archive: Archive, identity: ContributionIdentity, selection: ContributionSelection) {
  const ranked = drops(archive, identity, selection);
  const cutoff = ranked[9]?.metric;
  return ranked.filter((row, index) => index < 10 || cutoff && row.metric.compare(cutoff) === 0).map(row => ({ id: row.event.id, player: row.player, person: row.person, year: row.event.year, week: row.event.week, points: row.metric.toNumber(), starts: row.starts.length, href: row.href }));
}
export function selectedDrop(archive: Archive, identity: ContributionIdentity, selection: ContributionSelection) {
  const row = drops(archive, identity, selection).find(row => row.event.id === selection.event);
  if (!row) return null;
  const scope = selection.scope ?? 'regular';
  const receivers = [...new Set(row.starts.map(start => start.performance.personId))].map(personId => {
    const starts = row.starts.filter(start => start.performance.personId === personId);
    const metric = exactSum(starts.map(start => start.points));
    return { person: archive.people.find(person => person.id === personId)!, points: metric.toNumber(), starts: starts.length, metric,
      href: playerContributionHref({ personId }, row.player.id, { scope, season: row.event.year }) };
  }).sort((a, b) => b.metric.compare(a.metric) || a.person.name.localeCompare(b.person.name)).map(({ metric, ...receiver }) => receiver);
  const games = [...row.starts].sort((a, b) => b.performance.week - a.performance.week || a.performance.personId.localeCompare(b.performance.personId)).map(start => startGame(archive, start, scope));
  return { id: row.event.id, player: row.player, person: row.person, year: row.event.year, week: row.event.week, points: row.metric.toNumber(), starts: row.starts.length, receivers, games };
}
export function dropCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  return drops(archive, {}, selection).map(row => ({ id: row.event.id, personId: row.person.id, name: row.player.name, avatar: null, metric: row.metric,
    sample: `${row.starts.length} ${row.starts.length === 1 ? 'start' : 'starts'}`, leaderContext: `${row.person.name} · ${row.event.year} · Week ${row.event.week} drop`,
    period: row.starts.length ? { year: row.event.year, week: Math.max(...row.starts.map(start => start.performance.week)), playedAt: null } : null, href: row.href, historyLabel: 'Open drop history',
    secondary: [{ name: `${row.person.name} · ${row.event.year} · Week ${row.event.week} drop`, href: `/managers/${row.person.id}/seasons/${row.event.year}/?tab=players&scope=${selection.scope ?? 'regular'}` }] }));
}
