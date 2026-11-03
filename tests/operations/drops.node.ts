import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { refresh } from '../../src/history/refresh.ts';
import { readCategory } from '../../src/history/records.ts';
import { readContributors, readPlayerContributions } from '../../src/history/contributions.ts';
import { dropsSource } from '../fixtures/drops-source.ts';
const tim = 'person-608473907007143936';
async function fixture() { return dropsSource(JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'))); }
async function withHistory(run: (storePath: string) => Promise<void>) { const dir = await mkdtemp(join(tmpdir(), 'museum-drops-')); try { await run(join(dir, 'history.json')); } finally { await rm(dir, { recursive: true, force: true }); } }
function publish(storePath: string, source: any) { return refresh({ storePath, leagueId: source.seedLeagueId, provider: { async get(path) { if (!(path in source.responses)) throw new Error(`Missing controlled response: ${path}`); return structuredClone(source.responses[path]); } } }); }

test('published drops count other people strictly after each drop without merging events or stopping at own reacquisition', async () => {
  await withHistory(async storePath => {
    await publish(storePath, await fixture());
    const category = await readCategory('productive-drop', { storePath, season: '2021' });
    assert.ok(category);
    assert.deepEqual(category.rows.map(row => [row.id, row.value, row.sample, row.rank]), [
      ['900000000000002021:920000000000000002:50:7', 400, '1 start', 1],
      ['900000000000002021:950000000000000001:50:7', 400, '1 start', 1],
      ['900000000000002021:920000000000000004:50:10', 13.4, '1 start', 3],
    ]);
    assert.equal(category.rows[0].personId, tim);
    assert.equal(category.rows[0].exactKey, '400/1');
    assert.equal(category.rows[0].href, `/managers/${tim}/seasons/2021/?tab=players&scope=regular&view=drops&event=900000000000002021%3A920000000000000002%3A50%3A7`);
    assert.equal(category.leaders.length, 2);
    assert.match(category.leaders[0].leaderContext!, /Timh17.*2021.*Week 4 drop/);
  });
});

test('the dropping person season Players view retains the selected event and links actual receiving people and games', async () => {
  await withHistory(async storePath => {
    await publish(storePath, await fixture());
    const event = '900000000000002021:920000000000000002:50:7';
    const players = await readContributors({ personId: tim }, { storePath, season: '2021', view: 'drops', event });
    assert.equal(players?.selectedDrop?.id, event);
    assert.equal(players?.selectedDrop?.points, 400);
    assert.equal(players?.selectedDrop?.starts, 1);
    assert.deepEqual(players?.selectedDrop?.receivers.map(row => [row.person.name, row.points, row.starts]), [['sebastian12', 400, 1]]);
    assert.equal(players?.selectedDrop?.receivers[0].href, '/managers/person-740265931783245824/players/50/?scope=regular&season=2021');
    assert.deepEqual(players?.selectedDrop?.games.map(row => [row.week, row.owner.name, row.points]), [[7, 'sebastian12', 400]]);
    assert.match(players!.selectedDrop!.games[0].href, /scope=regular&week=7&player=50&team=10#player-10-50$/);
    assert.equal(players?.rows.find(row => row.playerId === '50')?.points, 431.7);
    assert.equal((await readPlayerContributions({ personId: tim }, '50', { storePath }))?.points, 431.7);
    assert.equal((await readPlayerContributions({ personId: 'person-740265931783245824' }, '50', { storePath }))?.points, 600);
    assert.equal(await readContributors({ personId: tim }, { storePath, season: '2020', view: 'drops', event }), null);
    assert.equal(await readContributors({ personId: 'person-740265931783245824' }, { storePath, season: '2021', view: 'drops', event }), null);
    assert.equal(await readContributors({ personId: tim }, { storePath, season: '2021', view: 'drops', event: 'missing-drop' }), null);
  });
});

test('published drop scopes preserve the dropping owner, receiving owner, season boundary and playoff selection', async () => {
  await withHistory(async storePath => {
    const source = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
    for (const year of ['2019', '2020', '2021']) source.responses[`league/90000000000000${year}/transactions/0`].push({ transaction_id: `96000000000000${year}`, leg: 0, type: 'free_agent', status: 'complete', status_updated: 100, adds: null, drops: { '110': 7 } });
    await publish(storePath, source);
    const category = await readCategory('productive-drop', { storePath });
    assert.deepEqual(category?.rows.filter(row => row.name === 'Synthetic Player 110').map(row => [row.personId, row.value]), [[tim, 101], [tim, 24.25], ['person-472580465006473216', 9.5]]);
    const old = await readContributors({ personId: 'person-472580465006473216' }, { storePath, season: '2019', view: 'drops', event: '900000000000002019:960000000000002019:110:7' });
    assert.deepEqual(old?.selectedDrop?.receivers.map(row => row.person.name), ['alecswartout']);
    const current = await readContributors({ personId: tim }, { storePath, season: '2021', view: 'drops', event: '900000000000002021:960000000000002021:110:7' });
    assert.deepEqual(current?.selectedDrop?.receivers.map(row => row.person.name), ['sebastian12']);
    assert.equal((await readCategory('productive-drop', { storePath, season: '2020', scope: 'combined' }))?.rows[0].value, 49.5);
    assert.equal((await readCategory('productive-drop', { storePath, season: '2020', scope: 'playoffs' }))?.rows[0].value, 25.25);
    assert.equal((await readContributors({ franchiseId: 'franchise-7' }, { storePath, season: '2019' }))?.drops[0].person.name, 'Woody14');
  });
});

test('score corrections update persisted drop history and failed refresh keeps the last complete public result', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    await publish(storePath, source);
    assert.equal((await publish(storePath, source)).changed, false);
    const correction = source.responses[`league/${source.seedLeagueId}/matchups/7`].find((row: any) => row.roster_id === 10);
    correction.players_points['50'] = 400.12;
    correction.starters_points[correction.starters.indexOf('50')] = 400.12;
    await publish(storePath, source);
    assert.equal((await readCategory('productive-drop', { storePath, season: '2021' }))?.rows[0].value, 400.12);
    const event = '900000000000002021:920000000000000002:50:7';
    assert.equal((await readContributors({ personId: tim }, { storePath, season: '2021', view: 'drops', event }))?.selectedDrop?.games[0].points, 400.12);
    const broken = structuredClone(source);
    broken.responses[`league/${source.seedLeagueId}/transactions/4`] = null;
    await assert.rejects(publish(storePath, broken), /complete source array/);
    assert.equal((await readCategory('productive-drop', { storePath, season: '2021' }))?.rows[0].value, 400.12);
    assert.equal((await readContributors({ personId: tim }, { storePath, season: '2021', view: 'drops', event }))?.selectedDrop?.points, 400.12);
    assert.equal((await readPlayerContributions({ personId: tim }, '50', { storePath }))?.points, 431.7);
  });
});

test('drop category and contextual history include every tied event at the tenth-place cutoff', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    for (let index = 0; index < 12; index++) source.responses[`league/${source.seedLeagueId}/transactions/0`].push({ transaction_id: `9700000000000000${String(index).padStart(2, '0')}`, leg: 0, type: 'free_agent', status: 'complete', status_updated: 3000 + index, adds: null, drops: { '50': 7 } });
    await publish(storePath, source);
    const category = await readCategory('productive-drop', { storePath, season: '2021' });
    assert.equal(category?.rows.length, 12);
    assert.equal(category?.leaders.length, 12);
    assert.equal(category?.total, 15);
    assert.ok(category?.rows.every(row => row.rank === 1 && row.value === 600));
    assert.equal((await readCategory('productive-drop', { storePath, season: '2021', limit: 20 }))?.rows.length, 15);
    assert.equal((await readContributors({ personId: tim }, { storePath, season: '2021', view: 'drops' }))?.drops.length, 12);
    // A selected result below the initial cutoff remains directly readable.
    assert.equal((await readContributors({ personId: tim }, { storePath, season: '2021', view: 'drops', event: '900000000000002021:920000000000000002:50:7' }))?.selectedDrop?.points, 400);
  });
});
