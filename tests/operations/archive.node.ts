import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { readCategory } from '../../src/history/records.ts';
import { readSeason, readSeasons } from '../../src/history/read.ts';
import { loadArchive, withHistorySnapshot } from '../../src/history/store.ts';

const tim = 'person-608473907007143936';
async function fixture() { return JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8')); }
async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'archive-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
// A version 1 file as production holds it: raw responses inside, and a league name no read may ever show.
const versionOne = (leagueId: string) => JSON.stringify({
  version: 1, leagueId, importedAt: '2026-11-03T11:59:00.000Z',
  seasons: [{ id: leagueId, year: '2021', name: 'Version 1 league' }],
  people: [], franchises: [], contests: [], performances: [], players: [], transactions: [], drafts: [], coverage: [],
  source: { 'state/nfl': { season: '2021', week: 4 } },
});

test('a version 1 archive counts as missing and is imported again without raw responses', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    await writeFile(storePath, versionOne(source.seedLeagueId));
    assert.equal(await readSeasons(storePath), null);
    assert.equal(await readCategory('highest-score', { storePath }), null);

    assert.equal((await publish(storePath, source)).changed, true);
    assert.deepEqual((await readSeasons(storePath))?.map(season => season.year), ['2021', '2020', '2019']);
    assert.equal((await readSeason('2020', { storePath }))?.rows.find(row => row.personId === tim)?.points, 25.5);

    const published = JSON.parse(await readFile(storePath, 'utf8'));
    assert.equal(published.version, 2);
    assert.deepEqual(Object.keys(published).sort(), ['contests', 'coverage', 'drafts', 'franchises', 'importedAt', 'leagueId', 'people', 'performances', 'players', 'seasons', 'transactions', 'version']);
  });
});

test('players keep college and birth date, and either may be unknown', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    const players = source.responses['players/nfl'];
    Object.assign(players['50'], { college: ' Notre Dame ', birth_date: '1997-02-09' });
    Object.assign(players['101'], { college: null, birth_date: '1995-09-17' });
    Object.assign(players['102'], { college: 'Iowa', birth_date: null });
    Object.assign(players['103'], { college: '', birth_date: '17 September 1995' });
    Object.assign(players['104'], { college: 7, birth_date: '1995-13-40' });
    // Player 90 appears only in an unsuccessful claim, never in a lineup.
    Object.assign(players['90'], { college: 'Penn State', birth_date: '2001-12-31' });
    // Player 901 stays listed without either field; 110 has left the player list altogether.
    delete players['110'];
    source.responses['league/900000000000002021/drafts'] = [];
    source.responses['league/900000000000002020/drafts'] = [];
    source.responses['league/900000000000002019/drafts'] = [];
    await publish(storePath, source);
    const known = new Map((await loadArchive(storePath))!.players.map(player => [player.id, [player.college, player.birthDate]]));
    assert.deepEqual(known.get('50'), ['Notre Dame', '1997-02-09']);
    assert.deepEqual(known.get('101'), [null, '1995-09-17']);
    assert.deepEqual(known.get('102'), ['Iowa', null]);
    assert.deepEqual(known.get('103'), [null, null]);
    assert.deepEqual(known.get('104'), [null, null]);
    assert.deepEqual(known.get('90'), ['Penn State', '2001-12-31']);
    assert.deepEqual(known.get('901'), [null, null]);
    assert.deepEqual(known.get('110'), [null, null]);
  });
});

test('a failed refresh keeps the last good archive and a repeat import of the same history reports no change', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    const broken = structuredClone(source);
    delete broken.responses['league/900000000000002020/matchups/1'];
    // Nothing good exists yet: the version 1 file stays missing rather than becoming readable.
    await writeFile(storePath, versionOne(source.seedLeagueId));
    await assert.rejects(publish(storePath, broken), /Missing controlled response/);
    assert.equal(await readSeasons(storePath), null);

    await publish(storePath, source);
    const good = await readFile(storePath, 'utf8');
    await assert.rejects(publish(storePath, broken, '2026-11-04T12:00:00Z'), /Missing controlled response/);
    assert.equal(await readFile(storePath, 'utf8'), good);

    // Provider answers outside the league's history are no longer part of it.
    source.responses['players/nfl']['999'] = { player_id: '999', full_name: 'Never rostered', position: 'WR' };
    source.responses['state/nfl'].display_week = 9;
    assert.equal((await publish(storePath, source)).changed, false);
    source.responses['players/nfl']['50'].birth_date = '1997-02-09';
    assert.equal((await publish(storePath, source)).changed, true);
    assert.equal((await publish(storePath, source)).changed, false);
  });
});

test('drafts and transactions keep the source fields later stats read', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    const draft = source.responses['league/900000000000002020/drafts'][0];
    Object.assign(draft, { start_time: 1599525047529, draft_order: { '608473907007143936': 1, '473910025325113344': 2 } });
    draft.settings.player_type = 0;
    const pick = source.responses[`draft/${draft.draft_id}/picks`][0];
    Object.assign(pick, { metadata: { team: 'TB', position: 'QB', amount: '41' } });
    await publish(storePath, source);
    const archive = (await loadArchive(storePath))!;
    const kept = archive.drafts.find(row => row.seasonId === '900000000000002020')!;
    assert.deepEqual([kept.source.type, kept.source.status, kept.source.start_time, kept.source.draft_order], ['snake', 'complete', 1599525047529, { '608473907007143936': 1, '473910025325113344': 2 }]);
    assert.deepEqual(kept.source.settings, { teams: 2, rounds: 1, player_type: 0 });
    const { playerId, rosterId, keeper, source: recorded } = kept.picks[0];
    assert.deepEqual([playerId, rosterId, keeper, recorded.round, recorded.draft_slot, recorded.pick_no, recorded.metadata], ['107', '7', true, 1, 1, 1, { team: 'TB', position: 'QB', amount: '41' }]);
    const failed = archive.transactions.find(row => row.id === '910000000000000003')!;
    assert.deepEqual([failed.type, failed.status, failed.week, failed.adds], ['waiver', 'failed', 1, { '90': '7' }]);
    const trade = archive.transactions.find(row => row.id === '910000000000000005')!;
    assert.deepEqual([trade.source.draft_picks, trade.source.waiver_budget], [[{ season: '2022', round: 1, roster_id: 7, previous_owner_id: 7, owner_id: 10 }], [{ sender: 7, receiver: 10, amount: 5 }]]);
    assert.equal(trade.source.status_updated, trade.completedAt);
  });
});

test('a visit imports a version 1 league again, then reads one parsed archive without going back to the store', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archive-visit-'));
  const network = globalThis.fetch;
  const source = await fixture();
  const requested: string[] = [];
  globalThis.fetch = async input => {
    const path = String(input).slice('https://api.sleeper.app/v1/'.length);
    requested.push(path);
    // Unplayed weeks the import provider prefetches but the import never asks for.
    return path in source.responses ? Response.json(source.responses[path]) : new Response(null, { status: 404 });
  };
  process.env.HISTORY_DATA_PATH = directory;
  try {
    const { ensureLeague, leagueStorePath } = await import('../../src/leagues.ts');
    const id = source.seedLeagueId;
    const storePath = leagueStorePath(id);
    await mkdir(dirname(storePath));
    await writeFile(storePath, versionOne(id).replace('2026-11-03T11:59:00.000Z', new Date().toISOString()));

    const imported = await ensureLeague(id);
    assert.equal(imported.status, 'ready');
    assert.ok(requested.includes(`league/${id}`));
    requested.length = 0;
    const visited = await ensureLeague(id);
    assert.equal(visited.status, 'ready');
    assert.deepEqual(requested, [], 'a fresh archive needs no provider');
    assert.deepEqual(visited.archive, imported.archive);
    await rm(storePath);
    for (const { archive } of [imported, visited]) await withHistorySnapshot(archive, async () => {
      assert.deepEqual((await readSeasons(storePath))?.map(season => season.name), ['Synthetic history 2021', 'Synthetic history 2020', 'Synthetic history 2019']);
      assert.equal((await readCategory('highest-score', { storePath }))?.rows[0].value, 40);
    }, storePath);

    // A stale archive whose refresh fails is still what the visit reads.
    await publish(storePath, source, '2026-11-03T12:00:00Z');
    delete source.responses['league/900000000000002020/matchups/1'];
    const stale = await ensureLeague(id);
    assert.equal(stale.status, 'ready');
    assert.equal(stale.archive?.importedAt, '2026-11-03T12:00:00.000Z');
    assert.deepEqual(await ensureLeague('404'), { status: 'missing', archive: null });
  } finally {
    globalThis.fetch = network;
    delete process.env.HISTORY_DATA_PATH;
    await rm(directory, { recursive: true, force: true });
  }
});
