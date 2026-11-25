import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishControlledHistory as publish, withHistory } from '../support/history.ts';
import { draftOf, draftsSource } from '../fixtures/drafts-source.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { managerStats, readManagerStats } from '../../src/history/manager-stats.ts';
import { readPlaceRecords } from '../../src/history/records.ts';
import { readTabs } from '../../src/history/tabs.ts';

/** Each visible tab's lead: the stat's anchor, what it's called, its figure and unit, and who holds it. */
const leads = async (storePath: string) => (await readTabs({ storePath }))!.map(({ key, lead }) => lead && [key, lead.category.key, lead.category.name,
  lead.leaders[0].shown ?? lead.leaders[0].value, lead.category.unit, ...lead.leaders.map(row => row.manager?.replace('Record manager ', 'M'))]);

/** A finished season: manager 1 beats 2 and 3 beats 4 in two weeks, then 1 beats 2 in the final. */
function finished(drafts: ReturnType<typeof draftOf>[]) {
  const source = draftsSource([{ year: '2020', drafts, lineups: [{ 1: { 31: 10.5 }, 2: { 32: 25 }, 4: { 33: 40 } }, { 1: { 31: 20.25 }, 2: { 12: 30 } }] }]);
  const week = (number: number) => source.responses[`league/${source.seedLeagueId}/matchups/${number}`];
  week(2)[0].points = 120.5;
  // Manager 2 lost 90–100 with 20 more points on the bench at the starter's position.
  Object.assign(week(1)[1], { players: ['32', '42'], players_points: { 32: 25, 42: 45 } });
  source.responses[`league/${source.seedLeagueId}/transactions/1`] = [[3, '50'], [3, '51'], [4, '52']].map(([roster, player], index) => (
    { transaction_id: `98000000000000000${index}`, leg: 1, type: 'free_agent', status: 'complete', status_updated: 1600000000000 + index, adds: { [player]: roster }, drops: null }));
  for (const id of ['50', '51', '52']) source.responses['players/nfl'][id] = { full_name: `Player ${id}`, position: 'QB' };
  return source;
}

test('published leads are one chosen stat from each tab, with the values its tab shows', async () => {
  await withHistory(async storePath => {
    await publish(storePath, finished([draftOf({ id: '20' })]));
    assert.deepEqual(await leads(storePath), [
      null,
      ['legacy', 'bridesmaid', 'Most finals lost without a title', 1, 'finals', 'M02'],
      ['games', 'highest-score', 'Highest score', 120.5, 'points', 'M01'],
      ['excuses', 'losses-better-lineup', 'Most winnable losses', '1', 'loss', 'M02'],
      ['players', 'most-started', 'Most-started player', '2', 'starts', 'M01'],
      ['draft', 'best-steal', 'Best steal', 30.75, 'points as a starter', 'M01'],
      ['moves', 'pickups', 'Most pickups', '2', 'pickups', 'M03'],
    ]);
  });
});

test('published leads fall back to the first stat on the page that somebody holds, ties and all', async () => {
  await withHistory(async storePath => {
    // Two weeks of a first season: no title, lineup, draft or move yet. Three managers have a win each.
    await publish(storePath, recordsSource([[100, 90, 50, 50], [90, 100, 60, 40]]));
    const [home, legacy, ...rest] = await leads(storePath);
    assert.equal(home, null);
    // Titles lead Legacy's table, but nobody holds a count of zero.
    assert.deepEqual(legacy, ['legacy', 'record', 'Most wins', '1–1', 'W–L–T', 'M01', 'M02', 'M03']);
    assert.deepEqual((await readTabs({ storePath }))![1].lead!.leaders.map(row => row.sample), ['1–1', '1–1', '1–0–1'], 'equal wins with unequal records each keep their own');
    assert.deepEqual(rest, [
      ['games', 'highest-score', 'Highest score', 100, 'points', 'M01', 'M02'],
      ['excuses', 'points-in-win', 'Fewest points in a win', 60, 'points', 'M03'],
    ]);
  });
  await withHistory(async storePath => {
    // An auction draft has no steal, bust or slot, so Draft leads from its table: every pick of M1's, M2's and M3's was a Buccaneer.
    const auction = draftOf({ id: '20', source: { type: 'auction' } });
    auction.picks[3].metadata.team = 'CHI';
    await publish(storePath, finished([auction]));
    assert.deepEqual((await leads(storePath))[5], ['draft', 'drafted-team', 'Most-drafted team', '4', 'times', 'M01', 'M02', 'M03']);
    assert.deepEqual((await readTabs({ storePath }))![5].lead!.leaders[0].names, ['TB']);
    // With M4's all Buccaneers too, everyone ties, so nothing leads.
    auction.picks[3].metadata.team = 'TB';
    await publish(storePath, finished([auction]));
    assert.deepEqual((await leads(storePath))[5], null);
  });
  await withHistory(async storePath => {
    // Without the bench, no better lineup wins anything. Manager 3's 2–0 beat the 2⁄3 of a win that outscoring one of three others twice earned.
    const source = finished([draftOf({ id: '20' })]);
    Object.assign(source.responses[`league/${source.seedLeagueId}/matchups/1`][1], { players: ['32'], players_points: { 32: 25 } });
    await publish(storePath, source);
    assert.deepEqual((await leads(storePath))[3], ['excuses', 'luckiest-season', 'Luckiest season', 4 / 3, 'wins above expected', 'M03']);
  });
});

test('published leads are never a stat every manager ties on', async () => {
  await withHistory(async storePath => {
    // Nobody has played a game yet, so all Legacy knows is that everyone is in their first season.
    const source = recordsSource([[0, 0, 0, 0]]);
    Object.assign((source.responses[`league/${source.seedLeagueId}`] as any).settings, { last_scored_leg: 0 });
    await publish(storePath, source);
    assert.deepEqual(await leads(storePath), [null, null]);
    assert.deepEqual((await readManagerStats({ storePath }))!.map(stat => stat.key), ['seasons']);
  });
});

test('published leads leave out a hidden tab', async () => {
  await withHistory(async storePath => {
    await publish(storePath, finished([]));
    assert.deepEqual((await leads(storePath)).map(lead => lead?.[0]), [undefined, 'legacy', 'games', 'excuses', 'players', 'moves']);
  });
});

test('published leads never name a card their tab leaves out', async () => {
  await withHistory(async storePath => {
    // Managers 1 and 2 have a title each, so no bridesmaid. Manager 1's 2021 is the most dominant season, which Home's headline already tells.
    const source = draftsSource([{ year: '2021', champion: 2, drafts: [] }, { year: '2020', drafts: [] }]);
    source.responses['league/900000000000002020/matchups/1'][0].points = 99;
    await publish(storePath, source);
    assert.deepEqual((await leads(storePath))[1], ['legacy', 'titles', 'Most titles', '1', 'won', 'M01', 'M02'], 'Legacy opens with its table');
    const stats = managerStats.splice(0);
    try {
      assert.deepEqual((await readPlaceRecords(['legacy'], { storePath }))!.map(view => view.category.key), ['belt-run']);
      assert.deepEqual((await leads(storePath))[1], ['legacy', 'belt-run', 'Longest belt run', 2, 'defenses', 'M01']);
    } finally { managerStats.push(...stats); }
  });
});
