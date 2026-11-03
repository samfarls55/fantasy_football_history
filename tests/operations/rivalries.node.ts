import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';

const first = 'person-960000000000000001';
const second = 'person-960000000000000002';
const third = 'person-960000000000000003';
async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-rivalries-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('published rivalries retain exact official margins, tie-ended streaks and reversed perspective', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[100.12,100,30,30], [10.25,10.13,30,30], [0,10,30,30], [20,20,30,30]]);
    await publish(storePath, source);
    const { readRivalry } = await import('../../src/history/rivalries.ts');
    const rivalry = await readRivalry(first, second, { storePath });
    assert.equal(rivalry?.record, '2–1–1');
    assert.equal(rivalry?.meetings, 4);
    assert.equal(rivalry?.averageMargin, -2.44);
    assert.equal(rivalry?.streak, null);
    assert.deepEqual(rivalry?.games.map(game => [game.week, game.result, game.margin]), [[4,'T',0], [3,'L',-10], [2,'W',0.12], [1,'W',0.12]]);
    assert.equal(rivalry?.games[2].href, '/seasons/2021/matchups/900000000000002021-w2-m1/?scope=regular&week=2');
    const reverse = await readRivalry(second, first, { storePath });
    assert.equal(reverse?.record, '1–2–1');
    assert.equal(reverse?.averageMargin, 2.44);
    assert.deepEqual(reverse?.games.map(game => game.result), ['T','W','L','L']);
  });
});

test('published person rivalries preserve shared nemeses and assign none for all-tied or favorable records', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[0,10,0,10], [0,10,0,10], [0,0,10,10], [0,0,10,10]]);
    for (const week of [3,4]) {
      const rows = source.responses[`league/${source.seedLeagueId}/matchups/${week}`] as any[];
      rows[0].matchup_id = rows[2].matchup_id = 1;
      rows[1].matchup_id = rows[3].matchup_id = 2;
    }
    await publish(storePath, source);
    const { readManagerRivalries } = await import('../../src/history/rivalries.ts');
    const profile = await readManagerRivalries(first, { storePath, season: '2021' });
    assert.deepEqual(profile?.nemeses.map(row => [row.b.id, row.record, row.meetings]), [[second,'0–2',2], [third,'0–2',2]]);
    assert.deepEqual(profile?.rows[0].streak, { result: 'L', count: 2, person: profile!.rows[0].b });
    assert.equal(profile?.nemeses[0].href, `/rivalries/?a=${first}&b=${second}&season=2021&scope=regular`);
    assert.deepEqual((await readManagerRivalries('person-960000000000000004', { storePath }))?.nemeses, []);
    const tied = recordsSource([[10,10,10,10], [20,20,20,20]]);
    await publish(storePath, tied);
    assert.deepEqual((await readManagerRivalries(first, { storePath }))?.nemeses, []);
    assert.equal((await readManagerRivalries(first, { storePath }))?.rows[0].record, '0–0–2');
  });
});

test('published franchise rivalries keep actual owners and years instead of combining replacements', async () => {
  await withHistory(async storePath => {
    const source = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
    await publish(storePath, source);
    const { readFranchiseRivalries } = await import('../../src/history/rivalries.ts');
    const franchise = await readFranchiseRivalries('franchise-7', { storePath });
    assert.deepEqual(franchise?.rows.map(row => [row.year, row.a.name, row.b.name, row.record]), [
      ['2021','Timh17','sebastian12','0–3'], ['2020','Timh17','alecswartout','1–0'], ['2019','Woody14','alecswartout','1–0'],
    ]);
    assert.equal(franchise?.rows[2].href, '/rivalries/?a=person-472580465006473216&b=person-473910025325113344&season=2019&scope=regular');
    assert.deepEqual((await readFranchiseRivalries('franchise-7', { storePath, season: '2020', scope: 'combined' }))?.rows.map(row => [row.year, row.a.name, row.record]), [['2020','Timh17','2–0']]);
  });
});

test('published rivalry selection distinguishes missing history, invalid pairs, zero meetings and ten newest games', async () => {
  await withHistory(async storePath => {
    const { readRivalriesPage, readRivalry } = await import('../../src/history/rivalries.ts');
    assert.equal(await readRivalriesPage({ storePath }), null);
    const source = recordsSource(Array.from({ length: 13 }, () => [10,0,5,5]));
    await publish(storePath, source);
    assert.equal((await readRivalriesPage({ storePath, a: first, b: first }))?.comparison, null);
    assert.equal((await readRivalriesPage({ storePath, a: first, b: 'missing' }))?.comparison, null);
    const neverMet = await readRivalry(first, third, { storePath });
    assert.equal(neverMet?.meetings, 0);
    assert.equal(neverMet?.averageMargin, null);
    assert.equal(neverMet?.streak, null);
    const page = await readRivalriesPage({ storePath, a: first, b: second, season: '2021' });
    assert.equal(page?.comparison?.meetings, 13);
    assert.deepEqual(page?.games.map(game => game.week), [13,12,11,10,9,8,7,6,5,4]);
    assert.equal(page?.nextHref, `/rivalries/?a=${first}&b=${second}&season=2021&scope=regular&limit=all`);
    assert.equal((await readRivalriesPage({ storePath, a: first, b: second, season: '2021', limit: 'all' }))?.games.length, 13);
  });
});

test('pending multiweek legs never become meetings and lower-bracket advancement is separate from scored W-L-T', async () => {
  await withHistory(async storePath => {
    const source = JSON.parse(await readFile(new URL('../fixtures/playoff-type-1.json', import.meta.url), 'utf8'));
    const partial = structuredClone(source);
    partial.responses[`league/${source.seedLeagueId}`].status = 'in_season';
    partial.responses[`league/${source.seedLeagueId}`].settings.last_scored_leg = 4;
    partial.responses['state/nfl'].week = 5;
    for (const row of partial.responses[`league/${source.seedLeagueId}/winners_bracket`].filter((row: any) => row.r === 3)) row.w = row.l = null;
    await publish(storePath, partial);
    const { readRivalry } = await import('../../src/history/rivalries.ts');
    const a = 'person-950000000000000001';
    const b = 'person-950000000000000005';
    assert.equal((await readRivalry(a, b, { storePath, scope: 'playoffs' }))?.meetings, 0);
    await publish(storePath, source);
    const final = await readRivalry(a, b, { storePath, scope: 'playoffs' });
    assert.equal(final?.meetings, 1);
    assert.equal(final?.record, '0–1');
    assert.equal(final?.averageMargin, -5);
    assert.deepEqual(final?.games[0].weeks, [4,5]);
    const lower = await readRivalry('person-950000000000000007', 'person-950000000000000008', { storePath, scope: 'consolation' });
    assert.equal(lower?.record, '0–1'); // Source w=7 advances the lower scorer, not a scored win.
    const corrected = structuredClone(source);
    corrected.responses[`league/${source.seedLeagueId}/matchups/5`].find((row: any) => row.roster_id === 5).custom_points = 0;
    const title = corrected.responses[`league/${source.seedLeagueId}/winners_bracket`].find((row: any) => row.p === 1);
    title.w = 1; title.l = 5;
    await publish(storePath, corrected);
    const updated = await readRivalry(a, b, { storePath, scope: 'playoffs' });
    assert.equal(updated?.record, '1–0');
    assert.equal(updated?.averageMargin, 10.1);
    delete corrected.responses[`league/${source.seedLeagueId}/matchups/5`];
    await assert.rejects(publish(storePath, corrected), /Missing controlled response/);
    assert.deepEqual(await readRivalry(a, b, { storePath, scope: 'playoffs' }), updated);
  });
});
