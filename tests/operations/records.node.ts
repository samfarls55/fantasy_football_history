import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { refresh } from '../../src/history/refresh.ts';

async function withHistory(run: (storePath: string, source: any) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-records-'));
  const source = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
  try { await run(join(directory, 'history.json'), source); } finally { await rm(directory, { recursive: true, force: true }); }
}
function publish(storePath: string, source: any) {
  return refresh({ storePath, leagueId: source.seedLeagueId, now: new Date('2026-11-03T12:00:00Z'), provider: {
    async get(path) {
      if (!(path in source.responses)) throw new Error(`Missing controlled response: ${path}`);
      return structuredClone(source.responses[path]);
    },
  } });
}

test('published career categories preserve tied titles, selected scope, rates and supported historical periods', async () => {
  await withHistory(async (storePath, source) => {
    await publish(storePath, source);
    const { readCategory, readRecordCollection } = await import('../../src/history/records.ts');
    const titles = await readCategory('championships', { storePath, scope: 'consolation' });
    assert.equal(titles?.scope, null);
    assert.deepEqual(titles?.leaders.map(row => [row.name, row.value, row.rank]), [['alecswartout', 1, 1], ['Timh17', 1, 1]]);
    assert.deepEqual(titles?.leaders.find(row => row.name === 'Timh17')?.period, { year: '2020', week: 2, playedAt: null });
    const rates = await readCategory('win-percentage', { storePath, season: '2019' });
    assert.equal(rates?.rows.find(row => row.name === 'Manager 1')?.value, 50);
    assert.equal(rates?.rows.find(row => row.name === 'Manager 1')?.sample, '0–0–1 · 1 game');
    assert.equal((await readCategory('win-percentage', { storePath, scope: 'consolation' }))?.rows.length, 0);
    const wins = await readCategory('wins', { storePath, season: '2021', scope: 'regular' });
    assert.deepEqual(wins?.leaders.map(row => [row.name, row.value]), [['Manager 2', 3], ['sebastian12', 3]]);
    assert.equal(wins?.rows.length, 4);
    assert.match(wins!.leaders[0].href, /season=2021.*scope=regular/);
    assert.deepEqual((await readRecordCollection({ storePath }))?.map(group => group.name), ['Careers', 'Seasons', 'Matchups', 'Players']);
    assert.equal(await readCategory('missing', { storePath }), null);
  });
});

test('published career points use official exact decimal sums consistently in rankings, careers and standings', async () => {
  await withHistory(async storePath => {
    const { recordsSource } = await import('../fixtures/records-source.ts');
    const source = recordsSource([[0.1, 0.3, 100.12001, 100.12], [0.2, 0, 0, 0]]);
    await publish(storePath, source);
    const { readCategory } = await import('../../src/history/records.ts');
    const { readManager } = await import('../../src/history/managers.ts');
    const { readSeason } = await import('../../src/history/read.ts');
    const points = await readCategory('career-points', { storePath });
    assert.deepEqual(points?.rows.map(row => [row.name, row.value, row.rank, row.exactKey]), [
      ['Record manager 03', 100.12001, 1, '10012001/100000'], ['Record manager 04', 100.12, 2, '2503/25'],
      ['Record manager 01', 0.3, 3, '3/10'], ['Record manager 02', 0.3, 3, '3/10'],
    ]);
    assert.equal((await readManager(points!.rows[2].personId, { storePath }))?.facts.points, 0.3);
    assert.equal((await readSeason('2021', { storePath }))?.rows.find(row => row.personName === 'Record manager 01')?.points, 0.3);
    const first = source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[];
    first[0].custom_points = 0.4; // Official override changes the category and supporting views together.
    await publish(storePath, source);
    assert.equal((await readCategory('career-points', { storePath }))?.rows.find(row => row.name === 'Record manager 01')?.value, 0.6);
    assert.equal((await readManager(points!.rows[2].personId, { storePath }))?.facts.points, 0.6);
    assert.equal((await readSeason('2021', { storePath }))?.rows.find(row => row.personName === 'Record manager 01')?.points, 0.6);
    delete source.responses[`league/${source.seedLeagueId}/matchups/1`];
    await assert.rejects(publish(storePath, source), /Missing controlled response/);
    assert.equal((await readCategory('career-points', { storePath }))?.rows.find(row => row.name === 'Record manager 01')?.value, 0.6);
  });
});

test('published category pages include every cutoff tie and sorting preserves canonical places through Show more', async () => {
  await withHistory(async storePath => {
    const { recordsSource } = await import('../fixtures/records-source.ts');
    const scores = [399,398,397,396,395,394,393,392,391,390,390,390,389,388,387,386,385,384,383,382,382,382,381,380,379,378,377,376,375,374];
    await publish(storePath, recordsSource([scores]));
    const { readCategory } = await import('../../src/history/records.ts');
    const initial = await readCategory('career-points', { storePath, season: '2021', scope: 'regular' });
    assert.equal(initial?.rows.length, 12);
    assert.deepEqual(initial?.rows.slice(-3).map(row => row.rank), [10,10,10]);
    assert.match(initial!.nextHref!, /season=2021&scope=regular&limit=20/);
    const expanded = await readCategory('career-points', { storePath, season: '2021', scope: 'regular', sort: 'value-asc', limit: 20 });
    assert.equal(expanded?.rows.length, 22);
    assert.deepEqual(expanded?.rows.slice(0, 3).map(row => row.rank), [20,20,20]);
    assert.equal(expanded?.rows.at(-1)?.rank, 1);
    assert.equal(expanded?.nextLimit, 30);
    assert.equal((await readCategory('career-points', { storePath, limit: 30 }))?.nextHref, null);
  });
});

test('a published standings result expands its category through the selected rank and survives sharing', async () => {
  await withHistory(async storePath => {
    const { recordsSource } = await import('../fixtures/records-source.ts');
    const { readCategory } = await import('../../src/history/records.ts');
    const { readSeason } = await import('../../src/history/read.ts');
    const source = recordsSource([[120, 110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10]]);
    (source.responses[`league/${source.seedLeagueId}`] as any).status = 'complete';
    await publish(storePath, source);
    const selected = (await readSeason('2021', { storePath }))!.rows.find(row => row.personName === 'Record manager 12')!;
    const category = (await readCategory('dominant-season', { storePath, season: '2021', sort: 'name', result: selected.id }))!;
    assert.equal(category.rows.find(row => row.id === selected.id)?.rank, 12);
    assert.equal(category.limit, 12);
    assert.equal(category.rows.length, 12);
    const shared = new URL(category.href, 'http://museum.test');
    assert.equal(shared.searchParams.get('result'), selected.id);
    assert.equal(shared.searchParams.get('season'), '2021');
    assert.equal(shared.searchParams.get('sort'), 'name');
    const reloaded = await readCategory('dominant-season', { storePath, season: shared.searchParams.get('season')!, sort: shared.searchParams.get('sort')!, result: shared.searchParams.get('result')!, limit: Number(shared.searchParams.get('limit')) });
    assert.deepEqual(reloaded?.rows.map(row => [row.id, row.rank]), category.rows.map(row => [row.id, row.rank]));
  });
});

test('equal published career rates share a canonical rational rank despite different game counts', async () => {
  await withHistory(async storePath => {
    const { recordsSource } = await import('../fixtures/records-source.ts');
    const source = recordsSource([[10,0,10,0], [0,10,0,10], [0,10,0,10], [0,0,10,0], [0,0,0,10], [0,0,0,10]]);
    for (const week of [4,5,6]) for (const row of (source.responses[`league/${source.seedLeagueId}/matchups/${week}`] as any[]).slice(0,2)) row.matchup_id = null;
    await publish(storePath, source);
    const { readCategory } = await import('../../src/history/records.ts');
    const rates = await readCategory('win-percentage', { storePath });
    assert.deepEqual(rates?.rows.map(row => [row.name, row.rank, row.exactKey, row.sample]), [
      ['Record manager 02', 1, '200/3', '2–1 · 3 games'], ['Record manager 04', 1, '200/3', '4–2 · 6 games'],
      ['Record manager 01', 3, '100/3', '1–2 · 3 games'], ['Record manager 03', 3, '100/3', '2–4 · 6 games'],
    ]);
  });
});
