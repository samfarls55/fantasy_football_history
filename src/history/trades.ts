import { readArchive } from './store.ts';
import type { Archive } from './types.ts';

/** Every completed trade with the ID of each person in it, whatever they exchanged. The import has checked the source's rosters. */
export function completedTrades(archive: Archive) {
  return archive.transactions.filter(row => row.type === 'trade' && row.status === 'complete').map(transaction => {
    const { teams } = archive.seasons.find(season => season.id === transaction.seasonId)!;
    return { transaction, personIds: [...new Set(transaction.source.roster_ids.map(id => teams.find(team => team.rosterId === String(id))!.personId))] };
  });
}

/** Everyone who has traded, the most trades first, and how often each pair has shared one. */
export async function readTradeMap(options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  const trades = completedTrades(archive).map(trade => new Set(trade.personIds));
  const count = (...ids: string[]) => trades.filter(people => ids.every(id => people.has(id))).length;
  const managers = archive.people.filter(person => count(person.id))
    .sort((a, b) => count(b.id) - count(a.id) || a.name.localeCompare(b.name));
  const pairs = managers.flatMap((a, index) => managers.slice(index + 1).map(b => ({ a, b, count: count(a.id, b.id) })))
    .filter(pair => pair.count).sort((a, b) => b.count - a.count);
  return { managers, pairs };
}
