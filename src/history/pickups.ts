import { readArchive } from './store.ts';
import { exactSum } from './decimal.ts';
import { recordedStarts, playerContributionHref, type ContributionIdentity, type ContributionSelection } from './contributions.ts';
import { resolveOwnership, type OwnershipSpell } from './ownership.ts';
import type { Archive } from './types.ts';
import type { RecordCandidate, RecordSelection } from './records.ts';

export function pickupStarts(archive: Archive, spell: OwnershipSpell, selection: ContributionSelection = {}) {
  return recordedStarts(archive, { personId: spell.personId }, { ...selection, season: spell.year }).filter(row => row.playerId === spell.playerId && row.performance.seasonId === spell.seasonId && row.performance.week > spell.addWeek && (spell.departureWeek === null || row.performance.week < spell.departureWeek));
}
export function pickupHref(spell: OwnershipSpell, selection: ContributionSelection = {}) {
  return `${playerContributionHref({ personId: spell.personId }, spell.playerId, { scope: selection.scope, season: spell.year })}&pickup=${encodeURIComponent(spell.id)}`;
}
function pickups(archive: Archive, identity: ContributionIdentity, selection: ContributionSelection) {
  return resolveOwnership(archive).spells.filter(spell => spell.pickupCandidate && (!identity.personId || identity.personId === spell.personId) && (!identity.franchiseId || identity.franchiseId === spell.franchiseId) && (!selection.season || selection.season === spell.year)).map(spell => {
    const starts = pickupStarts(archive, spell, selection), metric = exactSum(starts.map(row => row.points));
    const person = archive.people.find(row => row.id === spell.personId)!;
    const player = archive.players.find(row => row.id === spell.playerId)!;
    const team = archive.seasons.find(row => row.id === spell.seasonId)!.teams.find(row => row.rosterId === spell.rosterId)!;
    return { spell, person, player, team, starts, metric, href: pickupHref(spell, selection) };
  }).sort((a, b) => b.metric.compare(a.metric) || a.spell.id.localeCompare(b.spell.id));
}
export function contextualPickups(archive: Archive, identity: ContributionIdentity, selection: ContributionSelection) {
  const ranked = pickups(archive, identity, selection);
  const cutoff = ranked[9]?.metric;
  return ranked.filter((row, index) => index < 10 || cutoff && row.metric.compare(cutoff) === 0).map(row => ({ id: row.spell.id, player: row.player, person: row.person, year: row.spell.year, week: row.spell.addWeek, points: row.metric.toNumber(), starts: row.starts.length, href: row.href }));
}
export async function readPickups(identity: ContributionIdentity = {}, selection: ContributionSelection = {}) {
  const archive = await readArchive(selection.storePath);
  return archive ? { rows: contextualPickups(archive, identity, selection), scope: selection.scope ?? 'regular', season: selection.season } : null;
}
export function pickupCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  return pickups(archive, {}, selection).map(row => ({ id: row.spell.id, personId: row.person.id, name: row.player.name, avatar: row.team.avatar, metric: row.metric,
    sample: `${row.starts.length} ${row.starts.length === 1 ? 'start' : 'starts'}`, leaderContext: `${row.person.name} · ${row.spell.year} · Week ${row.spell.addWeek} pickup`,
    period: { year: row.spell.year, week: Math.max(row.spell.addWeek, ...row.starts.map(start => start.performance.week)), playedAt: null }, href: row.href, historyLabel: 'Open pickup history',
    secondary: [{ name: `${row.person.name} · ${row.spell.year} · Week ${row.spell.addWeek} pickup`, href: `/managers/${row.person.id}/seasons/${row.spell.year}/?tab=players&scope=${selection.scope ?? 'regular'}` }] }));
}
