import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { refresh } from '../../src/history/refresh.ts';
import { readHome, readCategory } from '../../src/history/records.ts';
import { dropsSource } from '../fixtures/drops-source.ts';
import { recordsSource } from '../fixtures/records-source.ts';

async function withHistory(run: (storePath: string, source: any) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-home-'));
  const source = dropsSource(JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8')));
  try { await run(join(directory, 'history.json'), source); } finally { await rm(directory, { recursive: true, force: true }); }
}
function publish(storePath: string, source: any, now = '2026-11-03T12:00:00Z') {
  return refresh({ storePath, leagueId: source.seedLeagueId, now: new Date(now), provider: {
    async get(path) {
      if (!(path in source.responses)) throw new Error(`Missing controlled response: ${path}`);
      return structuredClone(source.responses[path]);
    },
  } });
}

test('published Home presents the six real categories with their shared leaders and actual historical destinations', async () => {
  await withHistory(async (storePath, source) => {
    assert.equal(await readHome({ storePath }), null, 'unpublished history has no fabricated leaders');
    await publish(storePath, source);
    const home = (await readHome({ storePath }))!;
    assert.deepEqual(home.features.map(row => row.category.key), ['best-without-title', 'benched-player', 'unluckiest-season', 'productive-pickup', 'productive-drop', 'winning-streak']);
    const best = home.features[0];
    assert.equal(best.leaders[0].name, 'Woody14');
    assert.equal(best.leaders[0].value, 73.83177570093459);
    assert.deepEqual(best.leaders[0].period, { year: '2019', week: 4, playedAt: null });
    const pickup = home.features[3].leaders[0];
    assert.equal(pickup.name, 'Synthetic Player 50');
    assert.equal(pickup.owner.name, 'Timh17');
    assert.equal(pickup.value, 18.3);
    assert.match(pickup.href, /pickup=/);
    const drop = home.features[4].leaders[0];
    assert.equal(drop.value, 400);
    assert.match(drop.href, /view=drops&event=/);
    for (const feature of home.features) {
      const category = (await readCategory(feature.category.key, { storePath }))!;
      assert.deepEqual(feature.leaders.map(row => [row.id, row.rank, row.exactKey]), category.leaders.map(row => [row.id, row.rank, row.exactKey]));
      assert.match(feature.href, new RegExp(`/records/${feature.category.key}/`));
    }
    assert.ok(home.recent.length, 'supported year/week events remain recent when every playedAt is null');
    assert.deepEqual(home.recent[0].period, { year: '2021', week: 7, playedAt: null });
    assert.ok(home.recent.every(row => row.rank <= 10));
    assert.equal(new Set(home.recent.map(row => `${row.category.key}/${row.id}`)).size, home.recent.length);
    assert.ok(home.recent.every(row => new URL(row.categoryHref, 'http://museum.test').searchParams.get('result') === row.id));
    await publish(storePath, source, '2030-05-01T12:00:00Z');
    assert.deepEqual((await readHome({ storePath }))!.recent, home.recent, 'an import never becomes a historical event');
  });
});

test('Home uses source-backed current owner artwork without assigning a team portrait to a benched NFL player', async () => {
  await withHistory(async (storePath, source) => {
    const users = source.responses[`league/${source.seedLeagueId}/users`];
    users[0].avatar = 'account-avatar';
    users[0].metadata.avatar = 'https://sleepercdn.com/uploads/50ad7a3e74ca1dd81d358601df4c9b9f.jpg';
    users[1].avatar = 'other-account-avatar';
    users[1].metadata.avatar = 'https://sleepercdn.com/uploads/3cb1a2249156178e5a7d372b7e34b83f.jpg';
    await publish(storePath, source);
    const bench = (await readHome({ storePath }))!.features[1].leaders[0];
    assert.equal(bench.name, 'Synthetic Player 901');
    assert.equal(bench.avatar, null);
    assert.equal(bench.owner.name, 'Manager 1');
    assert.equal(bench.owner.avatar, '/assets/plates/bench-portrait.png');
    assert.ok((await readHome({ storePath }))!.features[0].leaders.every(row => row.owner.name !== 'The Monkey Buccaneers'), 'current artwork never invents a historical team name');
    users[0].metadata.avatar = 'https://sleepercdn.com/uploads/another-current-image.jpg';
    await publish(storePath, source);
    assert.equal((await readHome({ storePath }))!.features[1].leaders[0].owner.avatar, 'https://sleepercdn.com/uploads/another-current-image.jpg');
    users[0].metadata.avatar = null;
    await publish(storePath, source);
    assert.equal((await readHome({ storePath }))!.features[1].leaders[0].owner.avatar, 'https://sleepercdn.com/avatars/account-avatar');
  });
});

test('Home retains cutoff ties, excludes a newer outside result, and publishes corrections through provider outages', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[50, 40], [60, 45], [55, 50]]);
    const league = source.responses[`league/${source.seedLeagueId}`] as any;
    const state = source.responses['state/nfl'] as any;
    const players = source.responses['players/nfl'] as Record<string, unknown>;
    function bench(week: number, roster: number, playerId: string, name: string, points: number) {
      const row = (source.responses[`league/${source.seedLeagueId}/matchups/${week}`] as any[])[roster - 1];
      row.players.push(playerId);
      row.players_points[playerId] = points;
      players[playerId] = { full_name: name };
      return row;
    }
    // Nine older performances beat 90. Two 90s therefore share tenth place;
    // the later 89 is twelfth, regardless of how recently it was played.
    for (let index = 0; index < 9; index++) bench(1, 1, `710${index}`, `Earlier bench ${index + 1}`, 100 - index);
    bench(2, 1, '7201', 'Cutoff player A', 90);
    bench(2, 2, '7202', 'Cutoff player B', 90);
    const newest = bench(3, 1, '7301', 'Newer outside player', 89);
    league.settings.last_scored_leg = 2;
    state.week = 3;
    await publish(storePath, source);
    const initial = (await readHome({ storePath }))!;
    assert.equal(initial.recent.length, 6);
    assert.deepEqual(initial.recent.slice(0, 2).map(row => [row.category.key, row.name, row.rank, row.value, row.period]), [
      ['benched-player', 'Cutoff player A', 10, 90, { year: '2021', week: 2, playedAt: null }],
      ['benched-player', 'Cutoff player B', 10, 90, { year: '2021', week: 2, playedAt: null }],
    ]);

    league.settings.last_scored_leg = 3;
    state.week = 4;
    await publish(storePath, source);
    const ranking = (await readCategory('benched-player', { storePath, limit: 20 }))!;
    assert.deepEqual(ranking.rows.map(row => [row.value, row.rank]), [
      [100, 1], [99, 2], [98, 3], [97, 4], [96, 5], [95, 6], [94, 7], [93, 8], [92, 9], [90, 10], [90, 10], [89, 12],
    ]);
    const outside = ranking.rows.find(row => row.name === 'Newer outside player')!;
    assert.deepEqual(outside.period, { year: '2021', week: 3, playedAt: null });
    assert.equal((await readHome({ storePath }))!.recent.some(row => row.category.key === 'benched-player' && row.id === outside.id), false);

    newest.players_points['7301'] = 110;
    await publish(storePath, source, '2030-05-01T12:00:00Z');
    const corrected = (await readHome({ storePath }))!;
    assert.deepEqual(corrected.features[1].leaders.map(row => [row.name, row.value]), [['Newer outside player', 110]]);
    assert.deepEqual([corrected.recent[0].category.key, corrected.recent[0].id, corrected.recent[0].value, corrected.recent[0].rank, corrected.recent[0].period],
      ['benched-player', outside.id, 110, 1, { year: '2021', week: 3, playedAt: null }]);
    assert.equal(new URL(corrected.recent[0].categoryHref, 'http://museum.test').searchParams.get('result'), outside.id);

    delete source.responses[`league/${source.seedLeagueId}/matchups/3`];
    await assert.rejects(publish(storePath, source, '2031-05-01T12:00:00Z'), /Missing controlled response: league\/.+\/matchups\/3/);
    assert.deepEqual(await readHome({ storePath }), corrected, 'the failed provider refresh preserves the corrected public Home');
  });
});
