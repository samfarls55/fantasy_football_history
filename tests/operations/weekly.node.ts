import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { readManagerStats } from '../../src/history/manager-stats.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-weekly-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
const stat = async (storePath: string, key: string) => (await readManagerStats({ storePath }))!.find(stat => stat.key === key);
/** Each manager's short name, figure, sample and rank, best first. */
const rows = async (storePath: string, key: string) => (await stat(storePath, key))?.rows
  .map(row => [row.name.replace('Record manager ', 'M'), row.figure, row.sample, row.rank]);
/** Weekly scores, M1 against M2 and M3 against M4. */
const games = (source: ReturnType<typeof recordsSource>, week: number) => source.responses[`league/${source.seedLeagueId}/matchups/${week}`] as any[];

test('published top and bottom scores give every team tied for a week one, and count a true zero but not a bye', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([
      [120, 120, 90, 80], // M1 and M2 share the top; M4 is bottom.
      [100, 0, 90, 0], // M1 is top; M2 and M4 share the bottom with true zeros.
      [130, 100, 90, 90], // M1's override of 95 makes M2 top; M3 and M4 share the bottom.
      [100, 90, 200, 1], // M3 and M4 have no game, so M1 is top and M2 bottom.
    ]);
    games(source, 3)[0].custom_points = 95;
    for (const row of games(source, 4).slice(2)) row.matchup_id = null;
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'top-scores'), [['M01', '3', '4 weeks', 1], ['M02', '2', '4 weeks', 2], ['M03', '0', '3 weeks', 3], ['M04', '0', '3 weeks', 3]]);
    assert.deepEqual(await rows(storePath, 'bottom-scores'), [['M01', '0', '4 weeks', 1], ['M03', '1', '3 weeks', 2], ['M02', '2', '4 weeks', 3], ['M04', '3', '3 weeks', 4]]);
  });
});

test('published big-score games count from the 80th-percentile score rounded to the nearest 10, and the label names that line', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[160, 150, 149.99, 100], [155, 145, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [0, 90, 90, 90]]);
    const bigScores = async () => [(await stat(storePath, 'big-scores'))!.label, await rows(storePath, 'big-scores')];
    await publish(storePath, source);
    // 16 of the 20 scores are 145 or lower, so 145 is the 80th percentile and the line is 150. A 150 reaches it and 149.99 doesn't.
    assert.deepEqual(await bigScores(), ['150+ point games', [['M01', '2', '5 games', 1], ['M02', '1', '5 games', 2], ['M03', '0', '5 games', 3], ['M04', '0', '5 games', 3]]]);
    // An official 144.99 in place of the 145 takes the line to 140.
    games(source, 2)[1].custom_points = 144.99;
    await publish(storePath, source);
    assert.deepEqual(await bigScores(), ['140+ point games', [['M01', '2', '5 games', 1], ['M02', '2', '5 games', 1], ['M03', '1', '5 games', 3], ['M04', '0', '5 games', 4]]]);
  });
});

test('published boom or bust is the spread of each score against its week’s average, ranked as displayed', async () => {
  await withHistory(async storePath => {
    await publish(storePath, recordsSource([[130, 110, 90, 70]]));
    assert.equal(await rows(storePath, 'boom-or-bust'), undefined, 'one score has no swing');
    // Weekly averages of 100, 50 and 0. The all-zero week has no average to compare with.
    await publish(storePath, recordsSource([[130, 110, 90, 70], [35, 55, 60, 50], [0, 0, 0, 0]]));
    // M1: 130% then 70%. M2: 110% twice. M3: 90% then 120%. M4: 70% then 100%, which shows the same 15.0% as M3.
    assert.deepEqual(await rows(storePath, 'boom-or-bust'), [['M01', '30.0%', '2 weeks', 1], ['M03', '15.0%', '2 weeks', 2], ['M04', '15.0%', '2 weeks', 2], ['M02', '0.0%', '2 weeks', 4]]);
  });
  await withHistory(async storePath => {
    // Spreads of 14.98% and 15.02% both show 15.0%, so they tie. A true zero swings M4 by 100%.
    await publish(storePath, recordsSource([[114.98, 115.02, 170, 0], [85.02, 84.98, 30, 200]]));
    assert.deepEqual(await rows(storePath, 'boom-or-bust'), [['M04', '100.0%', '2 weeks', 1], ['M03', '70.0%', '2 weeks', 2], ['M01', '15.0%', '2 weeks', 3], ['M02', '15.0%', '2 weeks', 3]]);
  });
});

test('published early and late win rates show the record behind them, count a tie as half and leave out weeks 6 to 8 and the playoffs', async () => {
  await withHistory(async storePath => {
    const [win, loss, tie] = [[100, 90, 80, 70], [90, 100, 80, 70], [95, 95, 80, 70]];
    const source = recordsSource([win, win, win, win, tie, loss, loss, loss, loss, tie, win, win]);
    (source.responses[`league/${source.seedLeagueId}`] as any).settings.playoff_week_start = 12;
    source.responses[`league/${source.seedLeagueId}/winners_bracket`] = [{ r: 1, m: 1, t1: 1, t2: 2, w: 1, l: 2, p: 1 }];
    for (const row of games(source, 12).slice(2)) row.matchup_id = null;
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'early-wins'), [['M03', '100.0%', '5–0', 1], ['M01', '90.0%', '4–0–1', 2], ['M02', '10.0%', '0–4–1', 3], ['M04', '0.0%', '0–5', 4]]);
    // Weeks 9 to 11: M1 lost, tied and won, and the week 12 final doesn't count.
    assert.deepEqual(await rows(storePath, 'late-wins'), [['M03', '100.0%', '3–0', 1], ['M01', '50.0%', '1–1–1', 2], ['M02', '50.0%', '1–1–1', 2], ['M04', '0.0%', '0–3', 4]]);
  });
});

test('published weekly stats keep each person’s own seasons, and a rate nobody played for stays unknown', async () => {
  await withHistory(async storePath => {
    // A short 2021 regular season that never reached week 9.
    const source = recordsSource(Array(8).fill([100, 90, 80, 70]));
    await publish(storePath, source);
    assert.deepEqual((await rows(storePath, 'early-wins'))![0], ['M01', '100.0%', '5–0', 1]);
    assert.equal(await rows(storePath, 'late-wins'), undefined, 'no week 9 leaves the rate unknown for everyone');
  });
  await withHistory(async storePath => {
    // Before it, a nine-week 2020 in which someone else had roster 2 and outscored everyone.
    const source = recordsSource(Array(8).fill([100, 90, 80, 70]));
    const oldId = '900000000000002020';
    const old = structuredClone(recordsSource(Array(9).fill([100, 150, 80, 70])));
    for (const [path, value] of Object.entries(old.responses)) if (path.startsWith('league/')) source.responses[path.replace(old.seedLeagueId, oldId)] = value;
    Object.assign(source.responses[`league/${oldId}`] as any, { league_id: oldId, season: '2020', status: 'complete' });
    (source.responses[`league/${source.seedLeagueId}`] as any).previous_league_id = oldId;
    Object.assign((source.responses[`league/${oldId}/users`] as any[])[1], { user_id: '960000000000009999', display_name: 'Record manager 99' });
    (source.responses[`league/${oldId}/rosters`] as any[])[1].owner_id = '960000000000009999';
    await publish(storePath, source);
    assert.deepEqual(await rows(storePath, 'top-scores'), [['M99', '9', '9 weeks', 1], ['M01', '8', '17 weeks', 2], ['M02', '0', '8 weeks', 3], ['M03', '0', '17 weeks', 3], ['M04', '0', '17 weeks', 3]]);
    assert.deepEqual((await rows(storePath, 'bottom-scores'))!.at(-1), ['M04', '17', '17 weeks', 5]);
    // M2 never reached a week 9, which is unknown rather than 0%.
    assert.deepEqual(await rows(storePath, 'late-wins'), [['M03', '100.0%', '1–0', 1], ['M99', '100.0%', '1–0', 1], ['M01', '0.0%', '0–1', 3], ['M04', '0.0%', '0–1', 3]]);
    assert.deepEqual(await rows(storePath, 'early-wins'), [['M03', '100.0%', '10–0', 1], ['M99', '100.0%', '5–0', 1], ['M01', '50.0%', '5–5', 3], ['M02', '0.0%', '0–5', 4], ['M04', '0.0%', '0–10', 4]]);
  });
});
