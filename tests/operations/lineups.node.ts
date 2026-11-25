import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { readManagerStats } from '../../src/history/manager-stats.ts';
import { readCategory } from '../../src/history/records.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-lineups-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
type Source = ReturnType<typeof recordsSource>;
type Scored = [player: string, points: number | null];
/** A league with these roster slots whose players' IDs start with their position: "RB-1". */
function league(slots: string[], scores: number[][]) {
  const source = recordsSource(scores);
  (source.responses[`league/${source.seedLeagueId}`] as any).roster_positions = slots;
  return source;
}
/** A manager's week: starters in slot order ("0" is an empty slot), then bench. A null score was never recorded. */
function lineup(source: Source, week: number, manager: number, starters: Scored[], bench: Scored[] = []) {
  const row = (source.responses[`league/${source.seedLeagueId}/matchups/${week}`] as any[])[manager - 1];
  const players = [...starters, ...bench].filter(([id]) => id !== '0');
  row.starters = starters.map(([id]) => id);
  row.starters_points = starters.map(([, points]) => points);
  row.players = players.map(([id]) => id);
  row.players_points = Object.fromEntries(players.filter(([, points]) => points !== null));
  for (const [id] of players) (source.responses['players/nfl'] as any)[id] = { position: id.split('-')[0], full_name: `Player ${id}` };
  return row;
}
/** Each manager's short name, figure and sample, rank 1 first. */
const rows = async (storePath: string, key: string) => (await readManagerStats({ storePath }))!.find(stat => stat.key === key)?.rows
  .map(row => [row.name.replace('Record manager ', 'M'), row.figure, row.sample]);
/** The worst-managed weeks: manager, gap and when. */
const worst = async (storePath: string) => (await readCategory('worst-managed-week', { storePath }))!.rows.map(row => [row.manager!.replace('Record manager ', 'M'), row.value, row.leaderContext]);

test('published best lineups are a true best assignment where either greedy order loses', async () => {
  await withHistory(async storePath => {
    const source = league(['REC_FLEX', 'WRRB_FLEX', 'BN', 'BN', 'IR', 'TAXI'], [[22, 22]]);
    // The WR fits both slots. M1's best is WR with RB (30), M2's is TE with WR (30): filling either slot first with its best player takes 22 from one of them.
    lineup(source, 1, 1, [['TE-1', 2], ['WR-1', 20]], [['RB-1', 10]]);
    lineup(source, 1, 2, [['WR-2', 20], ['RB-2', 2]], [['TE-2', 10]]);
    await publish(storePath, source);
    assert.deepEqual(await worst(storePath), [['M01', 8, 'Week 1 · 2021 · vs Record manager 02'], ['M02', 8, 'Week 1 · 2021 · vs Record manager 01']]);
    // 22 of 30 is 73.33%.
    assert.deepEqual(await rows(storePath, 'lineup-share'), [['M01', '73.3%', '1 week'], ['M02', '73.3%', '1 week']]);
    assert.deepEqual(await rows(storePath, 'perfect-lineups'), [['M01', '0', '1 week'], ['M02', '0', '1 week']]);
  });
});

test('published best lineups let a player fill any slot type they have started in here, and no other', async () => {
  await withHistory(async storePath => {
    const source = league(['QB', 'WR', 'BN'], [[30, 30], [30, 30], [30, 30]]);
    // TE-1 started at QB in week 1, so week 2's best has him there: 25 + 1 beats 5 + 1. He isn't a WR, or 5 + 25 would beat that.
    lineup(source, 1, 1, [['TE-1', 10], ['WR-1', 10]]);
    lineup(source, 2, 1, [['QB-1', 5], ['WR-1', 1]], [['TE-1', 25]]);
    // It holds for anyone in the league who rosters him. TE-2 has never started at QB, so his 40 has no slot.
    lineup(source, 3, 2, [['QB-2', 4], ['WR-3', 9]], [['TE-1', 24], ['TE-2', 40]]);
    await publish(storePath, source);
    assert.deepEqual(await worst(storePath), [['M01', 20, 'Week 2 · 2021 · vs Record manager 02'], ['M02', 20, 'Week 3 · 2021 · vs Record manager 01']]);
    assert.deepEqual(await rows(storePath, 'perfect-lineups'), [['M01', '1', '2 weeks'], ['M02', '0', '1 week']]);
  });
});

test('published best lineups leave out weeks with an unrecognized slot or an unknown score', async () => {
  await withHistory(async storePath => {
    const source = league(['RB', 'BN'], [[10, 10], [10, 10], [0, 0]]);
    lineup(source, 1, 1, [['RB-1', 10]], [['RB-2', 14]]);
    lineup(source, 2, 1, [['RB-1', 0]], [['RB-2', null]]); // Unknown, never a 0 that would make this week perfect.
    lineup(source, 1, 2, [['RB-3', 10], ['RB-4', 3]]); // One more starter than the season has slots.
    lineup(source, 2, 2, [['RB-3', 10]]);
    lineup(source, 3, 2, [['0', 0]], [['RB-3', 6]]); // An empty slot is fair to fill.
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'perfect-lineups'), [['M02', '1', '2 weeks'], ['M01', '0', '1 week']]);
    // 10 of 14, and 10 of 16.
    assert.deepEqual(await rows(storePath, 'lineup-share'), [['M01', '71.4%', '1 week'], ['M02', '62.5%', '2 weeks']]);
    (source.responses[`league/${source.seedLeagueId}`] as any).roster_positions = ['RB', 'HEAD_COACH', 'BN'];
    await publish(storePath, source);
    assert.equal(await rows(storePath, 'perfect-lineups'), undefined);
    assert.equal(await rows(storePath, 'lineup-share'), undefined);
    assert.deepEqual(await worst(storePath), []);
  });
});

test('published best lineups never fall below what was started, and a 0% share needs points to share', async () => {
  await withHistory(async storePath => {
    const source = league(['RB', 'WR', 'BN'], [[10, 0], [10, 0]]);
    lineup(source, 1, 1, [['RB-1', 10], ['0', 0]], [['WR-1', -2]]); // Filling the empty slot would cost 2.
    lineup(source, 2, 1, [['RB-1', -3], ['WR-1', 8]]); // Nobody else to start, so a negative starter is still perfect.
    lineup(source, 1, 2, [['RB-2', 0], ['WR-2', 0]]);
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'perfect-lineups'), [['M01', '2', '2 weeks'], ['M02', '1', '1 week']]);
    assert.deepEqual(await rows(storePath, 'lineup-share'), [['M01', '100.0%', '2 weeks']]);
    assert.deepEqual(await worst(storePath), []);
  });
});

test('published losses a better lineup wins add the gap to the official score, which an override moves and the gap ignores', async () => {
  await withHistory(async storePath => {
    const source = league(['RB', 'BN'], [[100, 105], [100, 105], [100, 100], [100, 100], [100, 90], [100, 105]]);
    lineup(source, 1, 1, [['RB-1', 10]], [['RB-2', 15.01]]); // 105.01 beats 105.
    lineup(source, 2, 1, [['RB-1', 10]], [['RB-2', 15]]); // 105 only ties it.
    lineup(source, 3, 1, [['RB-1', 10]], [['RB-2', 25]]).custom_points = 90; // The override made it a loss; 90 + 15 wins it.
    lineup(source, 4, 1, [['RB-1', 10]], [['RB-2', 60]]); // A tie isn't a loss.
    lineup(source, 5, 1, [['RB-1', 10]], [['RB-2', 40]]); // Nor is a win.
    lineup(source, 6, 1, [['RB-1', 10]], [['RB-2', null]]); // Nobody knows about this loss.
    const other = lineup(source, 5, 2, [['RB-3', 10]]);
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'losses-better-lineup'), [['M01', '2', 'of 3 losses'], ['M02', '0', 'of 1 loss']]);
    // M2's override to 110 turns week 5 into a loss that the 30 M1 left on the bench would have won.
    other.custom_points = 110;
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'losses-better-lineup'), [['M01', '3', 'of 4 losses'], ['M02', '0', 'of 0 losses']]);
    assert.deepEqual((await worst(storePath)).map(([, gap]) => gap), [50, 30, 15, 5.01, 5], 'no override changed a gap');
  });
});

test('published zero-point starters and lowest starter scores count recorded scores, never an empty slot or the bench', async () => {
  await withHistory(async storePath => {
    const source = league(['RB', 'WR', 'TE', 'BN'], [[10, 5], [10, 4], [10, 5]]);
    lineup(source, 1, 1, [['RB-1', 0], ['0', 0], ['TE-1', 10]], [['WR-9', -9]]); // One zero; the empty slot scored nothing.
    lineup(source, 2, 1, [['RB-1', 0], ['WR-1', -0.5], ['TE-1', 10.5]]); // One more; −0.5 isn't zero.
    lineup(source, 1, 2, [['RB-2', 5], ['WR-2', 0.01], ['0', 0]]);
    lineup(source, 2, 2, [['RB-2', 4.5], ['WR-2', -0.5], ['0', 0]]);
    // A bye week's lineup has no game to count in.
    const games = source.responses[`league/${source.seedLeagueId}/matchups/3`] as any[];
    for (const row of games) row.matchup_id = null;
    lineup(source, 3, 1, [['RB-1', 0], ['WR-1', -20], ['TE-1', null]]);
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'zero-starters'), [['M01', '2', 'of 5 starts'], ['M02', '0', 'of 4 starts']]);
    assert.deepEqual((await readCategory('lowest-starter', { storePath }))!.rows.slice(0, 4).map(row => [row.rank, row.value, row.name, row.leaderContext]), [
      [1, -0.5, 'Player WR-1', 'Record manager 01 · Week 2 · 2021 · vs Record manager 02'],
      [1, -0.5, 'Player WR-2', 'Record manager 02 · Week 2 · 2021 · vs Record manager 01'],
      [3, 0, 'Player RB-1', 'Record manager 01 · Week 1 · 2021 · vs Record manager 02'],
      [3, 0, 'Player RB-1', 'Record manager 01 · Week 2 · 2021 · vs Record manager 02'],
    ]);
  });
});

test('published lineup stats stay with the person who held the roster', async () => {
  await withHistory(async storePath => {
    const source = league(['RB', 'BN'], [[10, 20]]);
    const old = league(['RB', 'BN'], [[10, 20]]);
    lineup(old, 1, 1, [['RB-1', 0]], [['RB-2', 30]]);
    lineup(source, 1, 1, [['RB-1', 10]], [['RB-2', 5]]);
    const oldId = '900000000000002020';
    for (const [path, value] of Object.entries(old.responses)) if (path.startsWith('league/')) source.responses[path.replace(old.seedLeagueId, oldId)] = value;
    Object.assign(source.responses[`league/${oldId}`] as any, { league_id: oldId, season: '2020', status: 'complete' });
    (source.responses[`league/${source.seedLeagueId}`] as any).previous_league_id = oldId;
    Object.assign((source.responses[`league/${oldId}/users`] as any[])[0], { user_id: '960000000000009999', display_name: 'Record manager 99' });
    (source.responses[`league/${oldId}/rosters`] as any[])[0].owner_id = '960000000000009999';
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'lineup-share'), [['M01', '100.0%', '1 week'], ['M99', '0.0%', '1 week']]);
    assert.deepEqual(await rows(storePath, 'losses-better-lineup'), [['M99', '1', 'of 1 loss'], ['M01', '0', 'of 1 loss']]);
    assert.deepEqual(await rows(storePath, 'zero-starters'), [['M99', '1', 'of 1 start'], ['M01', '0', 'of 1 start']]);
    assert.deepEqual(await worst(storePath), [['M99', 30, 'Week 1 · 2020 · vs Record manager 02']]);
  });
});
