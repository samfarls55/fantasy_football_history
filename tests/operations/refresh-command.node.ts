import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { readSeason } from '../../src/history/read.ts';

const project = resolve(import.meta.dirname, '../..');
const firstRun = '2026-11-03T12:00:00.000Z';
const repeatedRun = '2026-11-04T12:00:00.000Z';
const failedEndpoint = 'league/900000000000002020/matchups/1';
const expectedCoverage = [{
  seasonId: '900000000000002021', area: 'player-points',
  detail: 'league/900000000000002021/matchups/1: missing bench points for roster 1, player 901',
  blocks: ['benched-player'],
}];

test('the refresh command reports successful publication, repeat runs and retained or missing history after failure', async () => {
  const reviewDirectory = join(project, '.impeccable/review');
  await mkdir(reviewDirectory, { recursive: true });
  const directory = await mkdtemp(join(reviewDirectory, 'refresh-command-'));
  try {
    const storePath = join(directory, 'history.json');
    const preloadPath = join(directory, 'controlled-provider.mjs');
    // Intercept only the external provider and clock boundaries. The real
    // command imports, validates and publishes into its configured durable store.
    await writeFile(preloadPath, `
import { readFile } from 'node:fs/promises';
const source = JSON.parse(await readFile(${JSON.stringify(join(project, 'tests/fixtures/provider-history.json'))}, 'utf8'));
delete source.responses['league/900000000000002021/matchups/1'][0].players_points['901'];
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...values) { super(...(values.length ? values : [process.env.MUSEUM_TEST_NOW])); }
  static now() { return new NativeDate(process.env.MUSEUM_TEST_NOW).valueOf(); }
};
globalThis.fetch = async input => {
  const url = new URL(input);
  if (url.origin !== 'https://api.sleeper.app' || !url.pathname.startsWith('/v1/')) throw new Error('Unexpected provider URL');
  const path = url.pathname.slice('/v1/'.length);
  if (process.env.MUSEUM_TEST_FAIL === 'yes' && path === ${JSON.stringify(failedEndpoint)}) throw new Error('Controlled provider timeout');
  if (!(path in source.responses)) throw new Error('Missing controlled response: ' + path);
  return new Response(JSON.stringify(source.responses[path]), { headers: { 'content-type': 'application/json' } });
};
`);

    function command(script: string, now: string, fail = false) {
      const result = spawnSync(process.execPath, ['--import', preloadPath, script, ...(script.includes('history-publication') ? ['inspect'] : [])], {
        cwd: project, encoding: 'utf8',
        env: { ...process.env, MUSEUM_STORE_PATH: storePath, SLEEPER_LEAGUE_ID: '900000000000002021', MUSEUM_TEST_NOW: now, MUSEUM_TEST_FAIL: fail ? 'yes' : 'no' },
      });
      return { ...result, output: result.stdout ? JSON.parse(result.stdout) : null };
    }

    const initialFailure = command('scripts/refresh.ts', firstRun, true);
    assert.equal(initialFailure.status, 1);
    assert.equal(initialFailure.stdout, '');
    const initialDiagnostic = JSON.parse(initialFailure.stderr);
    assert.match(initialDiagnostic.error, /league\/900000000000002020\/matchups\/1: Controlled provider timeout/);
    assert.equal(initialDiagnostic.published, false);
    assert.equal(initialDiagnostic.retained, false);
    assert.equal(initialDiagnostic.lastSuccessfulAt, null);
    assert.equal(command('scripts/history-publication.ts', firstRun).output.published, false);

    const first = command('scripts/refresh.ts', firstRun);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.output.operation, 'refresh');
    assert.equal(first.output.changed, true);
    assert.equal(first.output.importedAt, firstRun);
    assert.deepEqual(first.output.coverage, expectedCoverage);
    const inspection = command('scripts/history-publication.ts', firstRun);
    assert.equal(inspection.status, 0, inspection.stderr);
    assert.equal(inspection.output.published, true);
    assert.equal(inspection.output.importedAt, firstRun);
    assert.deepEqual(inspection.output.coverage, expectedCoverage);
    assert.deepEqual(inspection.output.seasons.map((season: { year: string }) => season.year), ['2021', '2020', '2019']);

    const repeated = command('scripts/refresh.ts', repeatedRun);
    assert.equal(repeated.status, 0, repeated.stderr);
    assert.equal(repeated.output.changed, false);
    assert.equal(repeated.output.importedAt, repeatedRun);
    assert.equal(repeated.output.contests, first.output.contests);
    const retainedInspection = command('scripts/history-publication.ts', repeatedRun).output;
    assert.equal(retainedInspection.importedAt, repeatedRun);
    const publicSeason = await readSeason('2020', { storePath });
    assert.equal(publicSeason?.rows.find(row => row.name === 'Timh17')?.points, 25.5);

    const failed = command('scripts/refresh.ts', '2026-11-05T12:00:00.000Z', true);
    assert.equal(failed.status, 1);
    assert.equal(failed.stdout, '');
    const diagnostic = JSON.parse(failed.stderr);
    assert.match(diagnostic.error, /league\/900000000000002020\/matchups\/1: Controlled provider timeout/);
    assert.equal(diagnostic.storePath, storePath);
    assert.equal(diagnostic.published, true);
    assert.equal(diagnostic.retained, true);
    assert.equal(diagnostic.lastSuccessfulAt, repeatedRun);
    assert.deepEqual(diagnostic.coverage, expectedCoverage);
    assert.deepEqual(command('scripts/history-publication.ts', repeatedRun).output, retainedInspection);
    assert.deepEqual(await readSeason('2020', { storePath }), publicSeason);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
