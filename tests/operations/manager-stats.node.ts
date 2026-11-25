import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { Exact } from '../../src/history/decimal.ts';
import { managerStats, readManagerStats, type ManagerStat, type StatValue } from '../../src/history/manager-stats.ts';

const manager = (id: number) => `person-96000000000000000${id}`;
/** Publishes two weeks of four managers and reads a stat registered after them. */
async function read(stat: Partial<ManagerStat>, values: Record<number, StatValue>, prepare = (_: ReturnType<typeof recordsSource>) => {}) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-manager-stats-'));
  const storePath = join(directory, 'history.json');
  managerStats.push({ key: 'later-stat', place: 'draft', label: 'Later stat', unit: 'points', displayPrecision: 0, rule: 'Added later.', better: 'higher',
    values: () => new Map(Object.entries(values).map(([id, value]) => [manager(Number(id)), value])), ...stat });
  try {
    const source = recordsSource([[100, 90, 50, 50], [90, 100, 60, 40]]);
    prepare(source);
    await publish(storePath, source);
    const views = (await readManagerStats({ storePath, places: ['draft'] }))!;
    assert.ok(views.length <= 1, 'other places are not read');
    return views[0];
  } finally {
    managerStats.pop();
    await rm(directory, { recursive: true, force: true });
  }
}
const ranks = (view: Awaited<ReturnType<typeof read>>) => view.rows.map(row => [row.name.slice(-2), row.figure, row.unit, row.rank, row.tied]);

test('published manager stats share competition ranks, start from the better end and leave unknown values out', async () => {
  const values = { 1: { value: Exact.from(3) }, 2: { value: Exact.from(1) }, 4: { value: Exact.from(3) } };
  assert.deepEqual(ranks(await read({}, values)), [['01', '3', 'points', 1, true], ['04', '3', 'points', 1, true], ['02', '1', 'point', 3, false]]);
  assert.deepEqual(ranks(await read({ better: 'lower' }, values)), [['02', '1', 'point', 1, false], ['01', '3', 'points', 2, true], ['04', '3', 'points', 2, true]]);
  assert.equal(await read({}, {}), undefined, 'a stat nobody has a value for is left out');
});

test('published manager stats rank exact values exactly and inexact ones as displayed', async () => {
  const thirds = { 1: { value: Exact.from(100).divide(3) }, 2: { value: Exact.from('33.33') } };
  assert.deepEqual(ranks(await read({ displayPrecision: 1, percent: true }, thirds)), [['01', '33.3%', 'points', 1, false], ['02', '33.3%', 'points', 2, false]]);
  // Ratings of 1523.4 and 1522.6 both show 1,523, so they tie.
  assert.deepEqual(ranks(await read({}, { 1: { value: 1523.4 }, 2: { value: 1522.6 }, 3: { value: 1524 } })), [['03', '1,524', 'points', 1, false], ['01', '1,523', 'points', 2, true], ['02', '1,523', 'points', 2, true]]);
});

test('published manager stats keep every tied name, a record shown for its rate and a label set by the league', async () => {
  const named = await read({ unit: 'starts' }, { 1: { value: Exact.from(44), names: ['Player A', 'Player B'], sample: '96 weeks' }, 2: { value: Exact.from(1), names: ['Player C'] } });
  assert.deepEqual(named.rows.map(row => [row.names, row.figure, row.unit, row.sample]), [[['Player A', 'Player B'], '44', 'starts', '96 weeks'], [['Player C'], '1', 'start', undefined]]);
  const record = await read({ unit: 'wins–losses', displayPrecision: 1 }, { 1: { value: Exact.from(50), shown: '7–7' }, 2: { value: Exact.from(100), shown: '1–0' } });
  assert.deepEqual(ranks(record), [['02', '1–0', 'wins–losses', 1, false], ['01', '7–7', 'wins–losses', 2, false]]);
  const derived = await read({ label: archive => `${Math.max(...archive.performances.map(row => row.points))}+ point games`, unit: archive => `games of ${archive.performances.length}` }, { 1: { value: Exact.from(2) } });
  assert.deepEqual([derived.label, derived.unit], ['100+ point games', 'games of 8']);
});

test('published manager stats leave out one whose required coverage is missing', async () => {
  const value = { 1: { value: Exact.from(2) } };
  // The bench score Sleeper never sent blocks every claim keyed to it.
  const missing = (source: ReturnType<typeof recordsSource>) => Object.assign((source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[])[0], { players: ['7'] });
  assert.equal(await read({ key: 'benched-player' }, value, missing), undefined);
  assert.deepEqual(ranks(await read({}, value, missing)), [['01', '2', 'points', 1, false]]);
});
