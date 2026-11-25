import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { streaksSource } from '../fixtures/streaks-source.ts';
import { readHeadToHead, readManagerRivalries } from '../../src/history/rivalries.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-head-to-head-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
/** Each manager's record against every other, the columns in the order of the rows. */
async function grid(storePath: string) {
  return (await readHeadToHead({ storePath }))!.map(row => [row.name.replace('Record manager ', ''), ...row.cells.map(cell => cell?.record ?? null)]);
}

test('published head to head counts ties and playoffs, and a pair who never met has no record', async () => {
  await withHistory(async storePath => {
    assert.equal(await readHeadToHead({ storePath }), null, 'unpublished history has no meetings');
    await publish(storePath, streaksSource());
    // 01 beat 02 five times, tied once and lost their 2020 playoff game; 04 beat 03 all six times; nobody else met.
    assert.deepEqual(await grid(storePath), [
      ['01', null, '5–1–1', null, null],
      ['02', '1–5–1', null, null, null],
      ['03', null, null, null, '0–6'],
      ['04', null, null, '6–0', null],
    ]);
    assert.deepEqual((await readHeadToHead({ storePath }))!.map(row => row.cells.map(cell => cell?.better ?? null)), [
      [null, true, null, null], [false, null, null, null], [null, null, null, false], [null, null, true, null],
    ], 'only a winning record is better');
    // The manager page says the same, and lists those seven meetings.
    const versus = (await readManagerRivalries('person-960000000000000001', { storePath, scope: 'combined' }))!.rows;
    assert.deepEqual(versus.map(row => [row.b.name, row.record, row.games.length]), [['Record manager 02', '5–1–1', 7]]);
  });
});

test('published head to head keeps to current managers, so a replacement has only their own meetings', async () => {
  await withHistory(async storePath => {
    const source = streaksSource();
    // Roster 3 passes to 05 for 2021: 04's two 2020 wins stay over 03, who left.
    (source.responses['league/900000000000002021/rosters'] as any[])[2].owner_id = '960000000000000005';
    Object.assign((source.responses['league/900000000000002021/users'] as any[])[2], { user_id: '960000000000000005', display_name: 'Record manager 05' });
    await publish(storePath, source);
    assert.deepEqual(await grid(storePath), [
      ['01', null, '5–1–1', null, null],
      ['02', '1–5–1', null, null, null],
      ['04', null, null, null, '4–0'],
      ['05', null, null, '0–4', null],
    ]);
  });
});

test('published head to head waits for two current managers to meet, and an even record is nobody’s', async () => {
  await withHistory(async storePath => {
    const source = recordsSource([[10, 10, 7, 0]]);
    const week = source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[];
    for (const row of week) row.matchup_id = null;
    await publish(storePath, source);
    assert.equal(await readHeadToHead({ storePath }), null);
    week[0].matchup_id = week[1].matchup_id = 1;
    await publish(storePath, source);
    assert.deepEqual((await readHeadToHead({ storePath }))!.map(row => row.cells.map(cell => cell && [cell.record, cell.better])), [
      [null, ['0–0–1', false], null, null], [['0–0–1', false], null, null, null], [null, null, null, null], [null, null, null, null],
    ]);
  });
});
