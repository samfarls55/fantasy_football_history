import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { streaksSource } from '../fixtures/streaks-source.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { readRivalryStreaks } from '../../src/history/rivalries.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-rivalry-streaks-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
const streaks = async (storePath: string) => (await readRivalryStreaks({ storePath }))!.map(row => [row.winner.name, row.loser.name, row.count, row.record]);

test('published rivalry streaks name three straight wins or more, longest first, with playoffs counted', async () => {
  await withHistory(async storePath => {
    assert.equal(await readRivalryStreaks({ storePath }), null);
    const source = streaksSource();
    await publish(storePath, source);
    // Manager 1 has won two straight since the 2021 tie; manager 4 has won all six.
    assert.deepEqual(await streaks(storePath), [['Record manager 04', 'Record manager 03', 6, '6–0']]);
    // Without the tie the run goes back to the 2020 playoff loss.
    (source.responses['league/900000000000002021/matchups/2'] as any[])[1].points = 1;
    await publish(storePath, source);
    assert.deepEqual(await streaks(storePath), [['Record manager 04', 'Record manager 03', 6, '6–0'], ['Record manager 01', 'Record manager 02', 4, '6–1']]);
  });
});

test('published rivalry streaks are the five longest, and every one tied with the fifth', async () => {
  await withHistory(async storePath => {
    // Six pairs play four weeks. 02's run over 01 is four, the other pairs' three after an opening loss.
    const week = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    const opening = [1, 2, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1];
    await publish(storePath, recordsSource([opening, week, week, week]));
    assert.deepEqual((await streaks(storePath)).map(([winner,, count]) => [winner, count]), [['Record manager 02', 4], ...['04', '06', '08', '10', '12'].map(number => [`Record manager ${number}`, 3])]);
    // With five runs of four, the run of three is sixth.
    await publish(storePath, recordsSource([[...opening.slice(0, 2), 1, 2, 1, 2, 1, 2, 1, 2, 2, 1], week, week, week]));
    assert.deepEqual((await streaks(storePath)).map(([,, count]) => count), [4, 4, 4, 4, 4]);
  });
});

test('published rivalry streaks count between current managers, so a roster changing hands starts its own', async () => {
  await withHistory(async storePath => {
    const source = streaksSource();
    // Roster 3 passes to manager 5 for 2021: manager 4's two 2020 wins stay over manager 3, who left.
    (source.responses['league/900000000000002021/rosters'] as any[])[2].owner_id = '960000000000000005';
    Object.assign((source.responses['league/900000000000002021/users'] as any[])[2], { user_id: '960000000000000005', display_name: 'Record manager 05' });
    await publish(storePath, source);
    assert.deepEqual(await streaks(storePath), [['Record manager 04', 'Record manager 05', 4, '4–0']]);
  });
});
