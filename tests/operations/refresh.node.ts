import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { refresh } from '../../src/history/refresh.ts';
import { readSeasons, readSeason } from '../../src/history/read.ts';
import { readManager } from '../../src/history/managers.ts';
import { readFranchise } from '../../src/history/franchises.ts';
import { readHome, readCategory } from '../../src/history/records.ts';
import { readRivalry } from '../../src/history/rivalries.ts';
import { readContributors, readPlayerContributions } from '../../src/history/contributions.ts';
import { dropsSource } from '../fixtures/drops-source.ts';

const tim = 'person-608473907007143936';
const sebastian = 'person-740265931783245824';
const alec = 'person-473910025325113344';
async function fixture() { return dropsSource(JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'))); }
async function withHistory(run: (storePath: string) => Promise<void>) {
  const review = resolve('.impeccable/review');
  await mkdir(review, { recursive: true });
  const directory = await mkdtemp(join(review, 'refresh-acceptance-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
function publish(storePath: string, source: any) {
  return refresh({ storePath, leagueId: source.seedLeagueId, now: new Date('2026-11-03T12:00:00Z'), provider: {
    async get(path) {
      if (!(path in source.responses)) throw new Error(`Missing controlled response: ${path}`);
      return structuredClone(source.responses[path]);
    },
  } });
}

test('unpublished seasons remain unavailable rather than becoming known empty history', async () => {
  await withHistory(async storePath => {
    assert.equal(await readSeasons(storePath), null);
    await publish(storePath, await fixture());
    assert.deepEqual((await readSeasons(storePath))?.map(row => row.year), ['2021', '2020', '2019']);
  });
});

test('a composite visitor read keeps its published snapshot while another refresh publishes a correction', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    await publish(storePath, source);
    const { withHistorySnapshot } = await import('../../src/history/store.ts');
    const { readFranchiseSeason } = await import('../../src/history/franchises.ts');
    await withHistorySnapshot(async () => {
      assert.equal((await readSeason('2020', { storePath }))?.rows.find(row => row.personId === tim)?.points, 25.5);
      source.responses['league/900000000000002020/matchups/1'][0].custom_points = 23.5;
      await publish(storePath, source);
      const nextRequest = await withHistorySnapshot(() => readManager(tim, { storePath, season: '2020' }), storePath);
      assert.equal(nextRequest?.facts.points, 23.5, 'a new request sees the correction while the earlier request remains pinned');
      assert.equal((await readManager(tim, { storePath, season: '2020' }))?.facts.points, 25.5);
      const franchise = await readFranchiseSeason('franchise-7', '2020', { storePath });
      assert.equal(franchise?.facts.record, '1–0');
      assert.equal(franchise?.games[0].result, 'W');
    }, storePath);
    assert.equal((await readManager(tim, { storePath, season: '2020' }))?.facts.points, 23.5);
    assert.equal((await readFranchiseSeason('franchise-7', '2020', { storePath }))?.games[0].result, 'L');
  });
});

test('HTTP routes show unavailable history before the first refresh and preserve known zero and not-found states afterward', { timeout: 60_000 }, async () => {
  await withHistory(async storePath => {
    const { spawn } = await import('node:child_process');
    const server = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'dev', '--host', '127.0.0.1', '--port', '0', '--ignore-lock'], {
      env: { ...process.env, MUSEUM_STORE_PATH: storePath }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    server.stdout.on('data', chunk => { output += chunk.toString(); });
    server.stderr.on('data', chunk => { output += chunk.toString(); });
    try {
      const deadline = Date.now() + 30_000;
      let base = '';
      while (Date.now() < deadline) {
        base = /http:\/\/127\.0\.0\.1:\d+/.exec(output)?.[0] ?? '';
        if (base) break;
        if (server.exitCode !== null) assert.fail(output);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.ok(base, output);
      for (const route of ['/', '/seasons/', '/seasons/2021/', '/seasons/2021/?tab=players', '/seasons/2021/?tab=playoffs', '/seasons/2021/matchups/unknown/', '/records/', '/records/benched-player/', '/managers/', `/managers/${tim}/`, `/managers/${tim}/?tab=players`, `/managers/${tim}/seasons/2021/?tab=players&view=drops`, `/managers/${tim}/players/50/`, '/franchises/', '/franchises/franchise-7/', '/franchises/franchise-7/seasons/2021/?tab=players', '/franchises/franchise-7/players/50/', '/rivalries/']) {
        const response = await fetch(`${base}${route}`);
        const html = await response.text();
        assert.equal(response.status, 503, route);
        assert.match(html, /League history is unavailable\./, route);
        assert.match(html, /Skip to content/, 'unavailable content uses the shared museum shell');
        assert.doesNotMatch(html, /No seasons to browse|0 meetings|0 starts|not in the league|Last updated|importedAt|Coverage|Refresh failed/i, route);
      }
      await publish(storePath, await fixture());
      const zero = await fetch(`${base}/managers/person-800000000000000001/players/901/?season=2021`);
      assert.equal(zero.status, 200);
      assert.match((await zero.text()).replace(/<[^<>]*>/g, ' ').replace(/\s+/g, ' '), /starts 0/i);
      const noMeetings = await fetch(`${base}/rivalries/?a=person-472580465006473216&b=${sebastian}`);
      assert.equal(noMeetings.status, 200);
      assert.match(await noMeetings.text(), /No meetings in this selection\./);
      const notFound = await fetch(`${base}/seasons/1900/`);
      assert.equal(notFound.status, 404);
      assert.match(await notFound.text(), /Season not found/);
    } finally {
      server.kill('SIGTERM');
      if (server.exitCode === null) await new Promise<void>(resolve => server.once('exit', () => resolve()));
    }
  });
});

async function platform(storePath: string) {
  return {
    season: await readSeason('2020', { storePath }),
    manager: await readManager(tim, { storePath }),
    franchise: await readFranchise('franchise-7', { storePath }),
    rivalry: await readRivalry(tim, alec, { storePath, season: '2020' }),
    closest: await readCategory('closest-game', { storePath, season: '2020' }),
    dominance: await readCategory('dominant-season', { storePath, season: '2020' }),
    contributions: await readCategory('player-contributions', { storePath, limit: 100 }),
    pickups: await readCategory('productive-pickup', { storePath }),
    drops: await readCategory('productive-drop', { storePath }),
    players: await readContributors({ personId: tim }, { storePath, season: '2021' }),
    player: await readPlayerContributions({ personId: tim }, '50', { storePath }),
    franchisePlayer: await readPlayerContributions({ franchiseId: 'franchise-7' }, '50', { storePath }),
    bench: await readCategory('benched-player', { storePath }),
    home: await readHome({ storePath }),
  };
}

test('one persisted correction updates all affected public views while official overrides remain separate from recorded player credit', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    // Keep Tim's reacquisition until the week-7 trade; week 6 is then a full owned week.
    source.responses[`league/${source.seedLeagueId}/transactions/6`] = [];
    await publish(storePath, source);
    const before = await platform(storePath);
    assert.equal(before.manager?.facts.points, 165.5);
    assert.equal(before.manager?.facts.record, '1–7');
    assert.equal(before.franchise?.facts.points, 181);
    assert.equal(before.player?.points, 431.7);
    assert.equal(before.home?.features[3].leaders[0].value, 18.3);

    // Only the official team override changes: 25.5 -> 23.5 against 24.25.
    source.responses['league/900000000000002020/matchups/1'][0].custom_points = 23.5;
    await publish(storePath, source);
    const official = await platform(storePath);
    const standing = official.season!.rows.find(row => row.personId === tim)!;
    assert.deepEqual([standing.record, standing.points, standing.standing, standing.expectedWins, standing.winsVsExpected], ['0–1', 23.5, 2, 0, 0]);
    assert.equal(standing.scoringVsLeague, -1.5706806282722514); // -0.75 / 47.75 * 100
    assert.deepEqual([official.manager?.facts.record, official.manager?.facts.points], ['0–8', 163.5]);
    assert.deepEqual([official.franchise?.facts.record, official.franchise?.facts.points], ['1–8', 179]);
    assert.deepEqual([official.rivalry?.record, official.rivalry?.averageMargin], ['0–1', -0.75]);
    assert.equal(official.closest?.rows[0].value, 0.75);
    assert.equal(official.dominance?.rows.find(row => row.personId === tim)?.exactKey, '-300/191');
    assert.deepEqual(official.home?.features, before.home?.features, 'this override does not change these six feature leaders');
    assert.deepEqual(official.contributions, before.contributions);
    assert.deepEqual(official.pickups, before.pickups);
    assert.deepEqual(official.drops, before.drops);
    assert.deepEqual(official.player, before.player);

    // Recorded week-6 points also feed the reacquisition and Sebastian's earlier drop.
    const week6 = source.responses[`league/${source.seedLeagueId}/matchups/6`].find((row: any) => row.roster_id === 7);
    week6.players_points['50'] = 25.5;
    week6.starters_points[week6.starters.indexOf('50')] = 25.5;
    // Bench performance corrections feed the lineup, category and Home, without a start.
    source.responses[`league/${source.seedLeagueId}/matchups/6`].find((row: any) => row.roster_id === 1).players_points['901'] = 60.25;
    await publish(storePath, source);
    const corrected = await platform(storePath);
    assert.equal(corrected.player?.points, 443.8); // 100 + 7.1 + 11.2 + 300 + 25.5
    assert.equal(corrected.franchisePlayer?.points, 443.8);
    assert.equal(corrected.players?.rows.find(row => row.playerId === '50')?.points, 443.8);
    assert.equal(corrected.contributions?.rows.find(row => row.id === `50:${tim}`)?.value, 443.8);
    assert.equal(corrected.pickups?.leaders[0].value, 25.5);
    assert.equal(corrected.drops?.rows.find(row => row.personId === sebastian)?.value, 25.5);
    assert.equal(corrected.home?.features[3].leaders[0].value, 25.5);
    assert.equal(corrected.home?.features[1].leaders[0].value, 60.25);
    assert.equal(corrected.bench?.leaders[0].value, 60.25);
    const { readMatchup } = await import('../../src/history/read.ts');
    const timGame = await readMatchup('2021', `${source.seedLeagueId}-w6-m2`, { storePath });
    assert.equal(timGame?.lineups.find(row => row.personId === tim)?.starters.find(row => row.playerId === '50')?.points, 25.5);
    const benchGame = await readMatchup('2021', `${source.seedLeagueId}-w6-m1`, { storePath });
    assert.equal(benchGame?.lineups.find(row => row.rosterId === '1')?.bench.find(row => row.playerId === '901')?.points, 60.25);
    assert.deepEqual(corrected.manager, official.manager, 'recorded player corrections do not invent team overrides');
    assert.equal((await publish(storePath, source)).changed, false);
    assert.deepEqual(await platform(storePath), corrected);
    for (const missing of [`league/${source.seedLeagueId}/matchups/6`, `league/${source.seedLeagueId}/transactions/4`]) {
      const broken = structuredClone(source);
      delete broken.responses[missing];
      await assert.rejects(publish(storePath, broken), /Missing controlled response/);
      assert.deepEqual(await platform(storePath), corrected);
    }
    const missingBench = structuredClone(source);
    delete missingBench.responses[`league/${source.seedLeagueId}/matchups/6`].find((row: any) => row.roster_id === 1).players_points['901'];
    await assert.rejects(publish(storePath, missingBench), /Bench record coverage is incomplete/);
    assert.deepEqual(await platform(storePath), corrected);
  });
});

test('a newly completed current week publishes once across the museum without finalizing current awards or the title', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    const id = source.seedLeagueId;
    const league = source.responses[`league/${id}`];
    league.settings.playoff_week_start = 9;
    // Week 8 exists as unplayed zeros before its completion is established.
    const nextWeek = structuredClone(source.responses[`league/${id}/matchups/7`]);
    for (const row of nextWeek) {
      row.points = 0;
      for (const playerId of Object.keys(row.players_points)) row.players_points[playerId] = 0;
      row.starters_points = row.starters.map(() => 0);
    }
    source.responses[`league/${id}/matchups/8`] = nextWeek;
    await publish(storePath, source);
    const initial = await readSeason('2021', { storePath });
    assert.deepEqual(initial?.completedWeeks, [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual([initial?.rows.find(row => row.personId === tim)?.record, initial?.rows.find(row => row.personId === tim)?.points], ['0–7', 140]);
    assert.equal((await readCategory('lowest-score', { storePath, season: '2021' }))?.rows[0].value, 10, 'unplayed zero is not a low-score record');
    assert.equal((await readHome({ storePath }))?.features[5].leaders[0].value, 7);

    league.settings.last_scored_leg = 8;
    source.responses['state/nfl'].week = 9;
    for (const row of nextWeek) {
      row.points = ({ 1: 10, 2: 30, 7: 60, 10: 40 } as Record<number, number>)[row.roster_id];
      for (const playerId of Object.keys(row.players_points)) row.players_points[playerId] = ({ '101': 10, '102': 30, '107': 40, '110': 32, '60': 6, '50': 500, '901': 50 } as Record<string, number>)[playerId] ?? 0;
      row.starters_points = row.starters.map((playerId: string) => row.players_points[playerId] ?? 0);
    }
    await publish(storePath, source);
    async function currentViews() {
      const { readManagerSeason } = await import('../../src/history/managers.ts');
      const { readFranchiseSeason } = await import('../../src/history/franchises.ts');
      return {
        season: await readSeason('2021', { storePath }),
        manager: await readManager(tim, { storePath }),
        managerSeason: await readManagerSeason(tim, '2021', { storePath }),
        franchise: await readFranchiseSeason('franchise-7', '2021', { storePath }),
        rivalry: await readRivalry(tim, sebastian, { storePath, season: '2021' }),
        player: await readPlayerContributions({ personId: tim }, '107', { storePath }),
        receivingPlayer: await readPlayerContributions({ personId: sebastian }, '50', { storePath }),
        pickups: await readCategory('productive-pickup', { storePath }),
        drops: await readCategory('productive-drop', { storePath }),
        highScore: await readCategory('highest-score', { storePath, season: '2021' }),
        home: await readHome({ storePath }),
        awards: await Promise.all(['dominant-season', 'best-without-title', 'unluckiest-season'].map(key => readCategory(key, { storePath }))),
      };
    }
    const completed = await currentViews();
    const standing = completed.season!.rows.find(row => row.personId === tim)!;
    assert.deepEqual([standing.record, standing.points, standing.expectedWins, standing.winsVsExpected], ['1–7', 200, 10 / 3, -7 / 3]);
    assert.equal(standing.scoringVsLeague, -100 / 21); // 25 / 26.25 - 1, as a percent
    assert.deepEqual([completed.manager?.facts.record, completed.manager?.facts.points, completed.manager?.facts.championships], ['2–7', 225.5, 1]);
    assert.equal(completed.managerSeason?.games.length, 8);
    assert.equal(completed.managerSeason?.games[0].result, 'W');
    assert.equal(completed.franchise?.games.length, 8);
    assert.equal(completed.franchise?.facts.points, 200);
    assert.deepEqual([completed.rivalry?.record, completed.rivalry?.meetings, completed.rivalry?.averageMargin], ['1–7', 8, -15]);
    assert.deepEqual([completed.player?.points, completed.player?.starts, completed.player?.games.length], [134, 9, 8]);
    assert.equal(completed.receivingPlayer?.points, 1100);
    assert.equal(completed.pickups?.leaders[0].value, 500);
    assert.equal(completed.drops?.leaders[0].value, 900);
    assert.equal(completed.highScore?.leaders[0].value, 60);
    assert.equal(completed.home?.features[3].leaders[0].value, 500);
    assert.equal(completed.home?.features[4].leaders[0].value, 900);
    assert.equal(completed.home?.features[5].leaders[0].value, 8);
    assert.deepEqual(completed.home?.recent[0].period, { year: '2021', week: 8, playedAt: null });
    assert.equal(completed.season?.complete, false);
    assert.equal(completed.season?.champion, null);
    assert.equal(completed.season?.runnerUp, null);
    for (const award of completed.awards) {
      assert.ok(!award?.seasons.includes('2021'));
      assert.ok(award?.rows.every(row => !row.id.startsWith(id)));
    }
    assert.equal((await publish(storePath, source)).changed, false);
    assert.deepEqual(await currentViews(), completed, 'repeat refresh creates no extra game, start, spell, win or title');
    const broken = structuredClone(source);
    delete broken.responses[`league/${id}/matchups/8`];
    await assert.rejects(publish(storePath, broken), /Missing controlled response/);
    assert.deepEqual(await currentViews(), completed);
  });
});
