import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishControlledHistory as publish, withHistory } from '../support/history.ts';
import { aftermathSource, withEarlierSeason } from '../fixtures/aftermath-source.ts';
import { readCategory, readPlaceRecords } from '../../src/history/records.ts';

// The context is how and when he left, and the card names nobody he started for.
const exes = async (storePath: string) => (await readCategory('the-ex', { storePath }))!.rows.map(row => [row.manager, row.name, row.value, row.leaderContext, row.startedFor]);

test('published exes score against the manager who let them go in later weeks, until that manager rosters them again', async () => {
  await withHistory(async storePath => {
    await publish(storePath, aftermathSource([
      { pairs: '12 34', starts: { 1: { A: 5 } } },
      { pairs: '12 34', starts: { 2: { A: 50 } } }, // the week of the drop
      { pairs: '12 34', starts: { 2: { A: 20.1 } } },
      { pairs: '13 24', starts: { 2: { A: 99 } } }, // against somebody else
      { pairs: '12 34', starts: { 2: { A: 40 } } }, // the week manager 1 takes him back
      { pairs: '12 34', starts: { 1: { A: 30 } } }, // against manager 2, who let him go last
      { pairs: '13 24', starts: { 1: { A: 8 } } }, // the week of the trade
      { pairs: '13 24', starts: { 3: { A: 12.5 } } },
      { pairs: '13 24', starts: {}, bench: { 3: { A: 25 } } },
      { pairs: '13 24', starts: { 3: { A: 2.5 } } },
    ], [
      { week: 2, type: 'free_agent', drops: { A: 1 } },
      { week: 2, type: 'waiver', adds: { A: 2 } },
      { week: 3, type: 'waiver', status: 'failed', adds: { A: 1 } },
      { week: 5, type: 'free_agent', drops: { A: 2 } },
      { week: 5, type: 'free_agent', adds: { A: 1 } },
      { week: 7, type: 'trade', adds: { A: 3 }, drops: { A: 1 } },
    ]));
    assert.deepEqual(await exes(storePath), [
      ['Record manager 02', 'Player A', 30, 'Record manager 02 · Dropped Week 5 · 2021', undefined],
      ['Record manager 01', 'Player A', 20.1, 'Record manager 01 · Dropped Week 2 · 2021', undefined],
      ['Record manager 01', 'Player A', 15, 'Record manager 01 · Traded Week 7 · 2021', undefined],
    ]);
    const card = (await readPlaceRecords(['moves'], { storePath }))!.find(view => view.category.key === 'the-ex')!;
    assert.deepEqual(card.leaders.map(row => [row.id, row.exactKey, row.period]), [['900000000000002021:930000000000000003:A:2', '30/1', { year: '2021', week: 6, playedAt: null }]]);
  });
});

test('a player who never started against the manager who let him go is nobody’s ex', async () => {
  await withHistory(async storePath => {
    await publish(storePath, aftermathSource([
      { pairs: '12 34', starts: { 1: { A: 5 } } },
      { pairs: '13 24', starts: { 2: { A: 50 } } },
    ], [{ week: 1, type: 'free_agent', drops: { A: 1 } }, { week: 1, type: 'waiver', adds: { A: 2 } }]));
    assert.deepEqual(await exes(storePath), []);
    assert.equal((await readPlaceRecords(['moves'], { storePath }))!.some(view => view.category.key === 'the-ex'), false);
  });
});

test('published exes stay with the replaced manager and end with their season', async () => {
  await withHistory(async storePath => {
    const earlier = aftermathSource([
      { pairs: '12 34', starts: { 1: { A: 5 } } },
      { pairs: '12 34', starts: { 2: { A: 15 } } },
    ], [{ week: 1, type: 'free_agent', drops: { A: 1 } }, { week: 1, type: 'waiver', adds: { A: 2 } }]);
    await publish(storePath, withEarlierSeason(aftermathSource([{ pairs: '12 34', starts: { 2: { A: 60 } } }, { pairs: '12 34', starts: { 2: { A: 70 } } }], []), earlier));
    assert.deepEqual(await exes(storePath), [['Record manager 05', 'Player A', 15, 'Record manager 05 · Dropped Week 1 · 2020', undefined]]);
    assert.deepEqual((await readCategory('the-ex', { storePath, season: '2021' }))!.rows, []);
  });
});
