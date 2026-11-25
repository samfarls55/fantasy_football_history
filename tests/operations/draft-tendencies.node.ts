import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { draftOf, draftsSource } from '../fixtures/drafts-source.ts';
import { readManagerStats } from '../../src/history/manager-stats.ts';

/** Publishes a league and reads each Draft column's rows: rank, manager, names, figure with its unit, sample. */
async function tendencies(source: ReturnType<typeof draftsSource>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-tendencies-'));
  const storePath = join(directory, 'history.json');
  try {
    await publish(storePath, source);
    return Object.fromEntries((await readManagerStats({ storePath, places: ['draft'] }))!.map(view =>
      [view.key, view.rows.map(row => [row.rank, row.name, row.names?.join(', '), `${row.figure} ${row.unit}`, row.sample])]));
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test('published drafted most often counts every type of finished draft for the person who picked, with every tied player', async () => {
  const { 'most-drafted': rows } = await tendencies(draftsSource([
    // A season under way. Player 32 was kept, which is a pick like any other. A newcomer has taken roster 4 over and drafted nobody twice.
    { year: '2021', complete: false, accounts: { 4: '960000000000009001' }, drafts: [
      draftOf({ id: '21', keepers: { 32: true }, source: { type: 'auction' } }),
      draftOf({ id: '21b', source: { status: 'paused' } }),
    ] },
    { year: '2020', drafts: [draftOf({ id: '20' })] },
    // Rosters 2 and 3 swapped places, and roster 4 has players 14 and 13, whose pick it traded for.
    { year: '2019', drafts: [draftOf({ id: '19', rounds: 1, slots: 4, order: [1, 3, 2, 4], traded: { 13: 4 }, settings: { player_type: 1 } })] },
  ]));
  assert.deepEqual(rows, [
    [1, 'Record manager 01', 'Player 11', '3 times', 'in 3 drafts'],
    [2, 'Record manager 02', 'Player 12, Player 22, Player 32, Player 42', '2 times each', 'in 2 drafts'],
    [2, 'Record manager 03', 'Player 13, Player 23, Player 33, Player 43', '2 times each', 'in 3 drafts'],
    [2, 'Record manager 04', 'Player 14', '2 times', 'in 2 drafts'],
  ]);
});

/** One draft whose picks were recorded with these NFL teams, of players the list describes this way. */
function scouted(rounds: number, teams: Record<string, string | null>, players: Record<string, object>, season: Partial<Parameters<typeof draftsSource>[0][number]> = {}) {
  const draft = draftOf({ id: '20', rounds });
  for (const pick of draft.picks) pick.metadata.team = teams[pick.player_id] as string;
  const source = draftsSource([{ year: '2020', drafts: [draft], ...season }]);
  for (const [id, player] of Object.entries(players)) Object.assign(source.responses['players/nfl'][id], player);
  return source;
}

test('published most-drafted NFL team is the one recorded with each pick, team defenses included', async () => {
  const { 'drafted-team': rows } = await tendencies(scouted(4, {
    // Player 11 has since moved, and roster 1's defense is a team like any other.
    11: 'OAK', 21: 'OAK', 31: 'LV', 41: 'SEA', 12: 'NYJ', 22: 'KC', 32: 'NYJ', 42: 'KC',
    // An unsigned player has no team.
    13: null, 23: null, 33: 'DAL', 43: 'DAL', 14: 'GB', 24: 'CHI', 34: 'DET', 44: 'MIN',
  }, { 11: { team: 'LV' }, 21: { team: 'LV', position: 'DEF' } }));
  assert.deepEqual(rows, [
    [1, 'Record manager 01', 'OAK', '2 times', 'in 4 picks'],
    [1, 'Record manager 02', 'KC, NYJ', '2 times each', 'in 4 picks'],
    [1, 'Record manager 03', 'DAL', '2 times', 'in 2 picks'],
  ]);
});

test('published most-drafted college leaves out team defenses and unknown colleges', async () => {
  const { 'drafted-college': rows } = await tendencies(scouted(5, {}, {
    11: { college: 'Iowa' }, 21: { college: 'Ohio State' }, 31: { college: 'Iowa' }, 41: { college: 'Ohio State' }, 51: { college: 'Duke' },
    // Sleeper's own words for an unknown college.
    12: { college: 'No College' }, 22: { college: 'No College' }, 32: { college: 'LSU' }, 42: { college: 'LSU' }, 52: { college: 'No College' },
    13: { college: 'None' }, 23: { college: 'None' }, 33: { college: 'null' }, 43: { college: 'null' }, 53: { college: 'USC' },
    14: { college: 'Texas', position: 'DEF' }, 24: { college: 'Texas', position: 'DEF' }, 34: { college: 'Texas', position: 'DEF' }, 44: { college: 'Utah' }, 54: { college: 'Utah' },
  }));
  assert.deepEqual(rows, [
    [1, 'Record manager 01', 'Iowa, Ohio State', '2 times each', 'in 5 picks'],
    [1, 'Record manager 02', 'LSU', '2 times', 'in 2 picks'],
    [1, 'Record manager 04', 'Utah', '2 times', 'in 2 picks'],
  ]);
});

const day = (date: string, time = 'T16:00:00Z') => ({ start_time: Date.parse(date + time) });

test('published average draft age measures each known birth date on the day of the draft, team defenses left out', async () => {
  const source = draftsSource([
    // Roster 4 has changed hands. It's the evening of September 6 in New York.
    { year: '2021', complete: false, accounts: { 4: '960000000000009001' }, drafts: [draftOf({ id: '21', rounds: 2, order: [4, 2, 3, 1], source: day('2021-09-07', 'T01:00:00Z') })] },
    { year: '2020', drafts: [draftOf({ id: '20', rounds: 2, source: day('2020-09-06') })] },
    // A draft Sleeper gives no date.
    { year: '2019', drafts: [draftOf({ id: '19', rounds: 3, source: { start_time: null } })] },
  ]);
  for (const [id, player] of Object.entries({
    // Manager 01 drafted player 11 at 19 and player 14 at 20.999. The newcomer drafted 11, and manager 04 drafted 14, at 20.
    11: { birth_date: '2001-09-06' }, 14: { birth_date: '2000-09-06' }, 31: { birth_date: '1980-01-01' },
    // 22 and 23 when drafted, beside an unknown birth date.
    12: { birth_date: '1998-09-06' }, 22: { birth_date: null },
    // A defense, beside a player who is 30, then 31.
    13: { birth_date: '1960-01-01', position: 'DEF' }, 23: { birth_date: '1990-09-06' },
  })) Object.assign(source.responses['players/nfl'][id], player);
  const { 'draft-age': rows } = await tendencies(source);
  assert.deepEqual(rows, [
    [1, 'Newcomer 4', undefined, '20.0 years', '1 pick'],
    [1, 'Record manager 01', undefined, '20.0 years', '2 picks'],
    [1, 'Record manager 04', undefined, '20.0 years', '1 pick'],
    [4, 'Record manager 02', undefined, '22.5 years', '2 picks'],
    [5, 'Record manager 03', undefined, '30.5 years', '2 picks'],
  ], 'the youngest rank first');
});
