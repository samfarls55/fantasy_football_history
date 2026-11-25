import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { readManagerStats } from '../../src/history/manager-stats.ts';
import { readCategory, readPlaceRecords } from '../../src/history/records.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-move-habits-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
interface Move { type?: string; status?: string; week?: number; at?: string; adds?: Record<string, number> | null; drops?: Record<string, number> | null; rosters?: number[] }
let next = 970000000000000001n;
/** Four managers and one scored week. A move with nothing else said is a completed free-agent event; a player's name is his letter. */
function league(moves: Move[], year = '2021') {
  const source = recordsSource([[100, 90, 80, 70]]);
  const responses = source.responses as Record<string, any>;
  moves.forEach(({ type = 'free_agent', status = 'complete', week = 1, at = '2021-09-15T16:00:00Z', adds = null, drops = null, rosters = [] }, index) => {
    for (const name of Object.keys({ ...adds, ...drops })) responses['players/nfl'][name] = { full_name: `Player ${name}`, position: 'RB' };
    responses[`league/${source.seedLeagueId}/transactions/${week}`].push({ transaction_id: String(next++), leg: week, type, status,
      // A millisecond apart, so one player's moves keep their order.
      status_updated: Date.parse(at) + index, adds, drops, roster_ids: rosters, draft_picks: [], waiver_budget: [] });
  });
  if (year === '2021') return source;
  // An earlier season, finished, in which a fifth manager held roster 1.
  const id = `90000000000000${year}`;
  const past = JSON.parse(JSON.stringify(responses).replaceAll(source.seedLeagueId, id)) as Record<string, any>;
  Object.assign(past[`league/${id}`], { season: year, status: 'complete' });
  past[`league/${id}/users`][0] = { user_id: '960000000000000005', display_name: 'Record manager 05', avatar: null };
  past[`league/${id}/rosters`][0].owner_id = '960000000000000005';
  return { seedLeagueId: id, responses: past };
}
function after(source: ReturnType<typeof league>, earlier: ReturnType<typeof league>) {
  (source.responses[`league/${source.seedLeagueId}`] as any).previous_league_id = earlier.seedLeagueId;
  Object.assign(source.responses['players/nfl'] as any, earlier.responses['players/nfl']);
  return { ...source, responses: { ...earlier.responses, ...source.responses } };
}
/** Each manager's short name, figure, sample and rank, most first. */
const rows = async (storePath: string, key: string) => (await readManagerStats({ storePath, places: ['moves'] }))!.find(stat => stat.key === key)?.rows
  .map(row => [row.name.replace('Record manager ', 'M'), row.figure, row.sample, row.rank]);

test('published pickups count completed waiver and free-agent adds, and failed claims count failed waivers whatever the cause', async () => {
  await withHistory(async storePath => {
    assert.equal(await readManagerStats({ storePath }), null, 'unpublished history has no habits');
    const source = league([
      { type: 'waiver', adds: { a: 1 }, drops: { b: 1 } },
      { adds: { c: 1 } },
      { adds: { d: 2 }, week: 0 },
      { drops: { c: 1 } }, // A drop alone picks nobody up.
      { type: 'commissioner', adds: { e: 3 } },
      { type: 'trade', adds: { d: 3 }, drops: { d: 2 }, rosters: [2, 3] },
      { type: 'free_agent', status: 'failed', adds: { f: 4 } }, // Neither a pickup nor a claim.
      { type: 'waiver', status: 'pending', adds: { f: 4 } },
      { type: 'waiver', status: 'failed', adds: { f: 4 } },
      { type: 'waiver', status: 'failed', adds: { f: 1 }, drops: { a: 1 } },
      { type: 'waiver', status: 'failed', adds: { g: 1 } },
    ]);
    // A failed claim may carry no completion time; it was never completed.
    const failed = (source.responses[`league/${source.seedLeagueId}/transactions/1`] as any[]).find(row => row.status === 'failed' && row.adds.g);
    failed.status_updated = null;
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'pickups'), [['M01', '2', '1 season', 1], ['M02', '1', '1 season', 2], ['M03', '0', '1 season', 3], ['M04', '0', '1 season', 3]]);
    assert.deepEqual(await rows(storePath, 'failed-claims'), [['M01', '2', 'of 3 claims', 1], ['M04', '1', 'of 1 claim', 2], ['M02', '0', 'of 0 claims', 3], ['M03', '0', 'of 0 claims', 3]]);
  });
});

test('published habits are left out when the league never had one to count, and zero when it did', async () => {
  await withHistory(async storePath => {
    await publish(storePath, league([{ drops: { a: 1 } }, { type: 'waiver', status: 'pending', adds: { b: 1 } }]));
    assert.deepEqual(await readManagerStats({ storePath, places: ['moves'] }), []);
    await publish(storePath, league([{ type: 'waiver', adds: { b: 1 } }]));
    assert.deepEqual((await readManagerStats({ storePath, places: ['moves'] }))!.map(stat => [stat.key, stat.rows.map(row => row.figure)]), [
      ['pickups', ['1', '0', '0', '0']], ['failed-claims', ['0', '0', '0', '0']],
    ]);
  });
});

/** M1 makes one free-agent pickup at each time, each of a new player. */
const at = (...times: string[]) => times.map((at, index) => ({ at, adds: { [`p${index}`]: 1 } }));

test('published late-night pickups run midnight to 5am in New York across both daylight saving changes', async () => {
  await withHistory(async storePath => {
    await publish(storePath, league([
      ...at('2021-11-06T04:00:00Z', // Midnight EDT: in.
        '2021-11-06T03:59:59Z', // 11:59:59pm EDT: out.
        '2021-11-06T08:59:59Z', // 4:59:59am EDT: in.
        '2021-11-06T09:00:00Z', // 5am EDT: out.
        '2021-11-07T05:30:00Z', // 1:30am EDT, and an hour later 1:30am EST, as clocks fall back: both in.
        '2021-11-07T06:30:00Z',
        '2021-11-07T09:59:59Z', // 4:59:59am EST: in.
        '2021-11-07T10:00:00Z', // 5am EST: out.
        '2021-11-08T04:30:00Z', // 11:30pm EST, an hour that was midnight two days before: out.
        '2022-03-13T04:59:59Z', // 11:59:59pm EST: out.
        '2022-03-13T05:00:00Z', // Midnight EST: in.
        '2022-03-13T07:00:00Z', // 3am EDT, the moment clocks spring forward: in.
        '2022-03-13T08:59:59Z', // 4:59:59am EDT: in.
        '2022-03-13T09:00:00Z'), // 5am EDT: out.
      { type: 'waiver', at: '2021-11-06T07:00:00Z', adds: { w: 2 } }, // A claim that cleared overnight.
      { status: 'failed', at: '2021-11-06T07:00:00Z', adds: { w: 2 } },
      { at: '2021-11-06T07:00:00Z', drops: { w: 2 } }, // A drop alone.
      { at: '2021-11-06T16:00:00Z', adds: { x: 3 } },
    ]));
    assert.deepEqual(await rows(storePath, 'late-night'), [['M01', '8', 'of 14 free agents', 1], ['M02', '0', 'of 0 free agents', 2], ['M03', '0', 'of 1 free agent', 2], ['M04', '0', 'of 0 free agents', 2]]);
  });
});

test('published Sunday-morning pickups run 11am to 1pm on a New York Sunday across both daylight saving changes', async () => {
  await withHistory(async storePath => {
    await publish(storePath, league([
      ...at('2021-10-31T14:59:59Z', // 10:59:59am EDT: out.
        '2021-10-31T15:00:00Z', // 11am EDT: in.
        '2021-10-31T16:59:59Z', // 12:59:59pm EDT: in.
        '2021-10-31T17:00:00Z', // 1pm EDT: out.
        '2021-11-07T15:30:00Z', // 10:30am EST, the day clocks fall back: out.
        '2021-11-07T16:00:00Z', // 11am EST: in.
        '2021-11-07T17:59:59Z', // 12:59:59pm EST: in.
        '2021-11-07T18:00:00Z', // 1pm EST: out.
        '2021-11-06T16:00:00Z', // Noon on Saturday: out.
        '2021-11-08T17:00:00Z', // Noon on Monday: out.
        '2022-03-06T15:30:00Z', // 10:30am EST: out.
        '2022-03-13T15:30:00Z', // 11:30am EDT, the day clocks spring forward: in.
        '2022-03-13T17:00:00Z'), // 1pm EDT: out.
      { type: 'waiver', at: '2021-11-07T17:00:00Z', adds: { w: 2 } },
    ]));
    assert.deepEqual((await rows(storePath, 'sunday'))![0], ['M01', '5', 'of 13 free agents', 1]);
    assert.deepEqual((await rows(storePath, 'sunday'))![1], ['M02', '0', 'of 0 free agents', 2]);
    // A league whose pickups were all waiver claims has nothing to time.
    await publish(storePath, league([{ type: 'waiver', adds: { w: 2 } }]));
    assert.equal(await rows(storePath, 'late-night'), undefined);
    assert.equal(await rows(storePath, 'sunday'), undefined);
  });
});

test('a completed pickup without a completion time keeps the last published counts', async () => {
  await withHistory(async storePath => {
    const moves = at('2021-11-06T07:00:00Z');
    await publish(storePath, league(moves));
    const broken = league([...moves, { adds: { z: 1 } }]);
    (broken.responses[`league/${broken.seedLeagueId}/transactions/1`] as any[])[1].status_updated = null;
    await assert.rejects(publish(storePath, broken), /status_updated recorded chronology/);
    assert.deepEqual((await rows(storePath, 'pickups'))![0], ['M01', '1', '1 season', 1]);
    assert.deepEqual((await rows(storePath, 'late-night'))![0], ['M01', '1', 'of 1 free agent', 1]);
  });
});

test('published trades count every completed one once for each person in it, three-team trades included', async () => {
  await withHistory(async storePath => {
    await publish(storePath, league([
      { type: 'trade', adds: { a: 2, b: 1 }, drops: { a: 1, b: 2 }, rosters: [1, 2] },
      { type: 'trade', adds: { c: 1, d: 2, e: 3 }, drops: { c: 2, d: 3, e: 1 }, rosters: [1, 2, 3] },
      { type: 'trade', rosters: [3, 1] }, // Picks or waiver budget alone.
      { type: 'trade', status: 'failed', adds: { f: 4 }, rosters: [1, 4] },
      { type: 'trade', status: 'pending', adds: { f: 4 }, rosters: [1, 4] },
    ]));
    assert.deepEqual(await rows(storePath, 'trades'), [['M01', '3', '1 season', 1], ['M02', '2', '1 season', 2], ['M03', '2', '1 season', 2], ['M04', '0', '1 season', 4]]);
    assert.equal(await rows(storePath, 'pickups'), undefined, 'a trade picks nobody up');
  });
});

test('published habits stay with whoever held the roster that season, former managers marked', async () => {
  await withHistory(async storePath => {
    // Roster 1 was M05's in 2020 and is M01's in 2021.
    await publish(storePath, after(
      league([{ adds: { a: 1 } }, { type: 'trade', rosters: [1, 2] }]),
      league([{ at: '2020-11-01T07:00:00Z', adds: { a: 1 } }, { at: '2020-11-01T17:00:00Z', adds: { b: 1 } }, { type: 'waiver', status: 'failed', adds: { c: 1 } }, { type: 'trade', rosters: [1, 2] }, { adds: { d: 2 } }], '2020'),
    ));
    assert.deepEqual(await rows(storePath, 'pickups'), [['M05', '2', '1 season', 1], ['M01', '1', '1 season', 2], ['M02', '1', '2 seasons', 2], ['M03', '0', '2 seasons', 4], ['M04', '0', '2 seasons', 4]]);
    assert.deepEqual((await rows(storePath, 'failed-claims'))!.slice(0, 2), [['M05', '1', 'of 1 claim', 1], ['M01', '0', 'of 0 claims', 2]]);
    assert.deepEqual((await rows(storePath, 'late-night'))!.slice(0, 2), [['M05', '1', 'of 2 free agents', 1], ['M01', '0', 'of 1 free agent', 2]]);
    assert.deepEqual((await rows(storePath, 'sunday'))![0], ['M05', '1', 'of 2 free agents', 1]);
    assert.deepEqual((await rows(storePath, 'trades'))!.slice(0, 3), [['M02', '2', '2 seasons', 1], ['M01', '1', '1 season', 2], ['M05', '1', '1 season', 2]]);
    assert.deepEqual((await readManagerStats({ storePath, places: ['moves'] }))!.map(stat => stat.rows.filter(row => !row.current).map(row => row.name)), Array(5).fill(['Record manager 05']));
  });
});

test('published can’t quit you ranks repeated completed pickups of one player by one person', async () => {
  const held = async (storePath: string, season?: string) => (await readCategory('cant-quit-you', { storePath, season }))!.rows.map(row => [row.manager, row.name, row.value, row.leaderContext, row.rank]);
  await withHistory(async storePath => {
    // Nobody came back for anyone: no card, whatever else they picked up.
    await publish(storePath, league([
      { adds: { a: 1 } }, { adds: { b: 1 } }, { adds: { a: 2 } },
      { type: 'waiver', status: 'failed', adds: { a: 1 } }, { type: 'trade', adds: { a: 1 }, drops: { a: 2 }, rosters: [1, 2] }, { type: 'commissioner', adds: { b: 1 } },
    ]));
    assert.deepEqual(await held(storePath), []);
    assert.equal((await readPlaceRecords(['moves'], { storePath }))!.some(view => view.category.key === 'cant-quit-you'), false);
    await publish(storePath, after(
      league([
        { adds: { a: 2 } }, { drops: { a: 2 } }, { type: 'waiver', adds: { a: 2 }, week: 4 }, // M2 again, twice.
        { adds: { b: 1 } }, { drops: { b: 1 }, week: 2 }, { adds: { b: 1 }, week: 3 }, // M1 twice.
        { adds: { c: 3 } }, { drops: { c: 3 }, week: 2 }, { adds: { c: 3 }, week: 2 }, // M3 twice, tied with M1.
      ]),
      league([
        { adds: { a: 2 }, week: 9 },
        { adds: { b: 1 } }, { drops: { b: 1 } }, // M5 held roster 1, so this isn’t M1’s.
      ], '2020'),
    ));
    assert.deepEqual(await held(storePath), [
      ['Record manager 02', 'Player a', 3, 'Record manager 02 · In 2 of 2 seasons · last in Week 4 · 2021', 1],
      ['Record manager 01', 'Player b', 2, 'Record manager 01 · In 1 of 1 season · last in Week 3 · 2021', 2],
      ['Record manager 03', 'Player c', 2, 'Record manager 03 · In 1 of 2 seasons · last in Week 2 · 2021', 2],
    ]);
    // Within one season, only its own pickups and seasons count.
    assert.deepEqual((await held(storePath, '2021')).map(([manager, , value, context]) => [manager, value, context]), [
      ['Record manager 02', 2, 'Record manager 02 · In 1 of 1 season · last in Week 4 · 2021'],
      ['Record manager 01', 2, 'Record manager 01 · In 1 of 1 season · last in Week 3 · 2021'],
      ['Record manager 03', 2, 'Record manager 03 · In 1 of 1 season · last in Week 2 · 2021'],
    ]);
    assert.deepEqual(await held(storePath, '2020'), []);
  });
});
