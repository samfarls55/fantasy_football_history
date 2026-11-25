import { managerStats, rankStat, type ManagerStat } from './manager-stats.ts';
import { recordCard, recordCategories, type CardView } from './records.ts';
import type { Place } from './tabs.ts';
import type { Archive } from './types.ts';

/** How a manager stat reads on a card, where a label that leans on its column would lose its meaning, and whether its worst end leads. A stat that isn't here leads under its label with its best. */
const wording: Record<string, { name?: string; verb?: string; shame?: boolean; worst?: boolean }> = {
  titles: { name: 'Most titles' },
  record: { name: 'Most wins' },
  'losses-better-lineup': { name: 'Most losses a better lineup wins', shame: true, worst: true },
  'most-started': { name: 'Most starts by one player for one manager', verb: 'started' },
  'most-drafted': { verb: 'drafted' },
  'drafted-team': { verb: 'drafted' },
  'drafted-college': { verb: 'drafted' },
  pickups: { name: 'Most pickups' },
  'failed-claims': { name: 'Most failed claims', shame: true },
  trades: { name: 'Most trades' },
};

function statCard(archive: Archive, stat: ManagerStat): CardView | null {
  const { rows, label, ...category } = rankStat(archive, stat);
  const { worst, ...words } = wording[stat.key] ?? {};
  const first = rows.filter(row => row.rank === (worst ? rows.at(-1)!.rank : 1));
  // Equal ranks can read differently: a 5–2 and a 5–3 tie on wins.
  const mixed = first.some(row => row.figure !== first[0].figure);
  const leaders = first.map(({ personId, name: manager, names, figure, value, sample = null }) => ({ id: personId, rank: 1, personId, manager,
    name: manager, names, shown: figure, value, sample: mixed ? figure : sample, ...names && { leaderContext: [manager, sample].filter(Boolean).join(' · ') } }));
  // A stat every manager ties on leads nothing.
  return leaders.length < rows.length ? { category: { ...category, name: label, unit: first[0].unit, ...words }, rows: leaders, leaders } : null;
}

/** The card of the stat a tab leads with: the chosen one or, when nobody holds that, the first on its page that somebody does. */
export function tabLead(archive: Archive, chosen: string, places: readonly Place[]): CardView | null {
  const cards = places.flatMap(place => {
    const records = recordCategories.filter(category => category.place === place).map(category => ({ key: category.key, read: () => recordCard(archive, category) as CardView | null }));
    const stats = managerStats.filter(stat => stat.place === place).map(stat => ({ key: stat.key, read: () => statCard(archive, stat) }));
    // Legacy opens with its table; every other page opens with its cards.
    return place === 'legacy' ? [...stats, ...records] : [...records, ...stats];
  });
  for (const { read } of cards.toSorted((a, b) => Number(b.key === chosen) - Number(a.key === chosen))) {
    const card = read();
    if (card) return { ...card, rows: card.leaders };
  }
  return null;
}
