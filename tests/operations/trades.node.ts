import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { readTabs } from '../../src/history/tabs.ts';
import { readTradeMap } from '../../src/history/trades.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-trades-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
/** Controlled 2019–2021 history. Its own 2021 trades are two between Timh17 and sebastian12, one of them with a pick and waiver budget. */
async function fixture() {
  const source = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
  let next = 950000000000000001n;
  return { source, trade(year: string, rosters: number[], change: object = {}) {
    const row = { transaction_id: String(next++), leg: 1, type: 'trade', status: 'complete', status_updated: 100, adds: null, drops: null, roster_ids: rosters, draft_picks: [], waiver_budget: [], ...change };
    source.responses[`league/90000000000000${year}/transactions/1`].push(row);
  } };
}
const pairs = async (storePath: string) => (await readTradeMap({ storePath }))!.pairs.map(pair => [pair.a.name, pair.b.name, pair.count]);

test('published trade map counts each pair of people, every pair of a three-team trade, and whatever was traded', async () => {
  await withHistory(async storePath => {
    assert.equal(await readTradeMap({ storePath }), null, 'unpublished history has no map');
    const { source, trade } = await fixture();
    trade('2021', [1, 2, 7], { adds: { 101: 7, 102: 1, 107: 2 }, drops: { 101: 1, 102: 2, 107: 7 } });
    // A pick for waiver budget: no player moves.
    trade('2021', [1, 2], { draft_picks: [{ season: '2022', round: 1, roster_id: 1, previous_owner_id: 1, owner_id: 2 }], waiver_budget: [{ sender: 2, receiver: 1, amount: 5 }] });
    await publish(storePath, source);
    assert.deepEqual(await pairs(storePath), [
      ['Timh17', 'sebastian12', 2], ['Manager 1', 'Manager 2', 2],
      ['Timh17', 'Manager 1', 1], ['Timh17', 'Manager 2', 1],
    ]);
    // Whoever has traded most comes first; a three-team trade is one trade for each of its people.
    assert.deepEqual((await readTradeMap({ storePath }))!.managers.map(person => person.name), ['Timh17', 'Manager 1', 'Manager 2', 'sebastian12']);
  });
});

test('published trade map leaves out failed and pending trades', async () => {
  await withHistory(async storePath => {
    const { source, trade } = await fixture();
    trade('2021', [1, 2], { status: 'failed', adds: { 101: 2 }, drops: { 101: 1 } });
    trade('2021', [1, 7], { status: 'pending', adds: { 101: 7 }, drops: { 101: 1 } });
    await publish(storePath, source);
    assert.deepEqual(await pairs(storePath), [['sebastian12', 'Timh17', 2]]);
  });
});

test('published trade map keeps a roster’s trades with whoever managed it that season', async () => {
  await withHistory(async storePath => {
    const { source, trade } = await fixture();
    // Roster 7 was Woody14’s in 2019, then Timh17’s; roster 10 was alecswartout’s until sebastian12’s 2021.
    trade('2019', [7, 10]);
    trade('2020', [7, 10]);
    await publish(storePath, source);
    assert.deepEqual(await pairs(storePath), [['Timh17', 'sebastian12', 2], ['Timh17', 'alecswartout', 1], ['alecswartout', 'Woody14', 1]]);
  });
});

test('a trade alone gives a league its Moves tab, and a league without one has no map', async () => {
  const league = (...trades: object[]) => {
    const source = recordsSource([[100, 90, 50, 50], [90, 100, 60, 40]]);
    source.responses[`league/${source.seedLeagueId}/transactions/1`] = trades;
    return source;
  };
  const trade = { transaction_id: '960000000000000001', leg: 1, type: 'trade', status: 'complete', status_updated: 100, adds: null, drops: null, roster_ids: [3, 1] };
  const moves = async (storePath: string) => (await readTabs({ storePath }))!.some(tab => tab.key === 'moves');
  await withHistory(async storePath => {
    await publish(storePath, league({ ...trade, status: 'failed' }));
    assert.deepEqual(await readTradeMap({ storePath }), { managers: [], pairs: [] });
    assert.equal(await moves(storePath), false);
    await publish(storePath, league(trade));
    assert.deepEqual(await pairs(storePath), [['Record manager 01', 'Record manager 03', 1]]);
    assert.equal(await moves(storePath), true);
  });
});

test('a completed trade that doesn’t say whose it was keeps the last published map', async () => {
  await withHistory(async storePath => {
    const { source } = await fixture();
    await publish(storePath, source);
    for (const rosters of [undefined, [7, 99]]) {
      const broken = await fixture();
      broken.trade('2021', [], { roster_ids: rosters });
      await assert.rejects(publish(storePath, broken.source), /roster_ids: (expected a complete source array|unknown roster 99)/);
      assert.deepEqual(await pairs(storePath), [['sebastian12', 'Timh17', 2]]);
    }
  });
});
