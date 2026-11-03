import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const fixture = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));

export function controlledProvider(variant?: string) {
  const responses = structuredClone(fixture.responses);
  const changes = variant ? fixture.variants[variant] : {};
  Object.assign(responses, changes?.responseOverrides);
  return { async get(path: string): Promise<unknown> {
    const failure = changes?.requestFailures?.find((failure: { path: string }) => failure.path === path);
    if (failure) throw new Error(failure.message);
    if (!(path in responses)) throw new Error(`Missing controlled response: ${path}`);
    return structuredClone(responses[path]);
  } };
}

test('a linked import exposes every year and official regular-season standings with separate replacement managers', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'museum-import-'));
  try {
    const { refresh } = await import('../../src/history/refresh.ts');
    const { readSeasons, readSeason } = await import('../../src/history/read.ts');
    const storePath = join(directory, 'history.json');
    await refresh({ storePath, leagueId: fixture.seedLeagueId, now: new Date(fixture.now), provider: controlledProvider() });
    assert.deepEqual((await readSeasons(storePath))?.map(season => season.year), ['2021', '2020', '2019']);
    const current = await readSeason('2021', { storePath });
    assert.deepEqual(current?.rows.find(row => row.name === 'Timh17')?.record, '0–3');
    assert.equal(current?.rows.find(row => row.name === 'Timh17')?.points, 60);
    const tim = (await readSeason('2020', { storePath }))?.rows.find(row => row.name === 'Timh17');
    assert.equal(tim?.points, 25.5);
    assert.equal(tim?.record, '1–0');
    assert.equal(tim?.personId, 'person-608473907007143936');
    const woody = (await readSeason('2019', { storePath }))?.rows.find(row => row.name === 'Woody14');
    assert.notEqual(tim?.personId, woody?.personId);
    assert.equal(tim?.franchiseId, woody?.franchiseId);
    const alec = (await readSeason('2020', { storePath }))?.rows.find(row => row.name === 'alecswartout');
    const sebastian = current?.rows.find(row => row.name === 'sebastian12');
    assert.notEqual(alec?.personId, sebastian?.personId);
    assert.equal(alec?.franchiseId, sebastian?.franchiseId);
    const old = await readSeason('2019', { storePath });
    assert.equal(old?.rows.find(row => row.name === 'Manager 1')?.record, '0–0–1');
    assert.equal(old?.rows.find(row => row.name === 'Manager 3')?.points, 0);
    assert.equal(old?.scoring.rec, 0.5);
    assert.equal((await readSeason('2020', { storePath }))?.scoring.rec, 1);
    assert.equal(old?.rows.some(row => row.name.includes('Present-day label')), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('repeat imports, score corrections and failed refreshes preserve one coherent public history', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'museum-refresh-'));
  try {
    const { refresh } = await import('../../src/history/refresh.ts');
    const { readSeason } = await import('../../src/history/read.ts');
    const options = { storePath: join(directory, 'history.json'), leagueId: fixture.seedLeagueId, now: new Date(fixture.now) };
    await refresh({ ...options, provider: controlledProvider() });
    const repeated = await refresh({ ...options, provider: controlledProvider() });
    assert.equal(repeated.changed, false);
    assert.equal((await readSeason('2021', options))?.rows.find(row => row.name === 'Timh17')?.record, '0–3');
    await refresh({ ...options, provider: controlledProvider('correctedOfficialScore') });
    const corrected = await readSeason('2020', options);
    assert.equal(corrected?.rows.find(row => row.name === 'Timh17')?.record, '0–1');
    assert.equal(corrected?.rows.find(row => row.name === 'Timh17')?.points, 23.5);
    for (const variant of ['missingResponse', 'failedRequest']) {
      await assert.rejects(refresh({ ...options, provider: controlledProvider(variant) }), /league\/900000000000002020\/matchups\/1/);
      assert.deepEqual(await readSeason('2020', options), corrected);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('standings preserve decimal score precision across completed weeks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'museum-decimals-'));
  try {
    const { refresh } = await import('../../src/history/refresh.ts');
    const { readSeason } = await import('../../src/history/read.ts');
    const base = controlledProvider();
    const storePath = join(directory, 'history.json');
    await refresh({ storePath, leagueId: fixture.seedLeagueId, now: new Date(fixture.now), provider: {
      async get(path) {
        const response = await base.get(path);
        const week = /^league\/900000000000002021\/matchups\/([123])$/.exec(path);
        if (week) (response as Array<{ roster_id: number; points: number }>).find(row => row.roster_id === 7)!.points = [0.1, 0.2, 0.3][Number(week[1]) - 1];
        return response;
      },
    } });
    assert.equal((await readSeason('2021', { storePath }))?.rows.find(row => row.name === 'Timh17')?.points, 0.6);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
