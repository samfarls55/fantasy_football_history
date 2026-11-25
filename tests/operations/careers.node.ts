import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { final, seasonsSource, titled, type Year } from '../fixtures/seasons-source.ts';
import { readManagerStats } from '../../src/history/manager-stats.ts';
import { readCategory, readPlaceRecords, readRecordsHeld } from '../../src/history/records.ts';

async function published<T>(source: Parameters<typeof publish>[1], read: (storePath: string) => Promise<T>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-careers-'));
  try {
    const storePath = join(directory, 'history.json');
    await publish(storePath, source);
    return await read(storePath);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
const base = async () => JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
/** The careers table: each column's figures by manager, best first. */
const careers = async (storePath: string) => new Map((await readManagerStats({ storePath, places: ['legacy'] }))!.map(stat => [stat.key, stat]));
const column = async (storePath: string, key: string) => (await careers(storePath)).get(key)?.rows.map(row => [row.name, row.figure]);

test('published careers give every person, current or replaced, one row of the results they earned', async () => {
  await published(await base(), async storePath => {
    const table = await careers(storePath);
    assert.deepEqual([...table.values()].map(stat => [stat.key, stat.label, stat.unit]).filter(([key]) => !['power-rating', 'one-year-change'].includes(key)), [
      ['titles', 'Titles', 'won'], ['finals-lost', 'Finals lost', 'finals'], ['record', 'Record', 'W–L–T'], ['win-rate', 'Win %', 'of games'], ['playoffs', 'Playoffs', 'trips'],
      ['points', 'PPG', 'points'], ['points-against', 'PPG against', 'points'], ['seasons', 'Seasons', 'years'],
    ]);
    const row = (name: string) => ['titles', 'finals-lost', 'record', 'win-rate', 'playoffs', 'points', 'points-against', 'seasons'].map(key => table.get(key)!.rows.find(row => row.name === name)!.figure);
    // Woody14's roster went to Timh17 and alecswartout's to sebastian12; neither career crosses over.
    assert.deepEqual(row('Woody14'), ['0', '0', '1–0', '100.0%', '1', '15.5', '9.5', '2019']);
    // 25.5 (an override) + 3 × 20 over four games; 24.25 + 3 × 40 against.
    assert.deepEqual(row('Timh17'), ['1', '0', '1–3', '25.0%', '1', '21.4', '36.1', '2020–2021']);
    // Won the 2019 final and lost the 2020 one.
    assert.deepEqual(row('alecswartout'), ['1', '1', '0–2', '0.0%', '2', '16.9', '20.5', '2019–2020']);
    assert.deepEqual(row('sebastian12'), ['0', '0', '3–0', '100.0%', '0', '40.0', '20.0', '2021']);
    // A tie is half a win, and a season away splits the years.
    assert.deepEqual(row('Manager 1'), ['0', '1', '0–3–1', '12.5%', '1', '10.1', '25.1', '2019, 2021']);
    assert.deepEqual(table.get('titles')!.rows.map(row => [row.name, row.current, row.rank]), [
      ['alecswartout', false, 1], ['Timh17', true, 1], ['Manager 1', true, 3], ['Manager 2', true, 3], ['Manager 3', false, 3], ['Manager 4', false, 3], ['sebastian12', true, 3], ['Woody14', false, 3],
    ]);
    // More wins rank first, however many losses came with them, and fewer points against do.
    assert.deepEqual(table.get('record')!.rows.slice(0, 3).map(row => [row.name, row.figure, row.rank]), [['Manager 2', '3–0–1', 1], ['sebastian12', '3–0', 1], ['Manager 4', '1–0', 3]]);
    assert.deepEqual(table.get('points-against')!.rows.slice(0, 2).map(row => [row.name, row.figure]), [['Manager 4', '0.0'], ['Manager 3', '8.0']]);
    assert.deepEqual(table.get('playoffs')!.rows.slice(0, 2).map(row => [row.name, row.figure, row.unit]), [['alecswartout', '2', 'trips'], ['Manager 1', '1', 'trip']]);
  });
});

test('published power ratings start at 1500, move by 24 in historical order and rank by the whole number shown', async () => {
  await published(seasonsSource(
    // Even games move 12: M1 1524, M3 1500, M2 and M4 1488 and tied.
    { weeks: [[[1, 2, 100, 90], [3, 4, 100, 90]], [[1, 3, 100, 90], [2, 4, 80, 80]]] },
    // M5 takes M2's roster at 1500 and beats M1 (24 × 0.5345 = 12.83); M4 beats M3 (24 × 0.5173 = 12.41). The playoff final moves nothing.
    { ...titled([[[2, 1, 100, 90], [4, 3, 100, 90]], [[3, 4, 100, 90]]], 3, 4), owners: [1, 5, 3, 4] },
  ), async storePath => {
    const { label, unit, rows } = (await careers(storePath)).get('power-rating')!;
    assert.deepEqual([label, unit], ['Power rating', 'rating points']);
    // M3's 1487.59 and M2's 1488 both show 1,488, so they tie. M2, gone since 2021, stays, marked.
    assert.deepEqual(rows.map(row => [row.name, row.figure, row.rank, row.current]),
      [['M5', '1,513', 1, true], ['M1', '1,511', 2, true], ['M4', '1,500', 3, true], ['M2', '1,488', 4, false], ['M3', '1,488', 4, true]]);
  });
});

test('published power ratings use the ratings from before a week for every game in it', async () => {
  // M1 runs two rosters and loses both games each week: −12 and −12, then −10.76 twice from 1476. Updating between games would show 1,455.
  const source = seasonsSource({ owners: [1, 1, 3, 4], live: true, weeks: [[[1, 3, 90, 100], [2, 4, 90, 100]], [[1, 3, 90, 100], [2, 4, 90, 100]]] });
  (source.responses[`league/${source.seedLeagueId}/users`] as any[]).splice(1, 1);
  await published(source, async storePath => assert.deepEqual(await column(storePath, 'power-rating'), [['M3', '1,523'], ['M4', '1,523'], ['M1', '1,454']]));
});

/** A season after one regular week whose final and third-place game finish the rosters in this order. An unresolved final has no winner yet. */
const placed = ([first, second, third, fourth]: number[], { unresolved, ...year }: Partial<Year> & { unresolved?: boolean } = {}): Year => ({
  weeks: [[[1, 2, 100, 90], [3, 4, 100, 90]], [[first, second, 100, 90], [third, fourth, 100, 90]]],
  playoffs: { start: 2, bracket: [{ ...final(first, second), ...unresolved && { w: null, l: null } }, { r: 1, m: 2, t1: third, t2: fourth, w: third, l: fourth, p: 3 }] }, ...year });
const finishes = [
  placed([1, 2, 3, 4]),
  placed([4, 1, 3, 2], { owners: [1, 2, 5, 4] }),
  placed([3, 4, 1, 2]),
  placed([1, 2, 3, 4], { unresolved: true }),
  placed([4, 1, 2, 3], { live: true, weeks: [[[1, 2, 100, 90], [3, 4, 100, 90]]] }),
];

test('published one-year changes compare a person’s consecutive finished seasons and skip a gap or an unresolved finish', async () => {
  await published(seasonsSource(...finishes), async storePath => {
    const { label, rows } = (await careers(storePath)).get('one-year-change')!;
    assert.equal(label, 'Biggest swing');
    assert.deepEqual(rows.map(row => [row.name, row.figure, row.unit, row.sample!.replaceAll('\u00a0', ' '), row.rank]), [
      ['M4', '3', 'places', '4th to 1st in 2022', 1],
      ['M2', '2', 'places', '2nd to 4th in 2022', 2],
      // 3rd in 2021 and 1st in 2023 with 2022 away is no one-year change.
      ['M3', '2', 'places', '1st to 3rd in 2024', 2],
      // Two equal moves show the later one and count the other, and the unresolved 2024 final leaves a third unknown.
      ['M1', '1', 'place', '2nd to 3rd in 2023, 1 more', 4],
    ]);
  });
  // One finished season is no change, so M5 above is unknown, and in a first season so is everyone.
  await published(seasonsSource(placed([1, 2, 3, 4])), async storePath => assert.equal(await column(storePath, 'one-year-change'), undefined));
});

test('published counts of titles, finals and playoffs stand alone, with no sample beside them', async () => {
  const samples = async (storePath: string, key: string) => (await careers(storePath)).get(key)!.rows.map(row => [row.name, row.sample]).sort(([a], [b]) => String(a).localeCompare(String(b)));
  await published(seasonsSource(...finishes), async storePath => {
    const everyone = [['M1', undefined], ['M2', undefined], ['M3', undefined], ['M4', undefined], ['M5', undefined]];
    assert.deepEqual(await samples(storePath, 'titles'), everyone);
    assert.deepEqual(await samples(storePath, 'finals-lost'), everyone);
    assert.deepEqual(await samples(storePath, 'playoffs'), everyone);
  });
});

test('published finals lost count resolved finals alone, and the most without a title is a record', async () => {
  const bridesmaids = async (storePath: string) => (await readCategory('bridesmaid', { storePath }))!.rows.map(row => [row.rank, row.name, row.value]);
  await published(seasonsSource(...finishes), async storePath => {
    assert.deepEqual(await column(storePath, 'titles'), [['M1', '1'], ['M3', '1'], ['M4', '1'], ['M2', '0'], ['M5', '0']]);
    // M2 is in the unresolved 2024 final, which counts for nobody.
    assert.deepEqual(await column(storePath, 'finals-lost'), [['M1', '1'], ['M2', '1'], ['M4', '1'], ['M3', '0'], ['M5', '0']]);
    // M1 and M4 have each lost one too, and have a title.
    assert.deepEqual(await bridesmaids(storePath), [[1, 'M2', 1]]);
    assert.ok((await readPlaceRecords(['legacy'], { storePath }))!.some(view => view.category.key === 'bridesmaid'));
  });
  // Two losses to one, and the 2023 champion's loss in 2021 no longer counts.
  await published(seasonsSource(placed([1, 2, 3, 4]), placed([1, 3, 2, 4]), placed([2, 3, 1, 4]), placed([1, 4, 2, 3])), async storePath => {
    assert.deepEqual(await bridesmaids(storePath), [[1, 'M3', 2], [2, 'M4', 1]]);
    const [row] = (await readCategory('bridesmaid', { storePath }))!.rows;
    assert.deepEqual([row.leaderContext, row.period], ['2022, 2023', { year: '2023', week: 2, playedAt: null }]);
  });
  await published(seasonsSource(placed([1, 2, 3, 4], { unresolved: true })), async storePath => {
    assert.equal(await column(storePath, 'titles'), undefined, 'a league with no resolved title has none to count');
    assert.equal(await column(storePath, 'finals-lost'), undefined, 'and no finals to have lost');
    assert.deepEqual(await bridesmaids(storePath), []);
  });
});

test('published most dominant season leaves Legacy, and its holder’s records, when it is Home’s headline team-season', async () => {
  const season = (first: number, third: number, unresolved = false) => seasonsSource({ ...placed([1, 2, 3, 4], { unresolved }), weeks: [[[1, 2, first, 90], [3, 4, third, 80]], [[1, 2, 100, 90], [3, 4, 100, 90]]] });
  const dominant = (source: ReturnType<typeof seasonsSource>) => published(source, async storePath => {
    const leaders = (await readCategory('dominant-season', { storePath }))!.leaders;
    const card = (await readPlaceRecords(['legacy'], { storePath }))!.find(view => view.category.key === 'dominant-season');
    // Which of the two records each leader's own page lists.
    const shelves = await Promise.all(leaders.map(async row => (await readRecordsHeld(row.personId!, { storePath }))!.map(view => view.category.key).filter(key => ['dominant-season', 'best-without-title'].includes(key))));
    return { held: leaders.map(row => row.name), card: card?.leaders.map(row => row.name), shelves };
  });
  // M1 wins the title each time. M3 outscoring everyone without it is already Home's headline.
  assert.deepEqual(await dominant(season(100, 200)), { held: ['M3'], card: undefined, shelves: [['best-without-title']] });
  assert.deepEqual(await dominant(season(200, 100)), { held: ['M1'], card: ['M1'], shelves: [['dominant-season']] });
  assert.deepEqual(await dominant(season(200, 200)), { held: ['M1', 'M3'], card: ['M1', 'M3'], shelves: [['dominant-season'], ['best-without-title']] }, 'Home names only one of the two');
  assert.deepEqual(await dominant(season(100, 200, true)), { held: ['M3'], card: ['M3'], shelves: [['dominant-season']] }, 'an unresolved title leaves Home no headline');
});
