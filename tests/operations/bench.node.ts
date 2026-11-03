import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { readCategory } from '../../src/history/records.ts';
import { readRecordCollection } from '../../src/history/records.ts';
import { readMatchup } from '../../src/history/read.ts';
import { readPlayerContributions } from '../../src/history/contributions.ts';
import { recordsSource } from '../fixtures/records-source.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-bench-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
async function fixture() { return JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8')); }

test('published bench records rank exact player/team/week performances and open the actual bench without adding starts', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    source.responses['league/900000000000002021/matchups/1'][0].players_points['901'] = 50.12345678;
    source.responses['league/900000000000002021/matchups/2'][0].players_points['901'] = 50.12345678;
    source.responses['league/900000000000002021/matchups/3'][0].players_points['901'] = 50.12345677;
    source.responses['league/900000000000002021/matchups/1'][0].players.push('0');
    const other = source.responses['league/900000000000002021/matchups/1'][1];
    other.players.push('902'); other.players_points['902'] = 50.12345678;
    await publish(storePath, source);
    const category = await readCategory('benched-player', { storePath });
    assert.deepEqual(category?.rows.map(row => [row.rank, row.value]), [[1, 50.12345678], [1, 50.12345678], [1, 50.12345678], [4, 50.12345677]]);
    const selected = category!.rows.find(row => row.period?.week === 2)!;
    assert.equal(selected.name, 'Synthetic Player 901');
    assert.equal(selected.personId, 'person-800000000000000001');
    assert.equal(selected.exactKey, '2506172839/50000000');
    assert.equal(selected.href, '/seasons/2021/matchups/900000000000002021-w2-m1/?scope=regular&week=2&player=901&team=1#player-1-901');
    assert.equal(selected.leaderContext, 'Manager 1 · Week 2 · 2021');
    assert.ok(selected.secondary?.some(row => row.href === '/managers/person-800000000000000001/players/901/?scope=regular&season=2021'));
    assert.equal(selected.avatar, null, 'a manager avatar must not masquerade as a player photograph');
    const game = await readMatchup('2021', '900000000000002021-w2-m1', { storePath, week: 2 });
    assert.equal(game?.lineups[0].bench[0].points, 50.12345678);
    assert.equal(game?.lineups[0].points, 10);
    const contributions = await readPlayerContributions({ personId: selected.personId }, '901', { storePath });
    assert.equal(contributions?.points, 0);
    assert.equal(contributions?.starts, 0);
  });
});

test('bench rankings preserve all rank-ten ties, repeated managers, zero points and shareable expansion selections', async () => {
  await withHistory(async storePath => {
    const source = recordsSource(Array.from({ length: 7 }, () => [1, 2]));
    const values = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 11, 11, 0, -1];
    for (let index = 0; index < values.length; index++) {
      const rows = source.responses[`league/${source.seedLeagueId}/matchups/${Math.floor(index / 2) + 1}`] as any[];
      const row = rows[index % 2];
      const playerId = `bench-${index}`;
      row.players = [playerId, '0']; row.players_points[playerId] = values[index];
    }
    await publish(storePath, source);
    const first = await readCategory('benched-player', { storePath, season: '2021', sort: 'newest' });
    assert.equal(first?.total, 14);
    assert.equal(first?.rows.length, 12);
    assert.equal(first?.rows.filter(row => row.rank === 10).length, 3);
    assert.equal(first?.nextHref, '/records/benched-player/?season=2021&scope=regular&sort=newest&limit=20');
    const expanded = await readCategory('benched-player', { storePath, season: '2021', limit: 20 });
    assert.equal(expanded?.rows.length, 14);
    assert.equal(expanded?.rows.filter(row => row.personId === 'person-960000000000000001').length, 7);
    assert.deepEqual(expanded?.rows.slice(-2).map(row => [row.rank, row.value]), [[13, 0], [14, -1]]);
    assert.equal(expanded?.nextHref, null);
    assert.equal((await readCategory('benched-player', { storePath, scope: 'playoffs' }))?.total, 0);
  });
});

test('bench scope follows actual completed weekly legs and links the selected leg of a pending multiweek final', async () => {
  await withHistory(async storePath => {
    const source = JSON.parse(await readFile(new URL('../fixtures/playoff-type-1.json', import.meta.url), 'utf8'));
    source.responses[`league/${source.seedLeagueId}`].status = 'in_season';
    source.responses[`league/${source.seedLeagueId}`].settings.last_scored_leg = 4;
    source.responses['state/nfl'].week = 5;
    for (const row of source.responses[`league/${source.seedLeagueId}/winners_bracket`].filter((row: any) => row.r === 3)) row.w = row.l = null;
    const final = source.responses[`league/${source.seedLeagueId}/matchups/4`].find((row: any) => row.roster_id === 1);
    final.players.push('bench-final'); final.players_points['bench-final'] = 99.12;
    const bye = source.responses[`league/${source.seedLeagueId}/matchups/2`].find((row: any) => row.matchup_id === null);
    bye.players.push('bench-bye'); bye.players_points['bench-bye'] = 1000;
    await publish(storePath, source);
    const playoffs = await readCategory('benched-player', { storePath, scope: 'playoffs', season: '2025' });
    assert.equal(playoffs?.total, 1);
    const winner = playoffs!.leaders[0];
    assert.equal(winner.value, 99.12);
    assert.equal(winner.period?.week, 4);
    const url = new URL(winner.href, 'http://museum.test');
    const game = await readMatchup('2025', url.pathname.split('/')[4], { storePath, week: Number(url.searchParams.get('week')) });
    assert.equal(game?.complete, false);
    assert.equal(game?.week, 4);
    assert.equal(game?.lineups.find(row => row.rosterId === '1')?.bench[0].points, 99.12);
    assert.equal((await readCategory('benched-player', { storePath, scope: 'regular' }))?.total, 0);
    assert.equal((await readCategory('benched-player', { storePath, scope: 'consolation' }))?.total, 0);
    assert.equal((await readCategory('benched-player', { storePath, scope: 'placement' }))?.total, 0);
    assert.equal((await readCategory('benched-player', { storePath, scope: 'combined' }))?.total, 1);
  });
});

test('unknown bench points block the derived claim, a recorded zero clears it, and later score loss retains the complete publication', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    const row = source.responses['league/900000000000002021/matchups/1'][0];
    delete row.players_points['901'];
    const imported = await publish(storePath, source);
    assert.deepEqual(imported.archive.coverage, [{ seasonId: '900000000000002021', area: 'player-points', detail: 'league/900000000000002021/matchups/1: missing bench points for roster 1, player 901', blocks: ['benched-player'] }]);
    const unknown = await readCategory('benched-player', { storePath });
    assert.equal(unknown?.blocked, true);
    assert.deepEqual(unknown?.rows, []);
    assert.deepEqual(unknown?.leaders, []);
    const collection = await readRecordCollection({ storePath });
    assert.deepEqual(collection?.flatMap(group => group.categories).find(category => category.key === 'benched-player')?.leaders, []);
    const game = await readMatchup('2021', '900000000000002021-w1-m1', { storePath });
    assert.equal(game?.lineups[0].bench[0].points, null);
    const unaffected = await readCategory('benched-player', { storePath, season: '2020' });
    assert.equal(unaffected?.blocked, false);
    assert.equal(unaffected?.total, 0);

    row.players_points['901'] = 0;
    await publish(storePath, source);
    const complete = await readCategory('benched-player', { storePath });
    assert.equal(complete?.blocked, false);
    assert.deepEqual(complete?.rows.map(row => [row.rank, row.value]), [[1, 50], [1, 50], [3, 0]]);
    assert.equal((await publish(storePath, source)).changed, false);
    row.players_points['901'] = 50.25;
    await publish(storePath, source);
    const corrected = await readCategory('benched-player', { storePath });
    assert.equal(corrected?.leaders[0].value, 50.25);
    delete row.players_points['901'];
    await assert.rejects(publish(storePath, source), /missing bench points for roster 1, player 901/);
    assert.deepEqual(await readCategory('benched-player', { storePath }), corrected);
    assert.equal((await readMatchup('2021', '900000000000002021-w1-m1', { storePath }))?.lineups[0].bench[0].points, 50.25);
  });
});
