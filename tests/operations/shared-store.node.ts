import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { seed, sharedStore, stored, stores } from '../support/stores.ts';
import { readSeasons } from '../../src/history/read.ts';
import { withHistorySnapshot } from '../../src/history/store.ts';

/** A server instance of its own: its own imports in flight and its own disk. */
async function instance(name: string, storePath: string): Promise<typeof import('../../src/leagues.ts')> {
  process.env.HISTORY_DATA_PATH = join(dirname(storePath), name);
  return import(`../../src/leagues.ts?${name}`).finally(() => delete process.env.HISTORY_DATA_PATH);
}

const hour = 60 * 60 * 1000;

test('a visitor waits for at most one import per refresh window, whichever instance answers', async t => {
  await sharedStore(async storePath => {
    const source = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
    const id = source.seedLeagueId;
    const network = globalThis.fetch;
    const requested: string[] = [];
    globalThis.fetch = async input => {
      const path = String(input).slice('https://api.sleeper.app/v1/'.length);
      requested.push(path);
      return path in source.responses ? Response.json(source.responses[path]) : new Response(null, { status: 404 });
    };
    try {
      const first = await instance('first', storePath);
      const visits = await Promise.all([first.ensureLeague(id), first.ensureLeague(id), first.ensureLeague(id)]);
      assert.deepEqual(visits.map(visit => visit.status), ['ready', 'ready', 'ready']);
      assert.ok(requested.includes('players/nfl'));
      assert.equal(new Set(requested).size, requested.length, 'concurrent visits share one import');

      requested.length = 0;
      const second = await instance('second', storePath);
      const read = await second.ensureLeague(id);
      assert.equal(requested.length, 0, 'another instance already imported this league');
      const path = second.leagueStorePath(id);
      await withHistorySnapshot(read.archive, async () => {
        assert.deepEqual((await readSeasons(path))?.map(season => season.name), ['Synthetic history 2021', 'Synthetic history 2020', 'Synthetic history 2019']);
      }, path);

      // Past the refresh window, a failed refresh keeps the last good archive.
      t.mock.timers.enable({ apis: ['Date'], now: Date.now() + 13 * hour });
      const published = await stored(path);
      const { 'league/900000000000002020/matchups/1': missing } = source.responses;
      delete source.responses['league/900000000000002020/matchups/1'];
      const kept = await second.ensureLeague(id);
      assert.equal(kept.status, 'ready');
      assert.deepEqual(kept.archive, JSON.parse(published));
      assert.equal(await stored(path), published);

      // The next refresh reuses the day's player list, and both instances then read its publication.
      source.responses['league/900000000000002020/matchups/1'] = missing;
      source.responses[`league/${id}`].name = 'Renamed league';
      requested.length = 0;
      assert.equal((await first.ensureLeague(id)).archive?.seasons[0].name, 'Renamed league');
      assert.equal(requested.includes('players/nfl'), false);
      requested.length = 0;
      assert.equal((await second.ensureLeague(id)).archive?.seasons[0].name, 'Renamed league');
      assert.equal(requested.length, 0);

      // A day later the list is downloaded once more.
      t.mock.timers.tick(25 * hour);
      await second.ensureLeague(id);
      assert.equal(requested.filter(path => path === 'players/nfl').length, 1);
    } finally {
      globalThis.fetch = network;
    }
  });
});

for (const withHistory of stores) test(`an instance reads the store once per refresh window, and a store it can't read is a failed visit (${withHistory.name})`, async t => {
  await withHistory(async storePath => {
    const source = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
    const id = source.seedLeagueId;
    const network = globalThis.fetch;
    globalThis.fetch = async input => {
      const path = String(input).slice('https://api.sleeper.app/v1/'.length);
      return path in source.responses ? Response.json(source.responses[path]) : new Response(null, { status: 404 });
    };
    try {
      const { ensureLeague, leagueStorePath } = await instance(`held-${withHistory.name}`, storePath);
      const path = leagueStorePath(id);
      const { archive } = await ensureLeague(id);
      const published = await stored(path);
      // A second visit that opened this would fail, or see another league's name.
      await seed(path, '{ unreadable');
      assert.deepEqual(await ensureLeague(id), { status: 'ready', archive });

      // Past the refresh window the store is read again: first unreadable, then older than the window.
      t.mock.timers.enable({ apis: ['Date'], now: Date.now() + 13 * hour });
      assert.deepEqual(await ensureLeague(id), { status: 'failed', archive: null });
      await seed(path, published);
      source.responses[`league/${id}`].name = 'Renamed league';
      const refreshed = await ensureLeague(id);
      assert.equal(refreshed.archive?.seasons[0].name, 'Renamed league');
      await seed(path, '{ unreadable');
      assert.deepEqual(await ensureLeague(id), refreshed);
    } finally {
      globalThis.fetch = network;
    }
  });
});
