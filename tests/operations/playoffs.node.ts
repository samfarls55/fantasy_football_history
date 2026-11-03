import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { readSeason, readSeasons, readSeasonBracket } from '../../src/history/read.ts';

async function fixture(name = 'provider-history') {
  return JSON.parse(await readFile(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));
}
async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-playoffs-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('season history awards only the resolved main title and counts qualifying people once including byes', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    // Pre-seeded current standings before the playoffs are not appearances.
    const provisional = source.responses['league/900000000000002021/winners_bracket'];
    provisional[0].t1 = 1; provisional[0].t2 = 3;
    provisional[1].t1 = 7; provisional[1].t2 = 10;
    await publish(storePath, source);
    const seasons = await readSeasons(storePath);
    assert.ok(seasons);
    const old = seasons.find(season => season.year === '2019')!;
    assert.equal(old.championId, 'person-473910025325113344');
    assert.equal(old.runnerUpId, 'person-800000000000000001');
    assert.equal(old.playoffPersonIds.length, 6);
    assert.equal(new Set(old.playoffPersonIds).size, 6);
    assert.ok(old.playoffPersonIds.includes('person-800000000000000001')); // direct semifinal entrant
    assert.equal((await readSeason('2020', { storePath }))?.championId, 'person-608473907007143936');
    assert.equal(seasons[0].championId, null);
    assert.equal(seasons[0].runnerUpId, null);
    assert.deepEqual(seasons[0].playoffPersonIds, []);
  });
});

test('contradictory main title scores retain history while an official tied-title decision preserves the scored tie', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    await publish(storePath, source);
    const before = await readSeason('2020', { storePath, scope: 'playoffs' });
    const title = source.responses['league/900000000000002020/winners_bracket'][0];
    title.w = 10; title.l = 7;
    await assert.rejects(publish(storePath, source), /title advancement contradicts official score/);
    assert.deepEqual(await readSeason('2020', { storePath, scope: 'playoffs' }), before);
    const rows = source.responses['league/900000000000002020/matchups/2'];
    for (const row of rows) row.custom_points = 50;
    await publish(storePath, source);
    const tied = await readSeason('2020', { storePath, scope: 'playoffs' });
    assert.equal(tied?.championId, 'person-473910025325113344');
    assert.equal(tied?.runnerUpId, 'person-608473907007143936');
    assert.equal(tied?.rows.find(row => row.rosterId === '10')?.record, '0–0–1');
  });
});

test('bracket history retains multiweek aggregates, alternate paths and unresolved finals through correction and repeat refresh', async () => {
  await withHistory(async storePath => {
    const source = await fixture('playoff-type-1');
    const partial = structuredClone(source);
    partial.responses[`league/${source.seedLeagueId}`].status = 'in_season';
    partial.responses[`league/${source.seedLeagueId}`].settings.last_scored_leg = 4;
    partial.responses['state/nfl'].week = 5;
    for (const row of partial.responses[`league/${source.seedLeagueId}/winners_bracket`].filter((row: any) => row.r === 3)) row.w = row.l = null;
    await publish(storePath, partial);
    const pending = await readSeasonBracket('2025', { storePath });
    const final = pending!.rounds.at(-1)!.games[0];
    assert.equal(final.complete, false);
    assert.deepEqual(final.sides.map(side => side?.points), [null, null]);
    assert.equal(final.href, `/seasons/2025/matchups/${source.seedLeagueId}-winners-m16/?scope=playoffs&week=4`);
    assert.equal((await readSeason('2025', { storePath }))?.championId, null);
    assert.equal((await readSeason('2025', { storePath }))?.playoffPersonIds.length, 6);
    const lower = await readSeasonBracket('2025', { storePath, scope: 'consolation' });
    const lowerFinal = lower!.rounds.at(-1)!.games.find(game => game.placement === 1)!;
    assert.deepEqual(lowerFinal.weeks, [3, 4]);
    assert.equal(lowerFinal.advancingRosterId, '7');
    assert.equal(lowerFinal.winnerId, 'person-950000000000000008');
    await publish(storePath, source);
    const completed = (await readSeasonBracket('2025', { storePath }))!.rounds.at(-1)!.games[0];
    assert.deepEqual(completed.sides.map(side => side?.points), [30.3, 35.3]);
    assert.equal((await readSeason('2025', { storePath }))?.championId, 'person-950000000000000005');
    assert.equal((await publish(storePath, source)).changed, false);
    source.responses[`league/${source.seedLeagueId}/matchups/5`].find((row: any) => row.roster_id === 5).custom_points = 0;
    const title = source.responses[`league/${source.seedLeagueId}/winners_bracket`].find((row: any) => row.p === 1);
    title.w = 1; title.l = 5;
    await publish(storePath, source);
    assert.equal((await readSeasons(storePath))?.[0].championId, 'person-950000000000000001');
    assert.equal((await readSeason('2025', { storePath, scope: 'playoffs' }))?.rows.find(row => row.rosterId === '1')?.record, '2–0');
  });
});

test('completed regular season qualification includes a bye before its first game and hides unresolved advancement participants', async () => {
  await withHistory(async storePath => {
    const source = await fixture('playoff-type-2');
    const league = source.responses[`league/${source.seedLeagueId}`];
    league.status = 'in_season'; league.settings.last_scored_leg = 1;
    source.responses['state/nfl'].week = 2;
    for (const family of ['winners', 'losers']) for (const row of source.responses[`league/${source.seedLeagueId}/${family}_bracket`]) row.w = row.l = null;
    await publish(storePath, source);
    const season = await readSeason('2025', { storePath, scope: 'playoffs' });
    assert.equal(season?.playoffPersonIds.length, 6);
    assert.ok(season?.playoffPersonIds.includes('person-950000000000000001'));
    assert.equal(season?.rows.find(row => row.rosterId === '1')?.record, '0–0');
    const bracket = await readSeasonBracket('2025', { storePath });
    assert.equal(bracket?.byes.length, 2);
    assert.deepEqual(bracket?.rounds.at(-1)?.games[0].sides, [null, null]);
    assert.equal(bracket?.rounds[0].games[0].sides[0]?.personName, 'Format Manager 3');
    assert.equal(bracket?.rounds[0].games[0].href, null);
    assert.equal(season?.championId, null);
    await publish(storePath, await fixture('playoff-type-2'));
    const completed = await readSeasonBracket('2025', { storePath });
    assert.deepEqual(completed?.rounds.at(-1)?.games[0].weeks, [6, 7]);
    assert.deepEqual(completed?.rounds.at(-1)?.games[0].sides.map(side => side?.points), [30.3, 35.3]);
    assert.equal((await readSeasons(storePath))?.[0].championId, 'person-950000000000000005');
  });
});
