import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { publishControlledHistory as publish, withHistory } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { Exact } from '../../src/history/decimal.ts';
import { readRecordsHeld, recordCategories } from '../../src/history/records.ts';

const manager = (number: number) => `person-96000000000000000${number}`;
const held = async (storePath: string, personId: string) => (await readRecordsHeld(personId, { storePath }))!
  .map(view => [view.category.key, view.leaders[0].value, view.leaders.map(row => row.manager)]);
const [one, two, three, four] = ['Record manager 01', 'Record manager 02', 'Record manager 03', 'Record manager 04'];

test('published records held share ties, list fame before shame and count a tied game for both managers', async () => {
  await withHistory(async storePath => {
    assert.equal(await readRecordsHeld(manager(1), { storePath }), null, 'unpublished history is not an empty shelf');
    await publish(storePath, recordsSource([[100, 90, 50, 50], [90, 100, 60, 40]]));
    assert.deepEqual(await held(storePath, manager(1)), [
      ['wins', 1, [one, two, three]], ['career-points', 190, [one, two]], ['highest-score', 100, [one, two]],
      ['winning-streak', 1, [one, two, three]], ['points-in-loss', 90, [one, two]], ['losing-streak', 1, [one, two, four]],
    ]);
    assert.deepEqual(await held(storePath, manager(3)), [
      ['wins', 1, [one, two, three]], ['win-percentage', 75, [three]], ['points-in-win', 60, [three]], ['biggest-blowout', 20, [three]],
      ['closest-game', 0, [three]], ['winning-streak', 1, [one, two, three]],
    ]);
    // Beaten by the most points is the winner's record; the tie belongs to both. Nobody holds a title count of zero.
    assert.deepEqual(await held(storePath, manager(4)), [
      ['closest-game', 0, [three]], ['lowest-score', 40, [four]], ['losing-streak', 1, [one, two, four]],
    ]);
    const tied = (await readRecordsHeld(manager(4), { storePath }))!.find(view => view.category.key === 'closest-game')!;
    assert.equal(tied.leaders[0].opponent, four);
    assert.deepEqual(await held(storePath, 'missing'), []);
  });
});

test('published records held by one side of a tied game stay with that side', async () => {
  await withHistory(async storePath => {
    // Manager 1's bench would have added 30 to the tie with manager 2.
    const source = recordsSource([[90, 90, 60, 40]]);
    Object.assign((source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[])[0], { starters: ['a'], starters_points: [0], players: ['a', 'b'], players_points: { a: 0, b: 30 } });
    for (const id of ['a', 'b']) (source.responses['players/nfl'] as any)[id] = { full_name: `Player ${id}`, position: 'QB' };
    await publish(storePath, source);
    const keys = async (personId: string) => (await held(storePath, personId)).map(([key]) => key).filter(key => ['closest-game', 'worst-managed-week', 'benched-player', 'lowest-starter'].includes(key as string));
    assert.deepEqual(await keys(manager(1)), ['closest-game', 'worst-managed-week', 'benched-player', 'lowest-starter']);
    assert.deepEqual(await keys(manager(2)), ['closest-game']);
  });
});

test('published records held pick up a record registered later and leave out an unsupported claim', async () => {
  await withHistory(async storePath => {
    await publish(storePath, recordsSource([[100, 90, 50, 50], [90, 100, 60, 40]]));
    recordCategories.push({ key: 'later-record', name: 'Later record', group: 'Seasons', unit: 'points', displayPrecision: 0, rule: 'Added after the page.', scope: 'none', shame: true,
      candidates: () => [{ id: 'later', personId: manager(2), name: two, avatar: null, metric: Exact.from(7), sample: null, period: null, href: '' }] });
    try {
      assert.deepEqual((await held(storePath, manager(2))).at(-1), ['later-record', 7, [two]]);
    } finally { recordCategories.pop(); }
  });
  // A bench score Sleeper never sent could have been the record, so nobody holds it.
  for (const [missing, holder] of [[12, [['benched-player', 30, [one]]]], [undefined, []]] as const) await withHistory(async storePath => {
    const source = recordsSource([[100, 90, 50, 50], [90, 100, 60, 40]]);
    const bench = (week: number, points: Record<string, number>) => Object.assign((source.responses[`league/${source.seedLeagueId}/matchups/${week}`] as any[])[0], { players: ['7'], players_points: points });
    bench(1, missing === undefined ? {} : { 7: missing });
    bench(2, { 7: 30 });
    await publish(storePath, source);
    assert.deepEqual((await held(storePath, manager(1))).filter(([key]) => key === 'benched-player'), holder);
  });
});

test('published records held stay with the person when a roster changes hands', async () => {
  await withHistory(async storePath => {
    await publish(storePath, JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8')));
    const keys = async (personId: string) => (await held(storePath, personId)).map(([key]) => key);
    assert.ok((await keys('person-472580465006473216')).includes('best-without-title'), 'Woody14 earned it on the roster Timh17 took over');
    assert.ok(!(await keys('person-608473907007143936')).includes('best-without-title'));
  });
});
