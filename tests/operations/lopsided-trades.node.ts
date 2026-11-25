import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishControlledHistory as publish, withHistory } from '../support/history.ts';
import { aftermathSource, withEarlierSeason, type AftermathMove, type AftermathWeek } from '../fixtures/aftermath-source.ts';
import { readCategory, readPlaceRecords } from '../../src/history/records.ts';

const [one, two, three, four, five] = [1, 2, 3, 4, 5].map(number => `Record manager 0${number}`);
const lopsided = async (storePath: string) => (await readCategory('lopsided-trade', { storePath }))!.rows.map(row => [row.value, row.manager, row.opponent, row.sides]);

test('published lopsided trades name what each side received and scored in later weeks until each player left', async () => {
  await withHistory(async storePath => {
    await publish(storePath, aftermathSource([
      { pairs: '12 34', starts: { 1: { A: 60, B: 60 }, 2: { C: 60 } } }, // the week of the first trade
      { pairs: '12 34', starts: { 1: { A: 20.1, B: 5 }, 2: { C: 10 } } },
      { pairs: '12 34', starts: { 1: { A: 30, B: 70 }, 2: { C: 80 } } }, // B dropped, C traded again
      { pairs: '12 34', starts: { 1: { A: 8.15 }, 2: { D: 4 }, 3: { C: 99 }, 4: { B: 50 } } },
    ], [
      { week: 1, type: 'trade', adds: { A: 1, B: 1, C: 2 }, drops: { A: 2, B: 2, C: 1 } },
      { week: 3, type: 'free_agent', drops: { B: 1 } },
      { week: 3, type: 'free_agent', adds: { B: 4 } },
      { week: 3, type: 'trade', adds: { C: 3, D: 2 }, drops: { C: 2, D: 3 } },
    ]));
    assert.deepEqual(await lopsided(storePath), [
      [95, three, two, [{ manager: three, received: ['Player C'], points: 99 }, { manager: two, received: ['Player D'], points: 4 }]],
      [53.25, one, two, [{ manager: one, received: ['Player A', 'Player B'], points: 63.25 }, { manager: two, received: ['Player C'], points: 10 }]],
    ]);
    const card = (await readPlaceRecords(['moves'], { storePath }))!.find(view => view.category.key === 'lopsided-trade')!;
    assert.deepEqual(card.leaders.map(row => [row.id, row.exactKey, row.leaderContext, row.period]), [['900000000000002021:930000000000000003', '95/1', 'Week 3 · 2021', { year: '2021', week: 4, playedAt: null }]]);
  });
});

test('trades with picks, waiver budget, a third team or no completion have no lopsided side', async () => {
  const weeks: AftermathWeek[] = [
    { pairs: '12 34', starts: { 1: { A: 1 }, 2: { B: 1 } } },
    { pairs: '12 34', starts: { 1: { B: 50 }, 2: { A: 3 }, 3: { C: 20 } } },
  ];
  const trade: AftermathMove = { week: 1, type: 'trade', adds: { A: 2, B: 1 }, drops: { A: 1, B: 2 } };
  for (const [move, value] of [
    [trade, 47],
    [{ ...trade, draft_picks: [{ season: '2022', round: 10, roster_id: 1, owner_id: 2, previous_owner_id: 1 }] }, undefined],
    [{ ...trade, waiver_budget: [{ sender: 1, receiver: 2, amount: 1 }] }, undefined],
    [{ ...trade, adds: { A: 2, B: 1, C: 3 }, drops: { A: 1, B: 3, C: 2 } }, undefined],
    [{ ...trade, status: 'failed' }, undefined],
    [{ ...trade, type: 'commissioner' }, undefined],
  ] as [AftermathMove, number | undefined][]) await withHistory(async storePath => {
    await publish(storePath, aftermathSource(weeks, [move]));
    assert.equal((await readCategory('lopsided-trade', { storePath }))!.rows[0]?.value, value, JSON.stringify(move));
  });
});

test('an equal trade is never lopsided, and a side that received nothing scored nothing', async () => {
  await withHistory(async storePath => {
    const weeks: AftermathWeek[] = [
      { pairs: '12 34', starts: { 1: { A: 9 }, 2: { B: 9, C: 9 }, 3: { D: 9 } } },
      { pairs: '12 34', starts: { 1: { B: 0.1, C: 0.2 }, 2: { A: 0.3 }, 4: { D: 6.5 } } },
    ];
    const equal: AftermathMove = { week: 1, type: 'trade', adds: { A: 2, B: 1, C: 1 }, drops: { A: 1, B: 2, C: 2 } };
    await publish(storePath, aftermathSource(weeks, [equal]));
    assert.deepEqual(await lopsided(storePath), []);
    assert.equal((await readPlaceRecords(['moves'], { storePath }))!.some(view => view.category.key === 'lopsided-trade'), false);
    await publish(storePath, aftermathSource(weeks, [equal, { week: 1, type: 'trade', adds: { D: 4 }, drops: { D: 3 } }]));
    assert.deepEqual(await lopsided(storePath), [[6.5, four, three, [{ manager: four, received: ['Player D'], points: 6.5 }, { manager: three, received: [], points: 0 }]]]);
  });
});

test('published lopsided trades stay with the replaced manager and end with their season', async () => {
  await withHistory(async storePath => {
    const earlier = aftermathSource([
      { pairs: '12 34', starts: { 1: { A: 5 }, 2: { B: 5 } } },
      { pairs: '12 34', starts: { 1: { B: 15 }, 2: { A: 2 } } },
    ], [{ week: 1, type: 'trade', adds: { A: 2, B: 1 }, drops: { A: 1, B: 2 } }]);
    await publish(storePath, withEarlierSeason(aftermathSource([{ pairs: '12 34', starts: { 2: { A: 90 } } }, { pairs: '12 34', starts: { 2: { A: 80 } } }], []), earlier));
    assert.deepEqual(await lopsided(storePath), [[13, five, two, [{ manager: five, received: ['Player B'], points: 15 }, { manager: two, received: ['Player A'], points: 2 }]]]);
  });
});
