import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishControlledHistory as publish, withHistory } from '../support/history.ts';
import { draftOf, draftsSource } from '../fixtures/drafts-source.ts';
import { readCategory, readHome, readPlaceRecords, readRecordsHeld } from '../../src/history/records.ts';
import { readTabs } from '../../src/history/tabs.ts';


const lineups: Record<number, Record<string, number>>[] = [
  { 1: { 31: 10.5 }, 2: { 42: 25, 12: 30 }, 3: { 13: 5 }, 4: { 33: 40, 24: 90 } },
  // Players 13 and 42 were traded away, and score for their new teams.
  { 1: { 31: 20.25, 13: 50 }, 3: { 42: 60 }, 4: { 14: 3 } },
  // The title game is outside the regular season.
  { 1: { 31: 100 } },
];

test('published best steal ranks the drafter’s own regular-season starts from the second half of the rounds', async () => {
  await withHistory(async storePath => {
    await publish(storePath, draftsSource([
      { year: '2021', complete: false, drafts: [draftOf({ id: '21' })], lineups: [{ 1: { 41: 500 } }] },
      // Roster 4 traded for slot 3's round 3 pick.
      { year: '2020', drafts: [draftOf({ id: '20', traded: { 33: 4 } })], lineups },
    ]));
    const steals = (await readCategory('best-steal', { storePath }))!;
    assert.deepEqual(steals.rows.slice(0, 3).map(row => [row.rank, row.manager, row.name, row.value, row.leaderContext, row.sample]), [
      [1, 'Record manager 04', 'Player 33', 40, 'Record manager 04 · Round 3 · 2020', '1 start'],
      [2, 'Record manager 01', 'Player 31', 30.75, 'Record manager 01 · Round 3 · 2020', '2 starts'],
      [3, 'Record manager 02', 'Player 42', 25, 'Record manager 02 · Round 4 · 2020', '1 start'],
    ]);
    assert.equal(steals.total, 8, 'rounds 3 and 4 of the completed season alone');
  });
});

test('published worst bust ranks first-round picks, leaving out known keepers alone', async () => {
  await withHistory(async storePath => {
    // Player 11 was kept and never started; player 14's flag is unknown; player 12 is known not to be a keeper. Player 31 was kept late.
    await publish(storePath, draftsSource([{ year: '2020', drafts: [draftOf({ id: '20', keepers: { 11: true, 12: false, 31: true } })], lineups }]));
    const busts = (await readCategory('worst-bust', { storePath }))!;
    assert.deepEqual(busts.rows.map(row => [row.rank, row.manager, row.name, row.value, row.leaderContext]), [
      [1, 'Record manager 04', 'Player 14', 3, 'Record manager 04 · Pick 4 · 2020'],
      [2, 'Record manager 03', 'Player 13', 5, 'Record manager 03 · Pick 3 · 2020'],
      [3, 'Record manager 02', 'Player 12', 30, 'Record manager 02 · Pick 2 · 2020'],
    ]);
    const steals = (await readCategory('best-steal', { storePath }))!;
    assert.deepEqual(steals.rows.slice(0, 2).map(row => [row.rank, row.name, row.value]), [[1, 'Player 42', 25], [2, 'Player 32', 0]], 'player 33 started for roster 4, who did not draft him here');
  });
});

const draftTab = async (storePath: string) => (await readTabs({ storePath }))!.some(tab => tab.key === 'draft');

const placeless = draftOf({ id: '20' });
Object.assign(placeless.picks[5], { round: null, metadata: null });

test('published auction, rookie and unfinished drafts supply no draft result', async () => {
  for (const [draft, tab] of [
    // The tab still opens for the scouting reports.
    [draftOf({ id: '20', source: { type: 'auction' } }), true],
    // A rookie draft is recorded as one, or fills less than the roster its own settings describe.
    [draftOf({ id: '20', settings: { player_type: 1 } }), true],
    [draftOf({ id: '20', rounds: 3, slots: 4 }), true],
    [draftOf({ id: '20', source: { status: 'paused' } }), false],
    // A draft Sleeper sent without settings, or with a pick it can't place, can't be measured.
    [draftOf({ id: '20', source: { settings: null } }), true],
    [draftOf({ id: '20', source: { settings: { rounds: '4', slots_qb: 1, slots_flex: 1, slots_bn: 2 } } }), true],
    [placeless, true],
  ] as const) await withHistory(async storePath => {
    await publish(storePath, draftsSource([{ year: '2020', drafts: [draft], lineups }]));
    assert.deepEqual(await readPlaceRecords(['draft'], { storePath }), []);
    assert.equal(await draftTab(storePath), tab);
  });
  await withHistory(async storePath => {
    await publish(storePath, draftsSource([{ year: '2020', drafts: [draftOf({ id: '20', source: { type: 'linear' } })], lineups }]));
    assert.equal(await draftTab(storePath), true, 'a linear draft of full rosters counts');
  });
});

test('published draft results measure a season with two drafts on the larger', async () => {
  await withHistory(async storePath => {
    const small = draftOf({ id: '20a', rounds: 2, order: [4, 3, 2, 1] });
    await publish(storePath, draftsSource([{ year: '2020', drafts: [small, draftOf({ id: '20b' })], lineups }]));
    const steals = (await readCategory('best-steal', { storePath }))!;
    assert.deepEqual([steals.total, steals.rows[0].name, steals.rows[0].value], [8, 'Player 31', 30.75]);
    const busts = (await readCategory('worst-bust', { storePath }))!;
    assert.deepEqual(busts.rows.map(row => [row.manager, row.name, row.value]), [
      ['Record manager 01', 'Player 11', 0], ['Record manager 04', 'Player 14', 3], ['Record manager 03', 'Player 13', 5], ['Record manager 02', 'Player 12', 30],
    ]);
  });
});

test('published titles by draft slot count each slot’s champions, however picks were traded', async () => {
  await withHistory(async storePath => {
    await publish(storePath, draftsSource([
      { year: '2021', complete: false, drafts: [draftOf({ id: '21' })] },
      // The champion's slot is 2, though roster 3 made its first pick.
      { year: '2020', champion: 1, drafts: [draftOf({ id: '20', order: [2, 1, 3, 4], traded: { 12: 3 } })] },
      { year: '2019', champion: 2, drafts: [draftOf({ id: '19' })] },
      { year: '2018', champion: 1, drafts: [draftOf({ id: '18' })] },
      // The champion took roster 1 over from the account that set the order, and it traded a pick away.
      { year: '2017', champion: 1, drafts: [draftOf({ id: '17', traded: { 11: 2 } })], accounts: { 1: '960000000000009001' } },
      { year: '2016', champion: 2, drafts: [draftOf({ id: '16', source: { type: 'auction' } })] },
      { year: '2015', champion: null, drafts: [draftOf({ id: '15' })] },
    ]));
    const [slots] = (await readPlaceRecords(['draft'], { storePath }))!.filter(view => view.category.key === 'titles-by-slot');
    assert.deepEqual(slots.rows.map(row => [row.rank, row.name, row.value, row.winners!.map(winner => `${winner.manager} ${winner.year}`)]), [
      [1, 'Slot 1', 2, ['Record manager 01 2018', 'Newcomer 1 2017']],
      [1, 'Slot 2', 2, ['Record manager 01 2020', 'Record manager 02 2019']],
      [3, 'Slot 3', 0, []],
      [3, 'Slot 4', 0, []],
    ]);
    assert.deepEqual(slots.leaders.map(row => row.name), ['Slot 1', 'Slot 2']);
    assert.ok(!(await readRecordsHeld('person-960000000000000001', { storePath }))!.some(view => view.category.key === 'titles-by-slot'), 'a slot holds it, not a manager');
    assert.ok((await readHome({ storePath }))!.recent.every(row => row.category.key !== 'titles-by-slot'));
  });
});

test('published titles by draft slot need a resolved title', async () => {
  await withHistory(async storePath => {
    await publish(storePath, draftsSource([{ year: '2020', champion: null, drafts: [draftOf({ id: '20' })], lineups: lineups.slice(0, 2) }]));
    assert.deepEqual((await readPlaceRecords(['draft'], { storePath }))!.map(view => view.category.key), ['best-steal', 'worst-bust']);
  });
});
