import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishControlledHistory as publish, withHistory } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { readScheduleSwap } from '../../src/history/schedule-swap.ts';

/** A completed season of the given weekly scores, each week paired by the given matchup IDs; a null is an unpaired bye. */
function completedSeason(scores: number[][], pairings: (number | null)[][]) {
  const source = recordsSource(scores);
  (source.responses[`league/${source.seedLeagueId}`] as any).status = 'complete';
  pairings.forEach((week, index) => (source.responses[`league/${source.seedLeagueId}/matchups/${index + 1}`] as any[]).forEach((row, roster) => { row.matchup_id = week[roster]; }));
  return source;
}
/** Each manager's record under every schedule, the columns in the order of the rows. */
async function grid(storePath: string, season?: string) {
  return Object.fromEntries((await readScheduleSwap({ storePath, season }))!.rows.map(row => [row.name.replace('Record manager ', ''), row.cells.map(cell => cell?.record ?? null)]));
}

test('published schedule swap scores each manager against another schedule, and against its owner in the weeks the two met', async () => {
  await withHistory(async storePath => {
    assert.equal(await readScheduleSwap({ storePath }), null, 'unpublished history has no schedules');
    await publish(storePath, completedSeason([[100, 90, 80, 70], [60, 95, 85, 75], [88, 92, 110, 66]], [[1, 1, 2, 2], [1, 2, 1, 2], [1, 2, 2, 1]]));
    const view = (await readScheduleSwap({ storePath }))!;
    // The best actual record leads, and the diagonal is the actual record: 03 won out, 01 lost to 03 alone, 02 beat 04 alone.
    assert.deepEqual(view.rows.map(row => [row.name, row.cells.filter(cell => cell?.actual).map(cell => cell!.record)]), [
      ['Record manager 03', ['3–0']], ['Record manager 01', ['2–1']], ['Record manager 02', ['1–2']], ['Record manager 04', ['0–3']],
    ]);
    assert.deepEqual(await grid(storePath), {
      // 03 with 01's schedule: lost 80–90 to 02, met 01 (85–60, a win), beat 04 110–66.
      '03': ['3–0', '2–1', '2–1', '2–1'],
      // 01 with 02's schedule: met 02 (100–90, a win), lost 60–75 to 04, lost 88–110 to 03.
      '01': ['1–2', '2–1', '1–2', '2–1'],
      '02': ['2–1', '2–1', '1–2', '3–0'],
      '04': ['1–2', '0–3', '0–3', '0–3'],
    });
    assert.deepEqual(view.rows.map(row => row.cells.map(cell => cell!.better)), [
      [false, false, false, false], [false, false, false, false], [true, true, false, true], [true, false, false, false],
    ], 'only a record that beats the actual one is better');
  });
});

test('published schedule swap counts a tied week as a tie, at the official score', async () => {
  await withHistory(async storePath => {
    const source = completedSeason([[80, 100, 90, 100]], [[1, 1, 2, 2]]);
    // The commissioner's 100 is official, so 01 and 02 tied.
    (source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[])[0].custom_points = 100;
    await publish(storePath, source);
    assert.deepEqual(await grid(storePath), {
      // Columns 04, 01, 02, 03. 04 ties 01 and 02 under each other's schedule; 01 ties 04 under 03's.
      '04': ['1–0', '0–0–1', '0–0–1', '1–0'],
      '01': ['1–0', '0–0–1', '0–0–1', '0–0–1'],
      '02': ['1–0', '0–0–1', '0–0–1', '0–0–1'],
      '03': ['0–1', '0–1', '0–1', '0–1'],
    });
    // A tie is half a win: better than 03's loss, worse than 04's win.
    const view = (await readScheduleSwap({ storePath }))!;
    assert.deepEqual(view.rows.map(row => row.cells.map(cell => cell!.better)), [[false, false, false, false], [true, false, false, false], [true, false, false, false], [false, false, false, false]]);
  });
});

test('published schedule swap holds no game in a week either manager had an unpaired bye', async () => {
  await withHistory(async storePath => {
    // 02 and 04 sit out week 2.
    await publish(storePath, completedSeason([[100, 90, 80, 70], [50, 0, 60, 0]], [[1, 1, 2, 2], [1, null, 1, null]]));
    assert.deepEqual(await grid(storePath), {
      '03': ['2–0', '1–1', '0–1', '1–0'],
      '01': ['1–1', '1–1', '1–0', '1–0'],
      '02': ['1–0', '0–1', '0–1', '1–0'],
      '04': ['0–1', '0–1', '0–1', '0–1'],
    });
    // 01 and 02 play only in week 1, 03 and 04 only in week 2, so neither pair has a game to swap.
    await publish(storePath, completedSeason([[100, 90, 80, 70], [50, 40, 60, 0]], [[1, 1, null, null], [null, null, 1, 1]]));
    assert.deepEqual(await grid(storePath), {
      '01': ['1–0', null, '1–0', null], '03': [null, '1–0', null, '1–0'],
      '02': ['0–1', null, '0–1', null], '04': [null, '0–1', null, '0–1'],
    });
  });
});

test('published schedule swap shows the newest completed season first and keeps a replaced manager’s season theirs', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[100, 90, 80, 70]]);
    await publish(storePath, source);
    assert.equal(await readScheduleSwap({ storePath }), null, 'a season under way has no schedule to swap');
    // Roster 2 belonged to another person in 2020, and every result ran the other way in 2019.
    for (const [year, week] of [['2020', [100, 90, 80, 70]], ['2019', [70, 80, 90, 100]]] as [string, number[]][]) {
      const id = `90000000000000${year}`;
      const old = completedSeason([week], [[1, 1, 2, 2]]);
      for (const [path, value] of Object.entries(old.responses)) if (path.startsWith('league/')) source.responses[path.replace(old.seedLeagueId, id)] = value;
      Object.assign(source.responses[`league/${id}`] as any, { league_id: id, season: year, previous_league_id: year === '2020' ? '900000000000002019' : null });
      (source.responses[`league/${id}/users`] as any[])[1] = { user_id: '960000000000000099', display_name: 'Record manager 99', avatar: null };
      (source.responses[`league/${id}/rosters`] as any[])[1].owner_id = '960000000000000099';
    }
    (source.responses[`league/${source.seedLeagueId}`] as any).previous_league_id = '900000000000002020';
    await publish(storePath, source);
    const view = (await readScheduleSwap({ storePath }))!;
    assert.deepEqual([view.year, view.years], ['2020', ['2020', '2019']]);
    const newest = { '01': ['1–0', '1–0', '1–0', '1–0'], '03': ['0–1', '1–0', '0–1', '1–0'], '99': ['0–1', '1–0', '0–1', '1–0'], '04': ['0–1', '0–1', '0–1', '0–1'] };
    assert.deepEqual(await grid(storePath), newest);
    // 04 beat 03, and 99 beat 01, in the season the link names.
    assert.deepEqual(await grid(storePath, '2019'), { '04': ['1–0', '1–0', '1–0', '1–0'], '99': ['0–1', '1–0', '0–1', '1–0'], '03': ['0–1', '1–0', '0–1', '1–0'], '01': ['0–1', '0–1', '0–1', '0–1'] });
    assert.deepEqual(await grid(storePath, '2021'), newest, 'a season with no swap shows the newest one');
  });
});
