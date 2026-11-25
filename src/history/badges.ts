import { readArchive } from './store.ts';
import { closeLosses } from './luck.ts';
import { managerStats, rankStat, standing, type ManagerStat } from './manager-stats.ts';

const stat = (key: string) => managerStats.find(stat => stat.key === key)!;
/** Earlier badges go first. Each belongs to whoever has the most of its stat, or the least. */
const badges: { name: string; stat: ManagerStat; end: 'highest' | 'lowest' }[] = [
  { name: 'Juggernaut', stat: stat('top-scores'), end: 'highest' },
  { name: 'Tinkerer', stat: stat('pickups'), end: 'highest' },
  { name: 'Bridesmaid', stat: stat('finals-lost'), end: 'highest' },
  { name: 'Night Owl', stat: stat('late-night'), end: 'highest' },
  { name: 'Wild Card', stat: stat('boom-or-bust'), end: 'highest' },
  { name: 'Metronome', stat: stat('boom-or-bust'), end: 'lowest' },
  { name: 'Own Worst Enemy', stat: stat('losses-better-lineup'), end: 'highest' },
  { name: 'Heartbroken', stat: closeLosses, end: 'highest' },
  { name: 'Cellar Dweller', stat: stat('bottom-scores'), end: 'highest' },
  { name: 'Rollercoaster', stat: stat('one-year-change'), end: 'highest' },
  { name: 'Ride or Die', stat: stat('most-started'), end: 'highest' },
  { name: 'Denied', stat: stat('failed-claims'), end: 'highest' },
  { name: 'Dealmaker', stat: stat('trades'), end: 'highest' },
  { name: 'Robbed', stat: stat('robbed'), end: 'highest' },
  { name: 'Bandit', stat: stat('got-away'), end: 'highest' },
  { name: 'Closer', stat: stat('late-wins'), end: 'highest' },
];

/** Each current manager's badge, if one is left for them, with the stat behind it and its rank among current managers. */
export async function readBadges(options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  const pairs = badges.flatMap(({ name: badge, stat, end }, order) => {
    const { rows, key, place, label, unit, rule, better } = rankStat(archive, stat);
    const current = rows.filter(row => row.current);
    // A stat's ranks count from its better end, so the other end counts back.
    const direction = (better === 'higher') === (end === 'highest') ? 1 : -1;
    // A badge named like its stat would say the name twice, so what the stat counts stands in.
    const counted = label.toLowerCase() === badge.toLowerCase() ? unit[0].toUpperCase() + unit.slice(1) : label;
    return current.filter(row => row.value > 0).map(({ name: manager, ...row }) => {
      const rank = 1 + current.filter(other => direction * (other.rank - row.rank) < 0).length;
      const tied = current.filter(other => other.rank === row.rank).length > 1;
      return { ...row, manager, badge, order, key, place, rule, label: counted,
        rank, tied, standing: standing(rank, tied, end), of: current.length };
    });
  }).sort((a, b) => a.rank - b.rank || a.order - b.order || a.personId.localeCompare(b.personId));
  const worn: typeof pairs = [];
  for (const pair of pairs) if (!worn.some(other => other.badge === pair.badge || other.personId === pair.personId)) worn.push(pair);
  return worn;
}
