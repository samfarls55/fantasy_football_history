import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { refresh } from '../../src/history/refresh.ts';
import * as history from '../../src/history/read.ts';

const fixture = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
async function imported(run: (storePath: string, responses: Record<string, any>) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-matchups-'));
  const responses = structuredClone(fixture.responses);
  const storePath = join(directory, 'history.json');
  try { await run(storePath, responses); } finally { await rm(directory, { recursive: true, force: true }); }
}
function publish(storePath: string, responses: Record<string, any>, leagueId = fixture.seedLeagueId) {
  return refresh({ storePath, leagueId, now: new Date(fixture.now), provider: {
    async get(path) {
      if (!(path in responses)) throw new Error(`Missing controlled response: ${path}`);
      return structuredClone(responses[path]);
    },
  } });
}

test('official matchup and lineup history preserve overrides, recorded starters, bench and unknown points', async () => {
  await imported(async (storePath, responses) => {
    const tim = responses['league/900000000000002020/matchups/1'][0];
    tim.players.push('90'); // Rostered bench player with no recorded points.
    const imported = await publish(storePath, responses);
    assert.deepEqual(imported.archive.coverage.map(issue => issue.blocks), [['benched-player']]);
    const selected = await history.readSeasonMatchups('2020', { storePath, week: 1 });
    assert.equal(selected?.games.length, 1);
    const game = await history.readMatchup('2020', selected!.games[0].id, { storePath });
    assert.equal(game?.sides[0].points, 25.5);
    assert.equal(game?.winnerId, 'person-608473907007143936');
    assert.deepEqual(game?.lineups[0].starters.map(player => [player.name, player.slot, player.points]), [['Synthetic Player 107', 'QB', 20]]);
    assert.deepEqual(game?.lineups[0].bench.map(player => [player.name, player.slot, player.points]), [['Synthetic Player 90', null, null]]);
    assert.equal((await history.readSeasonMatchups('2019', { storePath, week: 1 }))?.games.find(game => game.sides.some(side => side.rosterId === '3'))?.sides.find(side => side.rosterId === '3')?.points, 0);
    assert.equal((await history.readSeasonMatchups('2021', { storePath }))?.week, 3);
    assert.equal(await history.readMatchup('2020', 'unknown', { storePath }), null);
  });
});

test('one shared game scope follows the title ancestry, preserves placement and ignores score-shaped byes', async () => {
  await imported(async (storePath, responses) => {
    await publish(storePath, responses);
    const playoffs = await history.readSeasonMatchups('2019', { storePath, scope: 'playoffs', week: 4 });
    assert.equal(playoffs?.games.length, 1);
    const final = playoffs!.games[0];
    assert.equal(final.championship, true);
    assert.equal(final.sides.find(side => side.rosterId === '10')?.points, 40.5);
    assert.notEqual(final.id, '900000000000002019-w4-m1'); // bracket m:6 differs from weekly m:1
    assert.equal((await history.readSeasonMatchups('2019', { storePath, scope: 'placement', week: 4 }))?.games.length, 1);
    assert.equal((await history.readSeasonMatchups('2019', { storePath, scope: 'combined', week: 3 }))?.games.length, 2);
    const first = await history.readSeasonMatchups('2019', { storePath, scope: 'playoffs', week: 2 });
    assert.equal(first?.games.length, 2);
    assert.equal(first?.games.some(game => game.sides.some(side => ['1', '2'].includes(side.rosterId))), false);
    assert.equal((await history.readSeasonMatchups('2019', { storePath, scope: 'regular', week: 4 }))?.games.length, 0);
  });
});

test('native type 1 extends each bracket terminal round, including third place, and counts a resolved contest once', async () => {
  await imported(async (storePath) => {
    const native = JSON.parse(await readFile(new URL('../fixtures/playoff-type-1.json', import.meta.url), 'utf8'));
    await publish(storePath, native.responses, native.seedLeagueId);
    const final = (await history.readSeasonMatchups('2025', { storePath, scope: 'playoffs', week: 5 }))!.games[0];
    assert.deepEqual(final.weeks, [4, 5]);
    assert.equal(final.complete, true);
    assert.equal(final.sides.find(side => side.rosterId === '1')?.points, 30.3);
    assert.equal(final.sides.find(side => side.rosterId === '5')?.points, 35.3);
    const detail = await history.readMatchup('2025', final.id, { storePath, week: 4 });
    assert.deepEqual(detail?.completedWeeks, [4, 5]);
    assert.equal(detail?.lineups.find(side => side.rosterId === '1')?.starters[0].points, 10.1);
    const third = (await history.readSeasonMatchups('2025', { storePath, scope: 'placement', week: 5 }))!.games[0];
    assert.deepEqual(third.weeks, [4, 5]);
    const lower = (await history.readSeasonMatchups('2025', { storePath, scope: 'consolation', week: 4 }))!.games.find(game => game.sides.some(side => side.rosterId === '7'))!;
    assert.deepEqual(lower.weeks, [3, 4]);
    assert.equal(lower.championship, false);
    assert.equal(lower.winnerId, 'person-950000000000000008'); // scored win; raw w advances the low-scoring roster 7
    assert.equal((await history.readSeasonMatchups('2025', { storePath, scope: 'consolation', week: 5 }))?.games.length, 0);
    const repeated = await publish(storePath, native.responses, native.seedLeagueId);
    assert.equal(repeated.changed, false);
    const corrected = structuredClone(native.responses);
    corrected[`league/${native.seedLeagueId}/matchups/5`].find((row: any) => row.roster_id === 5).custom_points = 0;
    const title = corrected[`league/${native.seedLeagueId}/winners_bracket`].find((row: any) => row.p === 1);
    title.w = 1; title.l = 5;
    await publish(storePath, corrected, native.seedLeagueId);
    const updated = (await history.readSeasonMatchups('2025', { storePath, scope: 'playoffs', week: 5 }))!.games[0];
    assert.deepEqual(updated.sides.map(side => side.points), [30.3, 20.2]);
    assert.equal((await history.readMatchup('2025', updated.id, { storePath, week: 5 }))?.lineups.find(side => side.rosterId === '5')?.starters[0].points, 15.1);
    assert.equal((await history.readSeason('2025', { storePath, scope: 'playoffs' }))?.rows.find(row => row.rosterId === '1')?.record, '2–0');
  });
});

test('a completed first leg of an unfinished native type 1 final keeps points and starts without a win or title', async () => {
  await imported(async (storePath) => {
    const native = JSON.parse(await readFile(new URL('../fixtures/playoff-type-1.json', import.meta.url), 'utf8'));
    const league = native.responses[`league/${native.seedLeagueId}`];
    league.status = 'in_season';
    league.settings.last_scored_leg = 4;
    native.responses['state/nfl'].week = 5;
    for (const row of native.responses[`league/${native.seedLeagueId}/winners_bracket`].filter((row: any) => row.r === 3)) row.w = row.l = null;
    await publish(storePath, native.responses, native.seedLeagueId);
    const games = await history.readSeasonMatchups('2025', { storePath, scope: 'playoffs', week: 4 });
    assert.equal(games?.games.length, 1);
    const final = games!.games[0];
    assert.equal(final.complete, false);
    assert.equal(final.winnerId, null);
    const detail = await history.readMatchup('2025', final.id, { storePath });
    assert.deepEqual(detail?.completedWeeks, [4]);
    assert.equal(detail?.lineups.find(side => side.rosterId === '1')?.starters[0].points, 10.1);
    const rows = (await history.readSeason('2025', { storePath, scope: 'playoffs' }))!.rows;
    assert.equal(rows.find(row => row.rosterId === '1')?.record, '1–0');
    assert.equal(rows.find(row => row.rosterId === '1')?.points, 60.1);
    assert.equal(rows.find(row => row.rosterId === '1')?.wins, 1);
    assert.equal((await history.readSeason('2025', { storePath }))?.championId, null);
  });
});

test('native type 2 retains a partial first round and resolves all two-week rounds once after refresh', async () => {
  await imported(async (storePath) => {
    const native = JSON.parse(await readFile(new URL('../fixtures/playoff-type-2.json', import.meta.url), 'utf8'));
    const partial = structuredClone(native.responses);
    partial[`league/${native.seedLeagueId}`].status = 'in_season';
    partial[`league/${native.seedLeagueId}`].settings.last_scored_leg = 2;
    partial['state/nfl'].week = 3;
    for (const family of ['winners', 'losers']) for (const row of partial[`league/${native.seedLeagueId}/${family}_bracket`]) row.w = row.l = null;
    await publish(storePath, partial, native.seedLeagueId);
    const first = (await history.readSeasonMatchups('2025', { storePath, scope: 'playoffs', week: 2 }))!.games;
    assert.equal(first.length, 2);
    assert.deepEqual(first[0].weeks, [2, 3]);
    assert.equal(first[0].complete, false);
    const partialRows = (await history.readSeason('2025', { storePath, scope: 'playoffs' }))!.rows;
    assert.equal(partialRows.find(row => row.rosterId === '3')?.record, '0–0');
    assert.equal(partialRows.find(row => row.rosterId === '3')?.points, 30);
    assert.equal((await history.readMatchup('2025', first[0].id, { storePath }))?.lineups.find(side => side.rosterId === '3')?.starters[0].points, 30);
    await publish(storePath, native.responses, native.seedLeagueId);
    const final = (await history.readSeasonMatchups('2025', { storePath, scope: 'playoffs', week: 7 }))!.games[0];
    assert.deepEqual(final.weeks, [6, 7]);
    assert.deepEqual(final.sides.map(side => side.points), [30.3, 35.3]);
    assert.equal(final.complete, true);
    const rows = (await history.readSeason('2025', { storePath, scope: 'playoffs' }))!.rows;
    assert.equal(rows.find(row => row.rosterId === '1')?.record, '1–1');
    assert.equal(rows.find(row => row.rosterId === '5')?.record, '3–0');
  });
});

test('unknown formats, historical ambiguous enums and missing required legs or starter points retain the public snapshot', async () => {
  await imported(async (storePath, responses) => {
    await publish(storePath, responses);
    const before = await history.readSeasonMatchups('2020', { storePath, scope: 'playoffs', week: 2 });
    const variants = [
      [fixture.variants.multiweekFinal.responseOverrides, /unsupported playoff_round_type 99/],
      [{ 'league/900000000000002020': { ...responses['league/900000000000002020'], settings: { ...responses['league/900000000000002020'].settings, playoff_round_type: 1 } } }, /unverified historical playoff_round_type/],
      [fixture.variants.missingStarterScore.responseOverrides, /missing starter points/],
    ] as const;
    for (const [overrides, message] of variants) {
      await assert.rejects(publish(storePath, { ...structuredClone(responses), ...structuredClone(overrides) }), message);
      assert.deepEqual(await history.readSeasonMatchups('2020', { storePath, scope: 'playoffs', week: 2 }), before);
    }
    const missing = structuredClone(responses);
    for (const row of missing['league/900000000000002020/matchups/2']) row.matchup_id = null;
    await assert.rejects(publish(storePath, missing), /missing paired bracket leg/);
    assert.deepEqual(await history.readSeasonMatchups('2020', { storePath, scope: 'playoffs', week: 2 }), before);
  });
});

test('empty lineup slots never become players or starts and an absent historical format needs observed complete pairings', async () => {
  await imported(async (storePath, responses) => {
    const league = responses['league/900000000000002019'];
    delete league.settings.playoff_round_type;
    const row = responses['league/900000000000002020/matchups/1'][0];
    responses['league/900000000000002020'].roster_positions = ['QB', 'FLEX', 'BN'];
    row.starters = [null, '107', '0'];
    row.starters_points = [0, 20, 0];
    row.players.push('0');
    await publish(storePath, responses);
    const game = (await history.readSeasonMatchups('2020', { storePath, week: 1 }))!.games[0];
    const detail = await history.readMatchup('2020', game.id, { storePath });
    assert.deepEqual(detail?.lineups[0].starters.map(player => [player.playerId, player.slot, player.points]), [['107', 'FLEX', 20]]);
    assert.equal(detail?.lineups[0].bench.some(player => player.playerId === '0'), false);
    assert.equal((await history.readSeasonMatchups('2019', { storePath, scope: 'playoffs', week: 4 }))?.games.length, 1);
  });
});

test('unsupported main-bracket ancestry and missing historical pairing evidence cannot publish invented scopes', async () => {
  await imported(async (storePath, responses) => {
    await publish(storePath, responses);
    const before = await history.readSeasonMatchups('2019', { storePath, scope: 'playoffs', week: 3 });
    const disconnected = structuredClone(responses);
    delete disconnected['league/900000000000002019/winners_bracket'].find((row: any) => row.p === 1).t1_from;
    await assert.rejects(publish(storePath, disconnected), /unclassified main-bracket contest/);
    assert.deepEqual(await history.readSeasonMatchups('2019', { storePath, scope: 'playoffs', week: 3 }), before);
    const unobserved = structuredClone(responses);
    delete unobserved['league/900000000000002020'].settings.playoff_round_type;
    for (const row of unobserved['league/900000000000002020/winners_bracket']) row.t1 = row.t2 = row.w = row.l = null;
    for (const row of unobserved['league/900000000000002020/matchups/2']) row.matchup_id = null;
    await assert.rejects(publish(storePath, unobserved), /missing playoff_round_type.*pairing evidence/);
  });
});
