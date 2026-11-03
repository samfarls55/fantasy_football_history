import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-contributions-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
async function fixture() { return JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8')); }
const tim = 'person-608473907007143936';
const woody = 'person-472580465006473216';

test('published starting contributions retain owner tenure, exclude bench and overrides, and link the actual scored weeks', async () => {
  await withHistory(async storePath => {
    await publish(storePath, await fixture());
    const { readPlayerContributions, readContributors } = await import('../../src/history/contributions.ts');
    const person = await readPlayerContributions({ personId: tim }, '107', { storePath });
    assert.equal(person?.points, 58);
    assert.equal(person?.starts, 4);
    assert.deepEqual(person?.seasons.map(row => [row.year, row.points, row.starts]), [['2021', 38, 3], ['2020', 20, 1]]);
    assert.deepEqual(person?.games.map(row => [row.year, row.week, row.points]), [['2021', 3, 9], ['2021', 2, 14], ['2021', 1, 15]]);
    const selected = await readPlayerContributions({ personId: tim }, '107', { storePath, season: '2020', scope: 'combined' });
    assert.equal(selected?.points, 88.5);
    assert.equal(selected?.games.length, 2);
    assert.equal(selected?.games[1].href, '/seasons/2020/matchups/900000000000002020-w1-m1/?scope=combined&week=1&player=107&team=7#player-7-107');
    assert.equal(selected?.games[1].teamPoints, 25.5);
    assert.equal(selected?.games[1].opponent.name, 'alecswartout');
    const franchise = await readPlayerContributions({ franchiseId: 'franchise-7' }, '107', { storePath });
    assert.equal(franchise?.points, 73.5);
    assert.equal(franchise?.starts, 5);
    assert.deepEqual(franchise?.seasons.map(row => row.owner.name), ['Timh17', 'Timh17', 'Woody14']);
    assert.equal((await readPlayerContributions({ personId: woody }, '107', { storePath }))?.points, 15.5);
    const contributors = await readContributors({ personId: tim }, { storePath, season: '2021' });
    assert.deepEqual(contributors?.rows.map(row => [row.playerId, row.points, row.starts]), [['107', 38, 3], ['50', 16, 2], ['60', 6, 1]]);
    assert.equal(contributors?.rows[0].href, `/managers/${tim}/players/107/?scope=regular&season=2021`);
  });
});

test('published player/person rankings share exact contribution values and keep replacements separate', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    const row = source.responses['league/900000000000002020/matchups/1'][0];
    row.starters_points[0] = 20.12; row.players_points['107'] = 20.12;
    await publish(storePath, source);
    const { readCategory } = await import('../../src/history/records.ts');
    const category = await readCategory('player-contributions', { storePath });
    assert.equal(category?.rows.find(row => row.id === `107:${tim}`)?.value, 58.12);
    assert.equal(category?.rows.find(row => row.id === `107:${tim}`)?.exactKey, '1453/25');
    assert.equal(category?.rows.find(row => row.id === `107:${woody}`)?.value, 15.5);
    assert.equal(category?.rows.find(row => row.id === `107:${tim}`)?.sample, '4 starts');
    assert.deepEqual(category?.rows.find(row => row.id === `107:${tim}`)?.period, { year: '2021', week: 3, playedAt: null });
    assert.equal(category?.rows.find(row => row.id === `107:${tim}`)?.href, `/managers/${tim}/players/107/?scope=regular`);
    const { readContributors } = await import('../../src/history/contributions.ts');
    const season = await readContributors({}, { storePath, season: '2021' });
    assert.equal(season?.rows.find(row => row.id === `107:${tim}`)?.points, 38);
    assert.ok(season?.rows.every(row => row.range === '2021'));
  });
});

test('published zero starts differ from true zero-point starts and missing required scores retain the last complete history', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    source.responses['league/900000000000002021/matchups/1'][0].starters[1] = null;
    await publish(storePath, source);
    const { readPlayerContributions, readContributors } = await import('../../src/history/contributions.ts');
    const empty = await readPlayerContributions({ personId: 'person-800000000000000001' }, '901', { storePath, season: '2021' });
    assert.equal(empty?.points, 0); assert.equal(empty?.starts, 0); assert.deepEqual(empty?.games, []);
    const zero = await readPlayerContributions({ personId: 'person-800000000000000003' }, '103', { storePath, season: '2019' });
    assert.equal(zero?.points, 0); assert.equal(zero?.starts, 1);
    assert.ok(!(await readContributors({}, { storePath }))?.rows.some(row => row.playerId === '0'));
    const row = source.responses['league/900000000000002021/matchups/2'][2];
    row.starters_points[0] = 14.1; row.players_points['107'] = 14.1;
    await publish(storePath, source);
    const corrected = await readPlayerContributions({ personId: tim }, '107', { storePath });
    assert.equal(corrected?.points, 58.1);
    assert.equal((await publish(storePath, source)).changed, false);
    row.starters_points[0] = null; delete row.players_points['107'];
    await assert.rejects(publish(storePath, source), /missing starter points/);
    assert.deepEqual(await readPlayerContributions({ personId: tim }, '107', { storePath }), corrected);
    assert.equal(await readPlayerContributions({ personId: 'unknown' }, '107', { storePath }), null);
    assert.equal(await readPlayerContributions({ personId: tim }, 'unknown', { storePath }), null);
  });
});

test('a completed leg of a pending multiweek title contributes points and a start without a finalized result or a bye start', async () => {
  await withHistory(async storePath => {
    const source = JSON.parse(await readFile(new URL('../fixtures/playoff-type-1.json', import.meta.url), 'utf8'));
    source.responses[`league/${source.seedLeagueId}`].status = 'in_season';
    source.responses[`league/${source.seedLeagueId}`].settings.last_scored_leg = 4;
    source.responses['state/nfl'].week = 5;
    for (const row of source.responses[`league/${source.seedLeagueId}/winners_bracket`].filter((row: any) => row.r === 3)) row.w = row.l = null;
    await publish(storePath, source);
    const { readPlayerContributions } = await import('../../src/history/contributions.ts');
    const history = await readPlayerContributions({ personId: 'person-950000000000000001' }, '201', { storePath, scope: 'playoffs' });
    assert.equal(history?.points, 60.1); assert.equal(history?.starts, 2);
    assert.deepEqual(history?.games.map(row => [row.week, row.points, row.result]), [[4, 10.1, '—'], [3, 50, 'W']]);
    const { readManager } = await import('../../src/history/managers.ts');
    assert.equal((await readManager('person-950000000000000001', { storePath, scope: 'playoffs' }))?.facts.record, '1–0');
  });
});
