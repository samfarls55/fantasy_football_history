import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { readCategory, readRecordCollection } from '../../src/history/records.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { streaksSource } from '../fixtures/streaks-source.ts';

async function published(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-game-records-'));
  try { await run(join(directory, 'history.json')); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

test('published final margins preserve decimal equality, zero ties, unique contests and both people', async () => {
  await published(async storePath => {
    const source = recordsSource([[100.12, 100, 10.25, 10.13, 0, 0], [99.9, 100, 10, 8, 4, 0]]);
    await publish(storePath, source);
    const closest = await readCategory('closest-game', { storePath });
    assert.deepEqual(closest?.rows.map(row => [row.value, row.rank, row.exactKey]), [
      [0, 1, '0/1'], [0.1, 2, '1/10'], [0.12, 3, '3/25'], [0.12, 3, '3/25'], [2, 5, '2/1'], [4, 6, '4/1'],
    ]);
    assert.equal(closest?.total, 6);
    assert.match(closest!.rows[2].href, /\/seasons\/2021\/matchups\/.+\?scope=regular&week=1/);
    assert.equal(closest!.rows[2].secondary?.[0].name, 'Record manager 02');
    assert.match(closest!.rows[2].secondary![0].href, /\/managers\/.+\/seasons\/2021\/\?scope=regular/);
    assert.deepEqual((await readCategory('biggest-blowout', { storePath }))?.leaders.map(row => [row.value, row.rank]), [[4, 1]]);
    assert.equal((await readRecordCollection({ storePath }))?.find(group => group.name === 'Matchups')?.categories.find(category => category.key === 'closest-game')?.leaders[0].value, 0);
    (source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[])[0].custom_points = 100.25;
    await publish(storePath, source);
    assert.deepEqual((await readCategory('closest-game', { storePath }))?.rows.slice(2, 4).map(row => [row.value, row.rank, row.exactKey]), [[0.12, 3, '3/25'], [0.25, 4, '1/4']]);
  });
});

test('published weekly score records use official totals, include true zero and exclude byes and future placeholders', async () => {
  await published(async storePath => {
    const source = recordsSource([[100.12, 100, 10.25, 10.13], [0, 4, 0, 999], [0, 0, 0, 0]]);
    const league = source.responses[`league/${source.seedLeagueId}`] as any;
    league.settings.last_scored_leg = 2;
    (source.responses['state/nfl'] as any).week = 3;
    const second = source.responses[`league/${source.seedLeagueId}/matchups/2`] as any[];
    for (const row of second.slice(2)) row.matchup_id = null;
    const first = source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[];
    first[2].custom_points = 123.456;
    await publish(storePath, source);
    const high = await readCategory('highest-score', { storePath });
    assert.deepEqual(high?.leaders.map(row => [row.name, row.value, row.period]), [
      ['Record manager 03', 123.456, { year: '2021', week: 1, playedAt: null }],
    ]);
    assert.equal(high?.total, 6);
    assert.match(high!.leaders[0].href, /scope=regular&week=1&team=3/);
    const low = await readCategory('lowest-score', { storePath });
    assert.deepEqual(low?.leaders.map(row => [row.name, row.value]), [['Record manager 01', 0]]);
    assert.equal(low?.rows.filter(row => row.name === 'Record manager 01').length, 2);
    first[2].custom_points = 0;
    await publish(storePath, source);
    assert.deepEqual((await readCategory('lowest-score', { storePath }))?.leaders.map(row => row.name), ['Record manager 01', 'Record manager 03']);
    first[0].points = null;
    await assert.rejects(publish(storePath, source), /missing or invalid numeric value/);
    assert.deepEqual((await readCategory('lowest-score', { storePath }))?.leaders.map(row => row.name), ['Record manager 01', 'Record manager 03']);
    delete source.responses[`league/${source.seedLeagueId}/matchups/1`];
    await assert.rejects(publish(storePath, source), /Missing controlled response/);
    assert.deepEqual((await readCategory('lowest-score', { storePath }))?.leaders.map(row => row.name), ['Record manager 01', 'Record manager 03']);
  });
});

test('published weekly performance ranks include every cutoff tie and keep canonical places when reordered', async () => {
  await published(async storePath => {
    await publish(storePath, recordsSource([[20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 11, 11, 10, 9]]));
    const initial = await readCategory('highest-score', { storePath, season: '2021' });
    assert.equal(initial?.rows.length, 12);
    assert.deepEqual(initial?.rows.slice(-3).map(row => row.rank), [10, 10, 10]);
    assert.match(initial!.nextHref!, /season=2021&scope=regular&limit=20/);
    const expanded = await readCategory('highest-score', { storePath, season: '2021', sort: 'value-asc', limit: 20 });
    assert.equal(expanded?.rows.length, 14);
    assert.deepEqual(expanded?.rows.map(row => row.rank), [14, 13, 10, 10, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });
});

test('published career streaks retain one longest interval per person across seasons while ties and season filters stop runs', async () => {
  await published(async storePath => {
    const source = streaksSource();
    await publish(storePath, source);
    const wins = await readCategory('winning-streak', { storePath });
    const first = wins?.rows.find(row => row.name === 'Record manager 01');
    assert.deepEqual(wins?.rows.map(row => [row.name, row.value]), [['Record manager 04', 6], ['Record manager 01', 3]]);
    assert.equal(first?.detail, 'Week 1 · 2020 – Week 1 · 2021');
    assert.deepEqual(first?.period, { year: '2021', week: 1, playedAt: null });
    assert.match(first!.href, /scope=regular&streak=winning&from=.+&through=/);
    assert.deepEqual((await readCategory('losing-streak', { storePath }))?.rows.map(row => [row.name, row.value]), [['Record manager 03', 6], ['Record manager 02', 3]]);
    assert.equal((await readCategory('winning-streak', { storePath, season: '2020' }))?.rows.find(row => row.name === 'Record manager 01')?.value, 2);
    assert.equal((await readCategory('winning-streak', { storePath, season: '2021' }))?.rows.find(row => row.name === 'Record manager 01')?.value, 2);
    const combined = (await readCategory('winning-streak', { storePath, scope: 'combined' }))?.rows.find(row => row.name === 'Record manager 01');
    assert.equal(combined?.value, 2);
    assert.deepEqual(combined?.period, { year: '2021', week: 4, playedAt: null });
    assert.equal((await readCategory('winning-streak', { storePath, scope: 'placement' }))?.rows.length, 0);
    const weekTwo = source.responses[`league/${source.seedLeagueId}/matchups/2`] as any[];
    weekTwo[1].custom_points = 1;
    await publish(storePath, source);
    assert.deepEqual((await readCategory('winning-streak', { storePath }))?.leaders.map(row => [row.name, row.value]), [['Record manager 01', 6], ['Record manager 04', 6]]);
    assert.equal((await publish(storePath, source)).changed, false);
  });
});

test('a published streak destination retains the selected interval and links every counted contest in order', async () => {
  await published(async storePath => {
    await publish(storePath, streaksSource());
    const row = (await readCategory('winning-streak', { storePath }))!.rows.find(row => row.name === 'Record manager 01')!;
    const params = new URL(row.href, 'https://museum.example').searchParams;
    const { readStreakHistory } = await import('../../src/history/game-records.ts');
    const selection = { storePath, scope: 'regular' as const, streak: params.get('streak'), from: params.get('from'), through: params.get('through') };
    const history = await readStreakHistory(row.personId, selection);
    assert.equal(history?.interval, 'Week 1 · 2020 – Week 1 · 2021');
    assert.deepEqual(history?.games.map(game => [game.year, game.weeks, game.result, game.opponentName]), [
      ['2020', [1], 'W', 'Record manager 02'], ['2020', [2], 'W', 'Record manager 02'], ['2021', [1], 'W', 'Record manager 02'],
    ]);
    assert.match(history!.games[2].href, /\/seasons\/2021\/matchups\/.+scope=regular&week=1/);
    assert.equal(await readStreakHistory(row.personId, { ...selection, scope: 'combined' }), null);
    assert.equal(await readStreakHistory(row.personId, { ...selection, season: '2021' }), null);
    assert.equal(await readStreakHistory(row.personId, { ...selection, from: 'missing' }), null);
  });
});

test('weekly highs and lows retain completed multiweek legs while margins count only the complete final contest', async () => {
  await published(async storePath => {
    const source = JSON.parse(await readFile(new URL('../fixtures/playoff-type-1.json', import.meta.url), 'utf8'));
    await publish(storePath, source);
    const scores = await readCategory('highest-score', { storePath, scope: 'playoffs', limit: 100 });
    const firstLeg = scores!.rows.find(row => row.name === 'Format Manager 1' && row.period?.week === 4)!;
    assert.equal(firstLeg.value, 10.1);
    assert.match(firstLeg.href, /scope=playoffs&week=4&team=1/);
    const finals = (await readCategory('closest-game', { storePath, scope: 'playoffs' }))!.rows.filter(row => row.period?.week === 5);
    assert.equal(finals.length, 1);
    assert.equal(finals[0].value, 5);
    const fullStreak = (await readCategory('winning-streak', { storePath, scope: 'playoffs' }))!.rows.find(row => row.name === 'Format Manager 5')!;
    assert.equal(fullStreak.value, 3);
    const league = source.responses[`league/${source.seedLeagueId}`];
    league.status = 'in_season'; league.settings.last_scored_leg = 4;
    source.responses['state/nfl'].week = 5;
    for (const row of source.responses[`league/${source.seedLeagueId}/winners_bracket`].filter((row: any) => row.r === 3)) row.w = row.l = null;
    await publish(storePath, source);
    const partialScores = (await readCategory('lowest-score', { storePath, scope: 'playoffs', limit: 100 }))!;
    assert.equal(partialScores.rows.find(row => row.name === 'Format Manager 1' && row.period?.week === 4)?.value, 10.1);
    assert.equal((await readCategory('closest-game', { storePath, scope: 'playoffs' }))!.rows.some(row => row.period?.week === 5), false);
    assert.equal((await readCategory('winning-streak', { storePath, scope: 'playoffs' }))!.rows.find(row => row.name === 'Format Manager 5')?.value, 2);
    assert.equal((await readCategory('highest-score', { storePath, scope: 'consolation', limit: 100 }))!.rows.some(row => row.name === 'Format Manager 1'), false);
    assert.equal((await readCategory('closest-game', { storePath, scope: 'placement' }))!.rows.some(row => row.name === 'Format Manager 1'), false);
  });
});
