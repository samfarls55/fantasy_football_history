import { exactSum } from './decimal.ts';
import { resolveOwnership } from './ownership.ts';
import { pickupStarts } from './pickups.ts';
import { completedTrades } from './trades.ts';
import type { Archive } from './types.ts';
import type { RecordCandidate, RecordSelection } from './records.ts';

/** Two-person trades of players alone, by the gap between what each side started of what it received. Picks and waiver budget have no observable value, so a trade with either is left out. */
export function lopsidedTradeCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  const { spells } = resolveOwnership(archive);
  return completedTrades(archive).filter(({ transaction, personIds }) => personIds.length === 2 && (!selection.season || transaction.year === selection.season)
    && ![transaction.source.draft_picks, transaction.source.waiver_budget].some(assets => Array.isArray(assets) && assets.length)).flatMap(({ transaction: trade, personIds }) => {
    const [winner, loser] = personIds.map(personId => {
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
