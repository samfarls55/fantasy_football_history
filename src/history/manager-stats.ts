import { readArchive } from './store.ts';
import { Exact } from './decimal.ts';
import { luckStats } from './luck.ts';
import { playerStats } from './player-records.ts';
import { recordUnit } from './records.ts';
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
  // Games
  // Excuses, Luck
  ...luckStats,
  // Excuses, Lineups
  // Players
  ...playerStats,
  // Draft
  // Moves
];

function rankStat(archive: Archive, { values, ...stat }: ManagerStat) {
  const blocked = archive.coverage.some(issue => issue.blocks.includes(stat.key));
  const known = blocked ? [] : [...values(archive)].map(([personId, { value, ...rest }]) => {
    const { name, current } = archive.people.find(person => person.id === personId)!;
    return { personId, name, current, metric: typeof value === 'number' ? Exact.from(value.toFixed(stat.displayPrecision)) : value, ...rest };
  });
  const order = (a: typeof known[number], b: typeof known[number]) => stat.better === 'higher' ? b.metric.compare(a.metric) : a.metric.compare(b.metric);
  known.sort((a, b) => order(a, b) || a.name.localeCompare(b.name) || a.personId.localeCompare(b.personId));
  const resolve = (text: Text) => typeof text === 'string' ? text : known.length ? text(archive) : '';
  const unit = resolve(stat.unit);
  return { ...stat, label: resolve(stat.label), unit, rows: known.map(entry => {
    const { metric, shown, ...row } = entry;
    const value = metric.toNumber();
    const figure = shown ?? `${value.toLocaleString('en-US', { minimumFractionDigits: stat.displayPrecision, maximumFractionDigits: stat.displayPrecision })}${stat.percent ? '%' : ''}`;
    return { ...row, value, exactKey: metric.key, figure, unit: shown || stat.displayPrecision ? unit : recordUnit(unit, value),
      rank: 1 + known.filter(other => order(other, entry) < 0).length, tied: known.filter(other => order(other, entry) === 0).length > 1 };
  }) };
}
export type StatView = ReturnType<typeof rankStat>;

/** Whether anyone has a value for the stat in this league. */
export function hasStat(archive: Archive, stat: ManagerStat): boolean {
  return rankStat(archive, stat).rows.length > 0;
}
/** Every manager's value, sample and rank in each stat of these places, or of all of them, best first. A stat nobody has a value for is left out. */
export async function readManagerStats(options: { storePath?: string; places?: readonly Place[] } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  return managerStats.filter(stat => !options.places || options.places.includes(stat.place)).map(stat => rankStat(archive, stat)).filter(view => view.rows.length);
}
