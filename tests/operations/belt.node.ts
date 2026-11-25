import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { final, seasonsSource, titled, type Game, type Year } from '../fixtures/seasons-source.ts';
import { readBelt, readManagerBelt } from '../../src/history/belt.ts';
import { readCategory, readRecordsHeld } from '../../src/history/records.ts';

async function published<T>(years: Year[], read: (storePath: string) => Promise<T>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-belt-'));
  try {
    const storePath = join(directory, 'history.json');
    assert.equal(await readBelt({ storePath }), null, 'unpublished history has no belt');
    await publish(storePath, seasonsSource(...years));
    return await read(storePath);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
const reigns = (...years: Year[]) => published(years, async storePath => (await readBelt({ storePath }))!.reigns.map(({ person, from, defenses }) => [person?.name ?? null, from.year, from.week, defenses]));

test('published belt starts with the first champion, moves from the next season on when the holder loses, and stays on a tie', async () => {
  assert.deepEqual(await reigns(
    // Manager 1 loses week 1 before the belt exists, then wins the 2021 final.
    titled([[[1, 2, 90, 100]], [[1, 2, 100, 90]]], 1, 2),
    // A win and a tie are two defenses; manager 3's win takes it; the same weeks' other games move nothing.
    { live: true, weeks: [[[1, 2, 100, 90], [3, 4, 100, 90]], [[1, 4, 80, 80]], [[1, 3, 70, 71], [2, 4, 1, 2]], [[1, 2, 100, 1], [3, 4, 100, 90]]] },
  ), [['M1', '2021', 2, 2], ['M3', '2022', 3, 1]]);
});

test('published belt passes from a holder who left to the latest champion still playing', async () => {
  const played = [
    titled([[[1, 2, 90, 100]], [[1, 2, 100, 90]]], 1, 2),
    // Manager 2 wins the 2022 title, but manager 1 never loses the belt.
    titled([[[1, 3, 100, 90]], [[2, 4, 100, 90]]], 2, 4),
  ];
  // Manager 1's roster goes to manager 5: the belt goes to manager 2, the 2022 champion, not to the roster's new owner.
  const owners = [5, 2, 3, 4];
  assert.deepEqual(await reigns(...played, { owners, live: true, weeks: [[[1, 3, 100, 90]], [[2, 4, 100, 90]], [[1, 2, 100, 90]]] }),
    [['M1', '2021', 2, 1], ['M2', '2023', null, 1], ['M5', '2023', 3, 0]]);
  // It passes as the season opens, before anyone has played.
  assert.deepEqual(await reigns(...played, { owners, live: true, weeks: [] }), [['M1', '2021', 2, 1], ['M2', '2023', null, 0]]);
});

test('published belt is vacant when no champion is left, until the next title', async () => {
  // No champion plays in 2022 and its final isn't played, so 2023 opens vacant too, and wins take nothing.
  const played: Year[] = [titled([[], [[1, 2, 100, 90]]], 1, 2), { owners: [5, 2, 3, 4], weeks: [[[1, 2, 100, 90]]] }];
  assert.deepEqual(await reigns(...played, titled([[[2, 3, 100, 90]], [[4, 2, 100, 90]]], 4, 2, [5, 2, 3, 4]), { owners: [5, 2, 3, 4], live: true, weeks: [[[3, 4, 100, 90]]] }),
    [['M1', '2021', 2, 0], [null, '2022', null, 0], ['M4', '2023', 2, 0], ['M3', '2024', 1, 0]]);
  // It stays vacant even once the old champion is back.
  assert.deepEqual(await reigns(...played, { live: true, weeks: [[[1, 2, 100, 90]]] }), [['M1', '2021', 2, 0], [null, '2022', null, 0]]);
});

test('published belt counts a multiweek playoff once, when it resolves, and leaves out lower-bracket games', async () => {
  // Two-week rounds: the holder trails after the first leg of the semifinal and comes back, then leads the final and loses it.
  const bracket = [
    { r: 1, m: 1, t1: 1, t2: 4, w: 1, l: 4 }, { r: 1, m: 2, t1: 2, t2: 3, w: 2, l: 3 },
    { r: 2, m: 3, t1: 1, t2: 2, t1_from: { w: 1 }, t2_from: { w: 2 }, w: 2, l: 1, p: 1 },
    { r: 2, m: 4, t1: 4, t2: 3, t1_from: { l: 1 }, t2_from: { l: 2 }, w: 4, l: 3, p: 3 },
  ];
  const weeks: Game[][] = [
    [[1, 2, 100, 90], [3, 4, 100, 90]],
    [[1, 4, 50, 90], [2, 3, 100, 90]], [[1, 4, 100, 50], [2, 3, 100, 90]],
    [[1, 2, 90, 50], [4, 3, 100, 90]], [[1, 2, 50, 100], [4, 3, 100, 90]],
  ];
  const first = titled([[], [[1, 2, 100, 90]]], 1, 2);
  // Defended in week 1 and over the weeks 2–3 semifinal, then lost over weeks 4–5; the title is the win that took it.
  assert.deepEqual(await reigns(first, { weeks, playoffs: { start: 2, type: 2, bracket } }, { live: true, weeks: [[[2, 3, 100, 90]]] }),
    [['M1', '2021', 2, 2], ['M2', '2022', 5, 1]]);
  // One leg into the semifinal nothing has moved and nothing is defended.
  const undecided = bracket.map((game, index) => ({ ...game, w: null, l: null, ...index > 1 && { t1: null, t2: null } }));
  assert.deepEqual(await reigns(first, { live: true, weeks: weeks.slice(0, 2), playoffs: { start: 2, type: 2, bracket: undecided } }), [['M1', '2021', 2, 1]]);
  // Out of the playoffs, losing in the lower bracket costs nothing.
  assert.deepEqual(await reigns(first, { weeks: [[[1, 2, 100, 90]], [[2, 3, 100, 90], [1, 4, 50, 90]]], playoffs: { start: 2, bracket: [final(2, 3)], lower: [final(4, 1)] } }), [['M1', '2021', 2, 1]]);
});

test('published belt needs a resolved title', async () => {
  assert.deepEqual(await reigns({ weeks: [[[1, 2, 100, 90]]] }, { live: true, weeks: [[[1, 2, 100, 90]]] }), []);
});

test('published belt runs rank by defenses, with ties sharing the record and a reign without one left out', async () => {
  await published([
    titled([[], [[1, 2, 100, 90]]], 1, 2),
    // Manager 1 defends twice and loses to manager 2, who loses at once to manager 3, who defends twice into 2023 and loses to manager 1.
    { weeks: [[[1, 2, 100, 90]], [[1, 3, 80, 80]], [[1, 2, 90, 100]], [[2, 3, 90, 100]], [[3, 4, 100, 90]]] },
    { live: true, weeks: [[[3, 4, 100, 90]], [[3, 1, 90, 100]], [[1, 4, 100, 90]]] },
  ], async storePath => {
    const view = (await readCategory('belt-run', { storePath }))!;
    assert.deepEqual(view.rows.map(row => [row.rank, row.manager, row.value, row.leaderContext]), [
      [1, 'M1', 2, 'Week 1 · 2022 – Week 2 · 2022'], [1, 'M3', 2, 'Week 5 · 2022 – Week 1 · 2023'], [3, 'M1', 1, 'Week 3 · 2023'],
    ]);
    assert.deepEqual((await readCategory('belt-run', { storePath, season: '2023' }))!.rows.map(row => [row.manager, row.value]), [['M1', 1]], 'a season ranks the reigns that began in it');
    assert.ok((await readRecordsHeld('person-960000000000000003', { storePath }))!.some(held => held.category.key === 'belt-run'));
    const manager = (number: number) => readManagerBelt(`person-96000000000000000${number}`, { storePath });
    assert.deepEqual(await manager(1), { reigns: 2, bestRun: 2 });
    assert.deepEqual(await manager(2), { reigns: 1, bestRun: 0 });
    assert.deepEqual(await manager(4), { reigns: 0, bestRun: null });
  });
  await published([{ live: true, weeks: [[[1, 2, 100, 90]]] }], async storePath => {
    assert.equal(await readManagerBelt('person-960000000000000001', { storePath }), null, 'a league with no title has no belt');
    assert.deepEqual((await readCategory('belt-run', { storePath }))!.rows, []);
  });
});
