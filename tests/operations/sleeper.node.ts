import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { refresh } from '../../src/history/refresh.ts';
import { sleeperImportProvider } from '../../src/history/sleeper.ts';
import type { Provider } from '../../src/history/types.ts';

const fixture = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));

function countingProvider(calls: string[]): Provider {
  return { async get(path) {
    calls.push(path);
    if (!(path in fixture.responses)) throw new Error(`Missing controlled response: ${path}`);
    return structuredClone(fixture.responses[path]);
  } };
}

test('the import provider publishes the same history as sequential reads and fetches the player list once a day', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sleeper-provider-'));
  try {
    const options = { leagueId: fixture.seedLeagueId, now: new Date(fixture.now) };
    const direct = await refresh({ ...options, storePath: join(directory, 'direct.json'), provider: countingProvider([]) });
    const playerCache = join(directory, 'players-nfl.json');
    const first: string[] = [];
    const prefetched = await refresh({ ...options, storePath: join(directory, 'prefetched.json'), provider: sleeperImportProvider(playerCache, countingProvider(first)) });
    assert.deepEqual(prefetched.archive, direct.archive);
    assert.equal(first.filter(path => path === 'players/nfl').length, 1);
    assert.equal(new Set(first).size, first.length, 'each path is requested once');

    const second: string[] = [];
    await refresh({ ...options, storePath: join(directory, 'again.json'), provider: sleeperImportProvider(playerCache, countingProvider(second)) });
    assert.equal(second.includes('players/nfl'), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('two leagues importing at once share one player-list download and cache write', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sleeper-provider-'));
  try {
    // Each league import builds its own provider over the one cache file, so two first visits at once both find it missing.
    // They must share one download (Sleeper asks for the list once a day) and so never race two writes to the same file.
    const playerCache = join(directory, 'players-nfl.json');
    const calls: string[] = [];
    const [first, second] = await Promise.all([sleeperImportProvider(playerCache, countingProvider(calls)).get('players/nfl'),
      sleeperImportProvider(playerCache, countingProvider(calls)).get('players/nfl')]);
    assert.equal(calls.filter(path => path === 'players/nfl').length, 1);
    assert.deepEqual(first, fixture.responses['players/nfl']);
    assert.deepEqual(second, fixture.responses['players/nfl']);
    assert.deepEqual(JSON.parse(await readFile(playerCache, 'utf8')), fixture.responses['players/nfl']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
