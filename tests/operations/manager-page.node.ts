import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { streaksSource } from '../fixtures/streaks-source.ts';
import { readManager } from '../../src/history/managers.ts';
import { readManagerRivalries } from '../../src/history/rivalries.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-manager-page-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
const finishes = async (storePath: string, personId: string) => (await readManager(personId, { storePath }))!.seasons
  .filter(season => season.complete).map(season => [season.year, season.finish, season.teams]);

test('published finishes cover a person’s own completed seasons, and one Sleeper never placed stays unknown', async () => {
  await withHistory(async storePath => {
    await publish(storePath, JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8')));
    // Woody14's 2019 roster became Timh17's in 2020; 2021 is still being played.
    assert.deepEqual(await finishes(storePath, 'person-472580465006473216'), [['2019', 5, 6]]);
    assert.deepEqual(await finishes(storePath, 'person-608473907007143936'), [['2020', 1, 2]]);
  });
  await withHistory(async storePath => {
    await publish(storePath, streaksSource());
    assert.deepEqual(await finishes(storePath, 'person-960000000000000001'), [['2020', 2, 4]]);
    assert.deepEqual(await finishes(storePath, 'person-960000000000000003'), [['2020', null, 4]]);
  });
});

test('published meetings list every regular and playoff game newest first, with playoffs marked', async () => {
  await withHistory(async storePath => {
    await publish(storePath, streaksSource());
    const { rows } = (await readManagerRivalries('person-960000000000000001', { storePath, scope: 'combined' }))!;
    assert.deepEqual(rows.map(row => [row.b.name, row.record]), [['Record manager 02', '5–1–1']]);
    assert.deepEqual(rows[0].games.map(game => [game.year, game.week, game.result, game.side.points, game.opponent.points, game.competition]), [
      ['2021', 4, 'W', 2, 1, 'regular'], ['2021', 3, 'W', 2, 1, 'regular'], ['2021', 2, 'T', 2, 2, 'regular'], ['2021', 1, 'W', 2, 1, 'regular'],
      ['2020', 3, 'L', 1, 2, 'playoffs'], ['2020', 2, 'W', 2, 1, 'regular'], ['2020', 1, 'W', 2, 1, 'regular'],
    ]);
  });
});
