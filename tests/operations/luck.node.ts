import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishControlledHistory as publish, withHistory } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { readManagerStats } from '../../src/history/manager-stats.ts';
import { readCategory, readRecordsHeld } from '../../src/history/records.ts';

/** Each manager's short name, figure, sample and rank, best first. */
const rows = async (storePath: string, key: string) => (await readManagerStats({ storePath }))!.find(stat => stat.key === key)?.rows
  .map(row => [row.name.replace('Record manager ', 'M'), row.figure, row.sample, row.rank]);
/** Weekly scores, M1 against M2 and M3 against M4. */
const games = (source: ReturnType<typeof recordsSource>, week: number) => source.responses[`league/${source.seedLeagueId}/matchups/${week}`] as any[];

test('published robbed and got-away-with-it counts use competition rank 2, and a tied contest is neither', async () => {
  await withHistory(async storePath => {
    assert.equal(await readManagerStats({ storePath }), null, 'unpublished history has no stats');
    const source = recordsSource([
      [130, 120, 100, 90], // M2 lost with the 2nd-best score; M3 won with the 2nd-worst.
      [130, 120, 120, 90], // M2 and M3 share 2nd both ways: M2 lost and M3 won.
      [120, 110, 120, 90], // Two teams share 1st, so nobody is 2nd best. M2 is 2nd worst and lost.
      [110, 110, 120, 100], // M1 and M2 share 2nd both ways, but they tied each other.
      [100, 130, 90, 80], // M2's override of 95 makes M2 the 2nd-best loser; M3 won with the 2nd-worst.
    ]);
    games(source, 5)[1].custom_points = 95;
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'robbed'), [['M02', '3', '5 weeks', 1], ['M01', '0', '5 weeks', 2], ['M03', '0', '5 weeks', 2], ['M04', '0', '5 weeks', 2]]);
    assert.deepEqual(await rows(storePath, 'got-away'), [['M03', '3', '5 weeks', 1], ['M01', '0', '5 weeks', 2], ['M02', '0', '5 weeks', 2], ['M04', '0', '5 weeks', 2]]);
  });
});

test('published close-game records count margins above 0 and under 5, and rank by the share won', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([
      [100, 95, 80, 80], // A margin of exactly 5 is not close, and a tie isn't decided.
      [100.1, 95.1, 80, 84.99], // 5 again, however the decimals are stored; M4 won by 4.99.
      [100, 99.99, 90, 85], // M1 won by 0.01.
      [90, 94, 85, 80.5], // M2 won by 4; M3 by 4.5.
      [90, 91, 85, 70], // M2 won by 1.
    ]);
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'close-games'), [['M02', '2–1', undefined, 1], ['M03', '1–1', undefined, 2], ['M04', '1–1', undefined, 2], ['M01', '1–2', undefined, 4]]);
    // An official override decides the margin: M4's 4.5-point loss becomes a 15-point one.
    games(source, 4)[3].custom_points = 70;
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'close-games'), [['M04', '1–0', undefined, 1], ['M02', '2–1', undefined, 2], ['M01', '1–2', undefined, 3], ['M03', '0–1', undefined, 4]]);
  });
});

test('published season highs faced wait for a completed season and count a tied high each time', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[100, 80, 70, 60], [100, 90, 95, 50], [80, 85, 75, 55]]);
    await publish(storePath, source);
    assert.equal(await rows(storePath, 'highs-faced'), undefined, 'an unfinished season has no highs yet');
    (source.responses[`league/${source.seedLeagueId}`] as any).status = 'complete';
    await publish(storePath, source);
    // M1's high of 100 came twice, both against M2. M2's 90, M3's 95 and M4's 60 came once each.
    assert.deepEqual(await rows(storePath, 'highs-faced'), [['M02', '2', undefined, 1], ['M01', '1', undefined, 2], ['M03', '1', undefined, 2], ['M04', '1', undefined, 2]]);
    // An override takes M1's week 2 to 99, so M2 faced M1's only high in week 1.
    games(source, 2)[0].custom_points = 99;
    await publish(storePath, source);
    assert.deepEqual((await rows(storePath, 'highs-faced'))!.map(([name, figure, , rank]) => [name, figure, rank]), [['M01', '1', 1], ['M02', '1', 1], ['M03', '1', 1], ['M04', '1', 1]]);
  });
});

/** A completed 2020 before the source's 2021, where roster 2 belonged to someone else. */
function withPreviousOwner(source: ReturnType<typeof recordsSource>, scores: number[][]) {
  const oldId = '900000000000002020';
  const old = structuredClone(recordsSource(scores));
  for (const [path, value] of Object.entries(old.responses)) if (path.startsWith('league/')) source.responses[path.replace(old.seedLeagueId, oldId)] = value;
  Object.assign(source.responses[`league/${oldId}`] as any, { league_id: oldId, season: '2020', status: 'complete' });
  (source.responses[`league/${source.seedLeagueId}`] as any).previous_league_id = oldId;
  Object.assign((source.responses[`league/${oldId}/users`] as any[])[1], { user_id: '960000000000009999', display_name: 'Record manager 99' });
  (source.responses[`league/${oldId}/rosters`] as any[])[1].owner_id = '960000000000009999';
  return source;
}

test('published luck stats stay with the person who held the roster, former managers marked', async () => {
  await withHistory(async storePath => {
    await publish(storePath, withPreviousOwner(recordsSource([[130, 120, 100, 90]]), [[130, 128, 100, 90], [125, 124, 100, 90]]));
    // M99 was robbed twice and faced M1's season high of 130 in 2020. M2 took the roster over and was robbed once in 2021.
    assert.deepEqual(await rows(storePath, 'robbed'), [['M99', '2', '2 weeks', 1], ['M02', '1', '1 week', 2], ['M01', '0', '3 weeks', 3], ['M03', '0', '3 weeks', 3], ['M04', '0', '3 weeks', 3]]);
    assert.deepEqual(await rows(storePath, 'close-games'), [['M01', '2–0', undefined, 1], ['M99', '0–2', undefined, 2]]);
    // M3 and M4 repeated their scores, so each faced a tied high twice. M2 has no completed season: unknown, not zero.
    assert.deepEqual(await rows(storePath, 'highs-faced'), [['M03', '2', undefined, 1], ['M04', '2', undefined, 1], ['M01', '1', undefined, 3], ['M99', '1', undefined, 3]]);
    const robbed = (await readManagerStats({ storePath }))!.find(stat => stat.key === 'robbed')!;
    assert.deepEqual(robbed.rows.filter(row => !row.current).map(row => row.name), ['Record manager 99']);
  });
});

test('published luck stats leave out weeks with fewer than four scores, and stats a small league has no value for', async () => {
  await withHistory(async storePath => {
    // Two managers never have a 2nd-best loss to count; their one game was a 2-point one.
    await publish(storePath, recordsSource([[100, 98]]));
    assert.deepEqual((await readManagerStats({ storePath, places: ['luck'] }))!.map(stat => [stat.key, stat.rows.map(row => row.figure)]), [['close-games', ['1–0', '0–1']]]);
  });
  await withHistory(async storePath => {
    // M3 and M4 have no game in week 2, so only two teams scored and M2's loss doesn't count.
    const source = recordsSource([[130, 120, 100, 90], [130, 120, 100, 90]]);
    for (const row of games(source, 2).slice(2)) row.matchup_id = null;
    await publish(storePath, source);
    assert.deepEqual((await rows(storePath, 'robbed'))![0], ['M02', '1', '1 week', 1]);
    assert.equal(await rows(storePath, 'close-games'), undefined, 'no close game leaves the rate unknown for everyone');
  });
});

test('published most points in a loss and fewest in a win name both managers, and a tied game is neither', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([
      [150, 150, 20, 20], // Ties: neither the 150 nor the 20 was a loss or a win.
      [140, 130, 60, 50],
      [120, 135, 61, 60],
      [90, 80, 75, 60.5], // M2's override of 91 makes M1's 90 the loss.
    ]);
    games(source, 4)[1].custom_points = 91;
    await publish(storePath, source);
    const held = async (key: string) => (await readCategory(key, { storePath }))!.rows.filter(row => row.rank <= 2).map(row => [row.manager, row.result, row.opponent, row.value, row.period!.week, row.rank]);
    assert.deepEqual(await held('points-in-loss'), [
      ['Record manager 02', 'lost', 'Record manager 01', 130, 2, 1],
      ['Record manager 01', 'lost', 'Record manager 02', 120, 3, 2],
    ]);
    assert.deepEqual(await held('points-in-win'), [
      ['Record manager 03', 'won', 'Record manager 04', 60, 2, 1],
      ['Record manager 03', 'won', 'Record manager 04', 61, 3, 2],
    ]);
    // A record in a loss belongs to the manager who lost alone.
    const heldBy = async (id: number) => (await readRecordsHeld(`person-96000000000000000${id}`, { storePath }))!.map(view => view.category.key);
    assert.equal((await heldBy(2)).includes('points-in-loss'), true);
    assert.equal((await heldBy(1)).includes('points-in-loss'), false);
  });
});
