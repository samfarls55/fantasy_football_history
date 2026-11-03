import { Exact } from './decimal.ts';
import { playerContributionHref } from './contributions.ts';
import { inScope } from './scope.ts';
import type { Archive } from './types.ts';
import type { RecordCandidate, RecordSelection } from './records.ts';

/** The importer retains the historical weekly roster minus its actual starters. */
export function benchCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  const scope = selection.scope ?? 'regular';
  return archive.performances.filter(row => (!selection.season || row.year === selection.season) && inScope(row.competition, scope)).flatMap(performance =>
    performance.bench.filter(row => row.playerId !== '0' && row.points !== null).map(row => {
      const player = archive.players.find(player => player.id === row.playerId)!;
      const owner = archive.people.find(person => person.id === performance.personId)!;
      return {
        id: `${performance.id}-${row.playerId}`, personId: owner.id, name: player.name,
        // Historical player portraits are not supplied; use the shared initials frame.
        avatar: null, metric: Exact.from(row.points!), sample: null,
        detail: performance.teamName !== owner.name ? performance.teamName : undefined, leaderContext: `${owner.name} · Week ${performance.week} · ${performance.year}`,
        period: { year: performance.year, week: performance.week, playedAt: performance.playedAt },
        href: `/seasons/${performance.year}/matchups/${performance.contestId}/?scope=${scope}&week=${performance.week}&player=${player.id}&team=${performance.rosterId}#player-${performance.rosterId}-${player.id}`,
        historyLabel: 'Open matchup', secondary: [
          { name: owner.name, href: `/managers/${owner.id}/seasons/${performance.year}/?scope=${scope}` },
          { name: 'Player history', href: playerContributionHref({ personId: owner.id }, player.id, { scope, season: performance.year }) },
        ],
      };
    }));
}
