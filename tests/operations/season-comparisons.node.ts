import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { refresh } from '../../src/history/refresh.ts';
import { readSeason } from '../../src/history/read.ts';
import { readCategory } from '../../src/history/records.ts';
import { recordsSource } from '../fixtures/records-source.ts';

async function withHistory(run: (storePath: string, source: any) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-season-comparisons-'));
  const source = JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
  try { await run(join(directory, 'history.json'), source); } finally { await rm(directory, { recursive: true, force: true }); }
}
function publish(storePath: string, source: any) {
  return refresh({ storePath, leagueId: source.seedLeagueId, now: new Date('2026-11-03T12:00:00Z'), provider: {
    async get(path) {
      if (!(path in source.responses)) throw new Error(`Missing controlled response: ${path}`);
      return structuredClone(source.responses[path]);
    },
  } });
}

test('published current-season standings compare the same completed official scores and exact weekly expectation', async () => {
  await withHistory(async (storePath, source) => {
    await publish(storePath, source);
    const season = await readSeason('2021', { storePath });
    const tim = season!.rows.find(row => row.personName === 'Timh17')!;
    assert.equal(tim.scoringVsLeague, -20);
    assert.equal(tim.expectedWins, 1);
    assert.equal(tim.expectedWinsExactKey, '1/1');
    assert.equal(tim.winsVsExpected, -1);
    const manager2 = season!.rows.find(row => row.personName === 'Manager 2')!;
    assert.equal(manager2.expectedWins, 2);
    assert.equal(manager2.winsVsExpected, 1);
    const tied = (await readSeason('2019', { storePath }))!.rows.find(row => row.personName === 'Manager 1')!;
    assert.equal(tied.expectedWins, 0.7);
    assert.equal(tied.winsVsExpected, -0.2); // The actual tie contributes exactly half a win.
  });
});

test('published dominance uses one season league baseline when teams have different played weeks', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[10, 0, 0, 0], [0, 100, 100, 0]]);
    (source.responses[`league/${source.seedLeagueId}`] as any).status = 'complete';
    const first = source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[];
    const second = source.responses[`league/${source.seedLeagueId}/matchups/2`] as any[];
    first[2].matchup_id = first[3].matchup_id = null;
    second[0].matchup_id = second[3].matchup_id = null;
    second[1].matchup_id = second[2].matchup_id = 1;
    await publish(storePath, source);
    // Four played team-weeks total 210 points: league PPG is 52.5 in both weeks.
    // Manager 01's 10 PPG is 100 × (10 / 52.5 - 1) = -1700/21 percent.
    const season = (await readSeason('2021', { storePath }))!;
    assert.equal(season.rows.find(row => row.personName === 'Record manager 01')!.scoringVsLeague, -80.95238095238095);
    const awards = (await readCategory('dominant-season', { storePath }))!;
    assert.equal(awards.rows.find(row => row.name === 'Record manager 01')!.exactKey, '-1700/21');
    assert.equal(season.rows.find(row => row.personName === 'Record manager 04')!.scoringVsLeague, null);
  });
});

test('published season awards share exact dominance ties, opposite schedule signs and only resolved completed eligibility', async () => {
  await withHistory(async (storePath, source) => {
    await publish(storePath, source);
    const dominant = await readCategory('dominant-season', { storePath });
    assert.ok(dominant);
    assert.deepEqual(dominant.seasons, ['2020', '2019']);
    assert.equal(dominant.leaders[0].name, 'Woody14');
    assert.equal(dominant.leaders[0].exactKey, '7900/107');
    assert.deepEqual(dominant.rows.filter(row => row.exactKey === '1600/107').map(row => row.rank), [2, 2]);
    assert.deepEqual(dominant.leaders[0].period, { year: '2019', week: 4, playedAt: null });
    assert.match(dominant.leaders[0].href, /\/managers\/person-.*\/seasons\/2019\/\?scope=regular/);
    const withoutTitle = await readCategory('best-without-title', { storePath });
    assert.equal(withoutTitle!.rows.some(row => row.name === 'alecswartout' && row.period!.year === '2019'), false);
    assert.equal(withoutTitle!.rows.some(row => row.name === 'Timh17' && row.period!.year === '2020'), false);
    const unlucky = await readCategory('unluckiest-season', { storePath, season: '2019' });
    assert.equal(unlucky!.leaders[0].value, 0.4);
    const season = await readSeason('2019', { storePath });
    assert.equal(season!.rows.find(row => row.personName === 'alecswartout')!.winsVsExpected, -0.4);
  });
});

test('nine published weekly ninths total exactly one expected win and an unresolved title awards no nonchampion', async () => {
  await withHistory(async storePath => {
    // Manager 1 loses to 10 and out-scores only the team scoring 1 in each of nine weeks.
    const source = recordsSource(Array.from({ length: 9 }, () => [2, 10, 1, 3, 4, 5, 6, 7, 8, 9]));
    (source.responses[`league/${source.seedLeagueId}`] as any).status = 'complete';
    await publish(storePath, source);
    const row = (await readSeason('2021', { storePath }))!.rows.find(row => row.personName === 'Record manager 01')!;
    assert.equal(row.expectedWins, 1);
    assert.equal(row.expectedWinsExactKey, '1/1');
    assert.equal(row.winsVsExpected, -1);
    const unlucky = await readCategory('unluckiest-season', { storePath });
    assert.equal(unlucky!.rows.find(row => row.name === 'Record manager 01')!.exactKey, '1/1');
    assert.equal((await readCategory('dominant-season', { storePath }))!.leaders[0].exactKey, '900/11');
    assert.equal((await readCategory('best-without-title', { storePath }))!.rows.length, 0);
  });
});

test('incomplete completed-season coverage rejects the correction and keeps published comparisons readable', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[20, 40, 10, 30], [20, 40, 10, 30]]);
    const league = source.responses[`league/${source.seedLeagueId}`] as any;
    league.status = 'complete';
    await publish(storePath, source);
    assert.equal((await readCategory('dominant-season', { storePath }))!.leaders[0].value, 60);
    league.settings.last_scored_leg = 1;
    await assert.rejects(publish(storePath, source), /completed season.*regular.*coverage/i);
    assert.equal((await readSeason('2021', { storePath }))!.rows.find(row => row.personName === 'Record manager 02')!.points, 80);
    assert.equal((await readCategory('dominant-season', { storePath }))!.leaders[0].value, 60);
  });
});

test('published dominance ties across scoring eras and season lengths instead of ranking raw totals', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[20, 40, 10, 30], [20, 40, 10, 30]]);
    const league = source.responses[`league/${source.seedLeagueId}`] as any;
    league.status = 'complete';
    const older = recordsSource([[2, 4, 1, 3]]);
    const olderId = '900000000000002020';
    league.previous_league_id = olderId;
    for (const [path, response] of Object.entries(older.responses)) {
      if (path.startsWith('league/')) source.responses[path.replace(older.seedLeagueId, olderId)] = structuredClone(response);
    }
    const olderLeague = source.responses[`league/${olderId}`] as any;
    olderLeague.league_id = olderId;
    olderLeague.season = '2020';
    olderLeague.status = 'complete';
    olderLeague.scoring_settings.pass_td = 6;
    await publish(storePath, source);
    const dominant = await readCategory('dominant-season', { storePath });
    assert.deepEqual(dominant!.leaders.map(row => [row.value, row.exactKey, row.rank]), [[60, '60/1', 1], [60, '60/1', 1]]);
    assert.deepEqual(dominant!.leaders.map(row => row.period!.year).sort(), ['2020', '2021']);
    assert.equal((await readSeason('2020', { storePath }))!.rows.find(row => row.personName === 'Record manager 02')!.points, 4);
    assert.equal((await readSeason('2021', { storePath }))!.rows.find(row => row.personName === 'Record manager 02')!.points, 80);
    const week = source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[];
    week[0].custom_points = 100; // The team override is official; player totals stay untouched.
    await publish(storePath, source);
    assert.equal((await readCategory('dominant-season', { storePath }))!.leaders[0].value, 71.42857142857143);
    const corrected = (await readSeason('2021', { storePath }))!.rows.find(row => row.personName === 'Record manager 01')!;
    assert.equal(corrected.expectedWinsExactKey, '4/3');
    assert.equal((await readCategory('unluckiest-season', { storePath, season: '2021' }))!.rows.find(row => row.name === 'Record manager 01')!.exactKey, '1/3');
    week[0].points = null;
    await assert.rejects(publish(storePath, source), /points/);
    assert.equal((await readCategory('dominant-season', { storePath }))!.leaders[0].value, 71.42857142857143);
  });
});

test('published zero league scoring leaves dominance unknown while real all-play ties remain eligible', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[0, 0, 0, 0]]);
    (source.responses[`league/${source.seedLeagueId}`] as any).status = 'complete';
    await publish(storePath, source);
    const season = await readSeason('2021', { storePath });
    assert.deepEqual(season!.rows.map(row => [row.scoringVsLeague, row.expectedWins, row.winsVsExpected]), Array.from({ length: 4 }, () => [null, 0.5, 0]));
    assert.equal((await readCategory('dominant-season', { storePath }))!.rows.length, 0);
    assert.deepEqual((await readCategory('unluckiest-season', { storePath }))!.rows.map(row => [row.value, row.rank]), [[0, 1], [0, 1], [0, 1], [0, 1]]);
    for (const row of source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[]) row.matchup_id = null;
    await publish(storePath, source);
    assert.deepEqual((await readSeason('2021', { storePath }))!.rows.map(row => [row.scoringVsLeague, row.expectedWins, row.winsVsExpected]), Array.from({ length: 4 }, () => [null, null, null]));
    assert.equal((await readCategory('unluckiest-season', { storePath }))!.rows.length, 0);
  });
});
