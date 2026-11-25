import { readArchive } from './store.ts';
import { hasStat, managerStats } from './manager-stats.ts';
import { hasRecord, recordCategories } from './records.ts';
import { swapSeasons } from './schedule-swap.ts';

/** Where a stat lives. Every place is a tab of its own, except that luck and lineups are the two halves of Excuses. */
export type Place = 'home' | 'legacy' | 'games' | 'luck' | 'lineups' | 'players' | 'draft' | 'moves';
/** The league's tabs in order. `anchors` are the sections each took from the one-page league, whose links still land. */
export const tabs = [
  { key: 'home', name: 'Home', places: ['home'], anchors: ['champions', 'records'] },
  { key: 'legacy', name: 'Legacy', places: ['legacy'], anchors: ['careers', 'rivalries'] },
  { key: 'games', name: 'Games', places: ['games'], anchors: [] },
  { key: 'excuses', name: 'Excuses', places: ['luck', 'lineups'], anchors: [] },
  { key: 'players', name: 'Players', places: ['players'], anchors: [] },
  { key: 'draft', name: 'Draft', places: ['draft'], anchors: [] },
  { key: 'moves', name: 'Moves', places: ['moves'], anchors: [] },
] as const satisfies { key: string; name: string; places: Place[]; anchors: string[] }[];
export type TabKey = typeof tabs[number]['key'];
/** Every league has seasons and managers, so champions and careers always have a place. */
const always: Place[] = ['home', 'legacy'];

/** The tabs a league has a stat for, each with the places that have one and the record and section anchors that lead to it. */
export async function readTabs(options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  const at = (place: Place) => recordCategories.filter(category => category.place === place);
  return tabs.map(tab => ({ key: tab.key, name: tab.name,
    places: tab.places.filter((place: Place) => always.includes(place) || place === 'luck' && swapSeasons(archive).length || at(place).some(category => hasRecord(archive, category))
      || managerStats.some(stat => stat.place === place && hasStat(archive, stat))) as Place[],
    anchors: [...tab.anchors, ...tab.places.flatMap((place: Place) => at(place).map(category => category.key))],
  })).filter(tab => tab.places.length);
}
