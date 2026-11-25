import { exactSum } from './decimal.ts';
import { recordedStarts, type RecordedStart } from './contributions.ts';
import { dropHref } from './drops.ts';
import { resolveOwnership } from './ownership.ts';
import { opponentOf } from './performances.ts';
import type { Archive } from './types.ts';
import type { RecordCandidate, RecordSelection } from './records.ts';

/** Each departure keeps its own later same-season starts against the person who made it, up to that person's next arrival of the player. */
export function exCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  const { events, departures } = resolveOwnership(archive);
  const people = new Map(archive.people.map(person => [person.id, person]));
  const meetings = new Map<string, RecordedStart[]>();
  for (const start of recordedStarts(archive, {}, selection)) {
    const key = `${start.performance.seasonId}:${start.playerId}:${opponentOf(archive, start.performance).personId}`;
    meetings.set(key, [...meetings.get(key) ?? [], start]);
  }
  return departures.filter(event => event.dropCandidate || event.kind === 'trade').flatMap(event => {
    const against = meetings.get(`${event.seasonId}:${event.playerId}:${event.personId}`);
    if (!against) return [];
    const back = events.slice(events.indexOf(event) + 1).find(later => later.direction === 'arrival' && later.seasonId === event.seasonId && later.playerId === event.playerId && later.personId === event.personId);
    const starts = against.filter(({ performance: { week } }) => week > event.week && (!back || week < back.week));
    if (!starts.length) return [];
    return [{ id: event.id, personId: event.personId, name: archive.players.find(player => player.id === event.playerId)!.name, avatar: null, metric: exactSum(starts.map(start => start.points)), sample: null,
      leaderContext: `${people.get(event.personId)!.name} · ${event.kind === 'trade' ? 'Traded' : 'Dropped'} Week ${event.week} · ${event.year} · ${starts.length} ${starts.length === 1 ? 'start' : 'starts'}`, startedForIds: [...new Set(starts.map(start => start.performance.personId))],
      period: { year: event.year, week: Math.max(...starts.map(start => start.performance.week)), playedAt: null }, href: dropHref(event, selection) }];
  });
}
