import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { refresh } from '../../src/history/refresh.ts';
import { readCategory } from '../../src/history/records.ts';
import { pickupsSource } from '../fixtures/pickups-source.ts';
const tim = 'person-608473907007143936';
async function fixture() { return pickupsSource(JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'))); }
async function withHistory(run: (storePath: string) => Promise<void>) { const dir = await mkdtemp(join(tmpdir(), 'museum-pickups-')); try { await run(join(dir, 'history.json')); } finally { await rm(dir, { recursive: true, force: true }); } }
function publish(storePath: string, source: any) { return refresh({ storePath, leagueId: source.seedLeagueId, provider: { async get(path) { if (!(path in source.responses)) throw new Error(`Missing controlled response: ${path}`); return structuredClone(source.responses[path]); } } }); }

test('published pickups credit full later weeks, retain distinct reacquisitions and stop before commissioner/trade departures', async () => {
  await withHistory(async storePath => {
    await publish(storePath, await fixture());
    const category = await readCategory('productive-pickup', { storePath, season: '2021' });
    assert.ok(category);
    assert.deepEqual(category.rows.map(row => [row.id, row.value, row.sample]), [
      ['900000000000002021:920000000000000001:50:7', 18.3, '2 starts'],
      ['900000000000002021:920000000000000005:50:7', 13.4, '1 start'],
      ['900000000000002021:920000000000000003:50:10', 0, '0 starts'],
    ]);
    assert.equal(category.rows[0].exactKey, '183/10');
    assert.equal(category.rows[0].personId, tim);
    assert.equal(category.rows[0].href, `/managers/${tim}/players/50/?scope=regular&season=2021&pickup=900000000000002021%3A920000000000000001%3A50%3A7`);
    assert.deepEqual(category.rows[0].period, { year: '2021', week: 3, playedAt: null });
  });
});

test('published player detail retains the selected acquisition spell instead of displaying its whole career total', async () => {
  await withHistory(async storePath => {
    await publish(storePath, await fixture());
    const { readPlayerContributions, readContributors } = await import('../../src/history/contributions.ts');
    const pickup = '900000000000002021:920000000000000001:50:7';
    const history = await readPlayerContributions({ personId: tim }, '50', { storePath, pickup, season: '2021' });
    assert.equal(history?.points, 18.3); assert.equal(history?.starts, 2);
    assert.deepEqual(history?.games.map(row => [row.week, row.points]), [[3, 11.2], [2, 7.1]]);
    assert.equal(history?.pickup?.id, pickup);
    assert.equal(history?.wholeHistoryHref, `/managers/${tim}/players/50/?scope=regular&season=2021`);
    const whole = await readPlayerContributions({ personId: tim }, '50', { storePath });
    assert.equal(whole?.points, 431.7);
    const contextual = await readContributors({ personId: tim }, { storePath, season: '2021' });
    assert.deepEqual(contextual?.pickups.map(row => [row.id, row.points]), [[pickup, 18.3], ['900000000000002021:920000000000000005:50:7', 13.4]]);
    assert.equal(await readPlayerContributions({ personId: tim }, '60', { storePath, pickup }), null);
    assert.equal(await readPlayerContributions({ personId: 'person-740265931783245824' }, '50', { storePath, pickup }), null);
  });
});

test('ownership source failures preserve published pickups while completed assets, nullable keepers and chronology remain available internally', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    const imported = await publish(storePath, source);
    assert.equal(imported.archive.drafts.find(row => row.seasonId === '900000000000002021')?.picks[0].keeper, null);
    assert.equal(imported.archive.drafts.find(row => row.seasonId === '900000000000002020')?.picks[0].keeper, true);
    const trade = imported.archive.transactions.find(row => row.id === '920000000000000009');
    assert.deepEqual(trade?.source.waiver_budget, [{ sender: 7, receiver: 10, amount: 5 }]);
    assert.deepEqual(trade?.source.draft_picks, [{ season: '2022', round: 1, roster_id: 7, owner_id: 10 }]);
    assert.equal(imported.archive.transactions.filter(row => row.status !== 'complete').length, 2);
    const { readPlayerContributions } = await import('../../src/history/contributions.ts');
    assert.equal((await readPlayerContributions({ personId: tim }, '60', { storePath }))?.points, 36);
    const { resolveOwnership } = await import('../../src/history/ownership.ts');
    const ownership = resolveOwnership(imported.archive);
    assert.equal(ownership.spells.find(row => row.arrival?.transactionId === '920000000000000009')?.pickupCandidate, false);
    assert.equal(ownership.departures.find(row => row.transactionId === '920000000000000006')?.dropCandidate, false);
    assert.equal(ownership.departures.find(row => row.transactionId === '920000000000000004')?.dropCandidate, true);
    const original = await readCategory('productive-pickup', { storePath });
    assert.equal((await publish(storePath, source)).changed, false);
    const correction = source.responses[`league/${source.seedLeagueId}/matchups/2`].find((row: any) => row.roster_id === 7);
    correction.players_points['50'] = 7.2;
    correction.starters_points[correction.starters.indexOf('50')] = 7.2;
    await publish(storePath, source);
    assert.equal((await readCategory('productive-pickup', { storePath }))?.rows[0].value, 18.4);
    for (const corrupt of [
      (input: any) => { input.responses[`league/${input.seedLeagueId}/transactions/1`] = null; },
      (input: any) => { input.responses[`league/${input.seedLeagueId}/transactions/1`][0].status_updated = null; },
      (input: any) => { input.responses[`league/${input.seedLeagueId}/transactions/4`][1].status_updated = 1002; },
      (input: any) => { input.responses['draft/9000000000000020211/picks'] = null; },
    ]) {
      const broken = structuredClone(source); corrupt(broken);
      await assert.rejects(publish(storePath, broken), /complete source array|recorded chronology|ambiguous recorded chronology/);
      assert.equal((await readCategory('productive-pickup', { storePath }))?.rows[0].value, 18.4);
    }
    assert.equal(original?.rows[0].value, 18.3);
  });
});

test('published pickup scopes remain within their season and earning owner across replacements and completed playoff legs', async () => {
  await withHistory(async storePath => {
    const source = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
    for (const year of ['2019', '2020']) source.responses[`league/9000000000000020${year.slice(-2)}/transactions/0`].push({ transaction_id: `9400000000000020${year.slice(-2)}`, leg: 0, type: 'waiver', status: 'complete', status_updated: 100, adds: { '107': 7 }, drops: null });
    await publish(storePath, source);
    const regular = await readCategory('productive-pickup', { storePath });
    assert.deepEqual(regular?.rows.filter(row => row.name === 'Synthetic Player 107').map(row => [row.personId, row.value]), [[tim, 20], ['person-472580465006473216', 15.5]]);
    const combined = await readCategory('productive-pickup', { storePath, season: '2020', scope: 'combined' });
    assert.equal(combined?.rows[0].value, 50.5);
    assert.equal((await readCategory('productive-pickup', { storePath, season: '2020', scope: 'playoffs' }))?.rows[0].value, 30.5);
    const { readContributors } = await import('../../src/history/contributions.ts');
    assert.deepEqual((await readContributors({ franchiseId: 'franchise-7' }, { storePath, season: '2019' }))?.pickups.map(row => row.person.name), ['Woody14']);
  });
});
