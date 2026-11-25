import { readArchive } from './store.ts';
import { Exact } from './decimal.ts';
import { careerStats, ordinal } from './careers.ts';
import { draftStats } from './drafts.ts';
import { lineupStats } from './lineups.ts';
import { luckStats } from './luck.ts';
import { moveHabitStats } from './move-habits.ts';
import { playerStats } from './player-records.ts';
import { perArchive } from './per-archive.ts';
import { recordUnit } from './records.ts';
import { weeklyStats } from './weekly.ts';
import type { Place } from './tabs.ts';
import type { Archive } from './types.ts';

/** One manager's result in a stat. */
export interface StatValue {
  /** What it ranks by. A number comes from square roots or exponents, so it has no exact form and ranks as displayed. */
  value: Exact | number;
  /** Shown in place of the value: a record that ranks by its rate. */
  shown?: string;
  /** Who or what the value is about. Ties list every answer. */
  names?: string[];
  /** The chances behind the value. */
  sample?: string;
}
type Text = string | ((archive: Archive) => string);
export interface ManagerStat {
  /** Unique across stats and records: it's the column's anchor. */
  key: string;
  /** The table it's a column of. */
  place: Place;
  /** What is counted, in plain words. The league's own data may set it: "150+ point games". */
  label: Text;
  unit: Text; percent?: boolean;
  displayPrecision: number;
  /** One line on how it's counted. */
  rule: string;
  /** Which end ranks first. */
  better: 'higher' | 'lower';
  /** By person ID. A manager whose value is unknown has none. */
  values: (archive: Archive) => Map<string, StatValue>;
}
/** Register per-manager stats here, by place. A place's stats are its table's columns in this order, and the first one orders its rows. */
export const managerStats: ManagerStat[] = [
  // Legacy
  ...careerStats,
  // Games
  ...weeklyStats,
  // Excuses, Luck
  ...luckStats,
  // Excuses, Lineups
  ...lineupStats,
  // Players
  ...playerStats,
  // Draft
  ...draftStats,
  // Moves
  ...moveHabitStats,
];

/** How a rank reads from its end: "Highest", "Tied 2nd lowest". */
export function standing(rank: number, tied: boolean, end: 'highest' | 'lowest'): string {
  const text = `${tied ? 'tied ' : ''}${rank > 1 ? `${ordinal(rank)} ` : ''}${end}`;
  return text[0].toUpperCase() + text.slice(1);
}
function rank(archive: Archive, { values, ...stat }: ManagerStat) {
  const blocked = archive.coverage.some(issue => issue.blocks.includes(stat.key));
  const valued = blocked ? [] : [...values(archive)].map(([personId, { value, ...rest }]) => {
    const { name, current } = archive.people.find(person => person.id === personId)!;
    return { personId, name, current, metric: typeof value === 'number' ? Exact.from(value.toFixed(stat.displayPrecision)) : value, ...rest };
  });
  // Where everyone has zero, nothing has happened yet.
  const known = valued.some(entry => entry.metric.compare(0)) ? valued : [];
  const order = (a: typeof known[number], b: typeof known[number]) => stat.better === 'higher' ? b.metric.compare(a.metric) : a.metric.compare(b.metric);
  known.sort((a, b) => order(a, b) || a.name.localeCompare(b.name) || a.personId.localeCompare(b.personId));
  const resolve = (text: Text) => typeof text === 'string' ? text : known.length ? text(archive) : '';
  const unit = resolve(stat.unit);
  return { ...stat, label: resolve(stat.label), unit, rows: known.map(entry => {
    const { metric, shown, ...row } = entry;
    const value = metric.toNumber();
    const figure = shown ?? `${value.toLocaleString('en-US', { minimumFractionDigits: stat.displayPrecision, maximumFractionDigits: stat.displayPrecision })}${stat.percent ? '%' : ''}`;
    const rank = 1 + known.filter(other => order(other, entry) < 0).length;
    const tied = known.filter(other => order(other, entry) === 0).length > 1;
    return { ...row, value, exactKey: metric.key, figure, unit: `${shown || stat.displayPrecision ? unit : recordUnit(unit, value)}${entry.names && entry.names.length > 1 ? ' each' : ''}`,
      rank, tied, standing: standing(rank, tied, stat.better === 'higher' ? 'highest' : 'lowest') };
  }) };
}
export type StatView = ReturnType<typeof rank>;
const views = perArchive(() => new Map<ManagerStat, StatView>());
/** Everyone's value and rank in a stat, best first. */
export function rankStat(archive: Archive, stat: ManagerStat): StatView {
  const known = views(archive);
  const view = known.get(stat) ?? rank(archive, stat);
  known.set(stat, view);
  return view;
}

/** Whether the stat shows in this league. */
export function hasStat(archive: Archive, stat: ManagerStat): boolean {
  return rankStat(archive, stat).rows.length > 0;
}
/** Every manager's value, sample and rank in each stat of these places, or of all of them, best first. A stat nobody has a value above or below zero for is left out. */
export async function readManagerStats(options: { storePath?: string; places?: readonly Place[] } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  return managerStats.filter(stat => !options.places || options.places.includes(stat.place)).map(stat => rankStat(archive, stat)).filter(view => view.rows.length);
}
