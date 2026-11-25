import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { readBadges } from '../../src/history/badges.ts';
import { Exact } from '../../src/history/decimal.ts';
import { closeLosses } from '../../src/history/luck.ts';
import { managerStats, readManagerStats } from '../../src/history/manager-stats.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-badges-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
type Source = ReturnType<typeof recordsSource>;
/** Each manager's badge with its figure and rank, by manager. */
const worn = async (storePath: string) => (await readBadges({ storePath }))!.map(row => [row.manager.replace('Record manager ', 'M'), row.badge, `${row.figure} ${row.unit}`, row.rank]).sort();
const team = (source: Source, roster: number) => (source.responses[`league/${source.seedLeagueId}/users`] as any[])[roster - 1];
/** Free-agent pickups by day, one per entry, each of a new player by that roster. */
function pickups(source: Source, rosters: number[]) {
  rosters.forEach((roster, index) => move(source, { type: 'free_agent', adds: { [`p${index}`]: roster }, roster_ids: [roster] }));
  return source;
}
function move(source: Source, event: { type: string; adds: Record<string, number>; drops?: Record<string, number>; roster_ids: number[] }) {
  const moves = source.responses[`league/${source.seedLeagueId}/transactions/1`] as any[];
  for (const id of Object.keys(event.adds)) (source.responses['players/nfl'] as any)[id] = { full_name: `Player ${id}`, position: 'RB' };
  moves.push({ transaction_id: `97000000000000000${moves.length}`, leg: 1, status: 'complete', status_updated: Date.parse('2021-09-15T16:00:00Z') + moves.length, drops: null, draft_picks: [], waiver_budget: [], ...event });
}
/** M1 has the top score and M4 the bottom one. M1 beat M2 and M3 beat M4, so nobody was robbed or got away with it. */
const week = [130, 95, 100, 90];

test('published badges go out one to a manager, the lowest rank first, and only for a value above zero', async () => {
  await withHistory(async storePath => {
    assert.equal(await readBadges({ storePath }), null, 'unpublished history has no badges');
    // M1 ranks 1st in top scores and pickups, so pickups falls to M2, 2nd. M3 is 3rd in pickups alone.
    // Free agents by day leave everyone tied 1st at zero pickups after midnight.
    await publish(storePath, pickups(recordsSource([week]), [1, 1, 1, 2, 2, 3]));
    assert.deepEqual(await worn(storePath), [['M01', 'Juggernaut', '1 time', 1], ['M02', 'Tinkerer', '2 pickups', 2], ['M04', 'Cellar Dweller', '1 time', 1]]);
  });
});

test('published badges break equal ranks by the badge list, then by person ID', async () => {
  await withHistory(async storePath => {
    // M2 and M3 tie for most pickups, and the trade between them ties them for most trades.
    const source = pickups(recordsSource([week]), [2, 2, 3, 3]);
    move(source, { type: 'trade', adds: { p0: 3, p2: 2 }, drops: { p0: 2, p2: 3 }, roster_ids: [2, 3] });
    // Names run the other way, so they can't be what decides.
    Object.assign(team(source, 2), { display_name: 'Zed' });
    Object.assign(team(source, 3), { display_name: 'Abe' });
    await publish(storePath, source);
    assert.deepEqual(await worn(storePath), [['Abe', 'Dealmaker', '1 trade', 1], ['M01', 'Juggernaut', '1 time', 1], ['M04', 'Cellar Dweller', '1 time', 1], ['Zed', 'Tinkerer', '2 pickups', 1]]);
    assert.deepEqual((await readBadges({ storePath }))!.map(row => [row.badge, row.tied, row.of]), [['Juggernaut', false, 4], ['Tinkerer', true, 4], ['Cellar Dweller', false, 4], ['Dealmaker', true, 4]]);
  });
});

test('published badges give a later badge at a lower rank before an earlier one at a higher rank', async () => {
  await withHistory(async storePath => {
    // M3 is 2nd in pickups to M1, who has the top score, and tied 1st with M1 in trades.
    const source = pickups(recordsSource([week]), [1, 1, 1, 3, 3]);
    move(source, { type: 'trade', adds: { p0: 3, p3: 1 }, drops: { p0: 1, p3: 3 }, roster_ids: [1, 3] });
    await publish(storePath, source);
    assert.deepEqual(await worn(storePath), [['M01', 'Juggernaut', '1 time', 1], ['M03', 'Dealmaker', '1 trade', 1], ['M04', 'Cellar Dweller', '1 time', 1]]);
  });
});

test('published badges rank current managers against each other, and give former ones none', async () => {
  await withHistory(async storePath => {
    // In 2020 someone else held roster 2 and had every top score, so M1's 2021 one is 2nd in the table. Among current managers it's 1st.
    const source = pickups(recordsSource([week]), [1, 1, 3]);
    const oldId = '900000000000002020';
    const old = recordsSource([[90, 130, 100, 80], [90, 130, 100, 80]]);
    for (const [path, value] of Object.entries(old.responses)) if (path.startsWith('league/')) source.responses[path.replace(old.seedLeagueId, oldId)] = value;
    Object.assign(source.responses[`league/${oldId}`] as any, { league_id: oldId, season: '2020', status: 'complete' });
    (source.responses[`league/${source.seedLeagueId}`] as any).previous_league_id = oldId;
    Object.assign((source.responses[`league/${oldId}/users`] as any[])[1], { user_id: '960000000000009999', display_name: 'Record manager 99' });
    (source.responses[`league/${oldId}/rosters`] as any[])[1].owner_id = '960000000000009999';
    await publish(storePath, source);
    const top = (await readManagerStats({ storePath, places: ['games'] }))!.find(stat => stat.key === 'top-scores')!;
    assert.deepEqual(top.rows.map(row => [row.name.slice(-2), row.figure, row.rank]), [['99', '2', 1], ['01', '1', 2], ['02', '0', 3], ['03', '0', 3], ['04', '0', 3]]);
    // M1 is 1st in pickups in the table too, so ranking with M99 would have made M1 the Tinkerer.
    // M3's shares of the average are 100%, 100% and 96.4%, the steadiest. M4 has every bottom score.
    const badges = (await readBadges({ storePath }))!;
    assert.deepEqual(badges.map(row => [row.manager.slice(-2), row.badge, row.figure, row.rank, row.of]), [['01', 'Juggernaut', '1', 1, 4], ['03', 'Metronome', '1.7%', 1, 3], ['04', 'Cellar Dweller', '3', 1, 4]]);
  });
});

test('published Wild Card and Metronome are the two ends of boom or bust, and a swing of zero is neither', async () => {
  await withHistory(async storePath => {
    // Both weeks average 100. Shares of it: M1 150% twice, M2 90% then 98%, M3 120 and 110, M4 80 and 66, M5 100 and 136, M6 60 and 40.
    // Half of each gap is its standard deviation: 0, 4, 5, 7, 18 and 10.
    await publish(storePath, recordsSource([[150, 90, 120, 80, 100, 60], [150, 98, 110, 66, 136, 40]]));
    // M1's swing of 0 ranks 1st from the low end but isn't above zero, so Metronome waits for M2, 2nd.
    assert.deepEqual(await worn(storePath), [['M01', 'Juggernaut', '2 times', 1], ['M02', 'Metronome', '4.0% of league average', 2], ['M05', 'Wild Card', '18.0% of league average', 1], ['M06', 'Cellar Dweller', '2 times', 1]]);
    assert.deepEqual((await readBadges({ storePath }))!.filter(row => row.key === 'boom-or-bust').map(row => [row.badge, row.end, row.label]), [
      ['Wild Card', 'highest', 'Typical weekly swing, % of league average'], ['Metronome', 'lowest', 'Typical weekly swing, % of league average']]);
  });
});

test('published Heartbroken counts the losses in the close-game record, and adds no column of its own', async () => {
  await withHistory(async storePath => {
    // M3 and M4 play two 1-point games that M4 loses and a 2-point one that M3 loses. M1 is always top and M2 always bottom.
    await publish(storePath, recordsSource([[130, 60, 90, 89], [130, 60, 90, 89], [130, 60, 88, 90]]));
    const luck = (await readManagerStats({ storePath, places: ['luck'] }))!;
    assert.deepEqual(luck.map(stat => stat.key), ['robbed', 'got-away', 'close-games']);
    assert.deepEqual(luck[2].rows.map(row => [row.name.slice(-2), row.figure]), [['03', '2–1'], ['04', '1–2']]);
    const heartbroken = (await readBadges({ storePath }))!.find(row => row.badge === 'Heartbroken')!;
    assert.deepEqual([heartbroken.manager, heartbroken.figure, heartbroken.unit, heartbroken.sample, heartbroken.label, heartbroken.key],
      ['Record manager 04', '2', 'losses', 'of 3 games', 'Losses in games decided by under 5', 'close-games']);
  });
});

test('published badges leave out one whose stat is unavailable', async () => {
  // M3 lost by 10 and started player a, for 1 point.
  const benched = (points: Record<string, number>) => {
    const source = recordsSource([[130, 95, 90, 100, 120, 40]]);
    (source.responses[`league/${source.seedLeagueId}`] as any).roster_positions = ['QB', 'BN'];
    Object.assign((source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[])[2], { starters: ['a'], starters_points: [1], players: ['a', 'b'], players_points: { a: 1, ...points } });
    for (const id of ['a', 'b']) (source.responses['players/nfl'] as any)[id] = { full_name: `Player ${id}`, position: 'QB' };
    return source;
  };
  const mine = async (storePath: string) => (await readBadges({ storePath }))!.filter(row => row.manager.endsWith('03')).map(row => [row.badge, row.figure, row.unit, row.names]);
  await withHistory(async storePath => {
    // Player b's 26 would have added 25 and won it.
    await publish(storePath, benched({ b: 26 }));
    assert.deepEqual(await mine(storePath), [['Own Worst Enemy', '1', 'loss', undefined]]);
  });
  await withHistory(async storePath => {
    // A bench score Sleeper never sent leaves the loss unknown, so M3's badge is the next one listed: one start by player a.
    await publish(storePath, benched({}));
    assert.deepEqual(await mine(storePath), [['Ride or Die', '1', 'start', ['Player a']]]);
  });
});

test('published badges run out in a league with more managers than badges, in list order when everyone ties', async () => {
  // Eighteen managers tie on every stat.
  const registered = [...managerStats, closeLosses].map(stat => ({ stat, values: stat.values }));
  try {
    for (const { stat } of registered) stat.values = archive => new Map(archive.people.map(person => [person.id, { value: Exact.from(1) }]));
    await withHistory(async storePath => {
      await publish(storePath, recordsSource([Array(18).fill(100)]));
      assert.deepEqual((await readBadges({ storePath }))!.map(row => [row.manager.slice(-2), row.badge, row.label]), [
        ['01', 'Juggernaut', 'Week’s top score'],
        ['02', 'Tinkerer', 'Pickups'],
        ['03', 'Bridesmaid', 'Finals lost'],
        ['04', 'Night Owl', 'Pickups, midnight–5am ET'],
        ['05', 'Wild Card', 'Typical weekly swing, % of league average'],
        ['06', 'Metronome', 'Typical weekly swing, % of league average'],
        ['07', 'Own Worst Enemy', 'Losses a better lineup wins'],
        ['08', 'Heartbroken', 'Losses in games decided by under 5'],
        ['09', 'Cellar Dweller', 'Week’s bottom score'],
        ['10', 'Rollercoaster', 'Biggest one-year change in finish'],
        ['11', 'Ride or Die', 'Most-started player'],
        ['12', 'Denied', 'Failed claims'],
        ['13', 'Dealmaker', 'Trades'],
        ['14', 'Robbed', 'Lost with the week’s 2nd-best score'],
        ['15', 'Bandit', 'Won with the week’s 2nd-worst score'],
        ['16', 'Closer', 'Win % from week 9'],
      ]);
    });
  } finally {
    for (const { stat, values } of registered) stat.values = values;
  }
});
