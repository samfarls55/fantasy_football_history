import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-managers-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
async function fixture(name = 'provider-history') {
  return JSON.parse(await readFile(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));
}

test('published manager careers retain the two replacements, supported names and separate recorded tenures', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    source.responses['league/900000000000002020/rosters'][0].metadata = { team_name: 'Harbor Crew' };
    source.responses['league/900000000000002021/rosters'][2].metadata = { team_name: 'Buccaneers' };
    await publish(storePath, source);
    const { readManagers, readManager } = await import('../../src/history/managers.ts');
    const directory = await readManagers({ storePath });
    assert.equal(directory?.filter(person => person.current).length, 4);
    const tim = await readManager('person-608473907007143936', { storePath });
    const woody = await readManager('person-472580465006473216', { storePath });
    assert.deepEqual(tim?.seasons.map(season => season.year), ['2021', '2020']);
    assert.equal(tim?.facts.record, '1–3');
    assert.equal(tim?.facts.points, 85.5);
    assert.equal(tim?.facts.games, 4);
    assert.equal(tim?.facts.winPercentage, 25);
    assert.equal(tim?.facts.championships, 1);
    assert.equal(tim?.facts.playoffAppearances, 1);
    assert.equal(woody?.seasons.length, 1);
    assert.equal(tim?.tenures[0].events[0].kind, 'takeover');
    assert.equal(tim?.tenures[0].events[0].predecessor?.name, 'Woody14');
    assert.ok(tim?.tenures[0].events.some(event => event.label === 'Played as Buccaneers'));
    assert.equal(woody?.tenures[0].events[0].label, 'First season in the archive');
    const sebastian = await readManager('person-740265931783245824', { storePath });
    assert.equal(sebastian?.tenures[0].events[0].predecessor?.name, 'alecswartout');
    assert.equal(sebastian?.facts.championships, 0);
    const returning = await readManager('person-800000000000000001', { storePath });
    assert.deepEqual(returning?.tenures.map(tenure => tenure.range), ['2019', '2021']);
    assert.equal(returning?.tenures[1].events[0].label, 'Next season in the archive');
    assert.equal(JSON.stringify(tim).includes('Present-day label'), false);
    assert.equal(await readManager('missing', { storePath }), null);
  });
});

test('career points include completed legs before a multiweek result while resolved bracket placements retain final finishes', async () => {
  await withHistory(async storePath => {
    const source = await fixture('playoff-type-1');
    const partial = structuredClone(source);
    partial.responses[`league/${source.seedLeagueId}`].status = 'in_season';
    partial.responses[`league/${source.seedLeagueId}`].settings.last_scored_leg = 4;
    partial.responses['state/nfl'].week = 5;
    for (const row of partial.responses[`league/${source.seedLeagueId}/winners_bracket`].filter((row: any) => row.r === 3)) row.w = row.l = null;
    await publish(storePath, partial);
    const { readManager, readManagerSeason } = await import('../../src/history/managers.ts');
    const pending = await readManager('person-950000000000000001', { storePath, scope: 'playoffs' });
    assert.equal(pending?.facts.record, '1–0');
    assert.equal(pending?.facts.points, 60.1); // 50 semifinal + 10.1 completed final leg; bye 99 excluded.
    assert.equal(pending?.facts.championships, 0);
    assert.equal(pending?.seasons[0].finish, null);
    await publish(storePath, source);
    const expected = { '1': 2, '2': 4, '3': 3, '4': 5, '5': 1, '6': 6, '7': 10, '8': 9, '9': 8, '10': 7 };
    for (const [roster, finish] of Object.entries(expected)) {
      const manager = await readManager(`person-950000000000000${roster.padStart(3, '0')}`, { storePath });
      assert.equal(manager?.seasons[0].finish, finish, `roster ${roster}`);
    }
    const season = await readManagerSeason('person-950000000000000005', '2025', { storePath, scope: 'playoffs' });
    assert.equal(season?.team.finish, 1);
    assert.equal(season?.facts.record, '3–0');
    assert.equal(season?.games.length, 3);
    assert.equal(season?.games[0].opponent.personId, 'person-950000000000000001');
    assert.equal(season?.games[0].href, `/seasons/2025/matchups/${source.seedLeagueId}-winners-m16/?scope=playoffs&week=5`);
  });
});

test('career corrections replace public results, failed refresh keeps the career and unknown rates stay unknown', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    await publish(storePath, source);
    const { readManager, readManagerSeason } = await import('../../src/history/managers.ts');
    const timId = 'person-608473907007143936';
    const before = await readManager(timId, { storePath });
    assert.equal(before?.facts.points, 85.5);
    Object.assign(source.responses, source.variants.correctedOfficialScore.responseOverrides);
    await publish(storePath, source);
    const corrected = await readManager(timId, { storePath });
    assert.equal(corrected?.facts.points, 83.5);
    assert.equal(corrected?.facts.record, '0–4');
    assert.equal((await publish(storePath, source)).changed, false);
    delete source.responses['league/900000000000002020/matchups/1'];
    await assert.rejects(publish(storePath, source), /Missing controlled response/);
    assert.deepEqual(await readManager(timId, { storePath }), corrected);
    const noGames = await readManager(timId, { storePath, scope: 'consolation' });
    assert.equal(noGames?.facts.games, 0);
    assert.equal(noGames?.facts.winPercentage, null);
    assert.equal(noGames?.facts.championships, 1); // Honors are outcomes, independent of game scope.
    assert.equal(await readManagerSeason(timId, '2019', { storePath }), null);
    const tied = await readManager('person-800000000000000001', { storePath, season: '2019' });
    assert.equal(tied?.facts.record, '0–0–1');
    assert.equal(tied?.facts.winPercentage, 50);
  });
});
