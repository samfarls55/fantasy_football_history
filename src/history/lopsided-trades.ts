import { exactSum } from './decimal.ts';
import { resolveOwnership } from './ownership.ts';
import { pickupStarts } from './pickups.ts';
import type { Archive } from './types.ts';
import type { RecordCandidate, RecordSelection } from './records.ts';

/** Two-person trades of players alone, by the gap between what each side started of what it received. Picks and waiver budget have no observable value, so a trade with either is left out. */
export function lopsidedTradeCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  const { spells } = resolveOwnership(archive);
  return archive.transactions.filter(row => row.type === 'trade' && row.status === 'complete' && (!selection.season || row.year === selection.season)
    && ![row.source.draft_picks, row.source.waiver_budget].some(assets => Array.isArray(assets) && assets.length)).flatMap(trade => {
    const { teams } = archive.seasons.find(season => season.id === trade.seasonId)!;
    const personIds = new Set([...Object.values(trade.adds), ...Object.values(trade.drops)].map(rosterId => teams.find(team => team.rosterId === rosterId)!.personId));
    if (personIds.size !== 2) return [];
    const [winner, loser] = [...personIds].map(personId => {
      const received = spells.filter(spell => spell.seasonId === trade.seasonId && spell.arrival?.transactionId === trade.id && spell.personId === personId);
      const starts = received.flatMap(spell => pickupStarts(archive, spell, selection));
      return { person: archive.people.find(person => person.id === personId)!, starts, metric: exactSum(starts.map(start => start.points)),
        received: received.map(spell => archive.players.find(player => player.id === spell.playerId)!.name) };
    }).sort((a, b) => b.metric.compare(a.metric));
    const metric = winner.metric.subtract(loser.metric);
    if (!metric.compare(0)) return [];
    return [{ id: `${trade.seasonId}:${trade.id}`, personId: winner.person.id, opponentId: loser.person.id, name: winner.person.name, avatar: null, metric, sample: null, leaderContext: `Week ${trade.week} · ${trade.year}`,
      sides: [winner, loser].map(side => ({ manager: side.person.name, received: side.received, points: side.metric.toNumber() })),
      period: { year: trade.year, week: Math.max(...[...winner.starts, ...loser.starts].map(start => start.performance.week)), playedAt: null },
      href: `/managers/${winner.person.id}/seasons/${trade.year}/?tab=players&scope=${selection.scope ?? 'regular'}` }];
  });
}
