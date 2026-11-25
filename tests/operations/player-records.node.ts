import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishControlledHistory as publish, withHistory } from '../support/history.ts';
import { aftermathSource, withEarlierSeason } from '../fixtures/aftermath-source.ts';
import { readManagerStats } from '../../src/history/manager-stats.ts';
import { readCategory, readHome, readRecordsHeld } from '../../src/history/records.ts';

/** Managers 1 to 4 always score 100, 90, 80 and 70, so a pairing settles its winner. */
const week = (pairs: string, starts: Record<number, Record<string, number>>) => ({ pairs, starts });
const games = (source: { seedLeagueId: string; responses: Record<string, unknown> }, number: number) => source.responses[`league/${source.seedLeagueId}/matchups/${number}`] as any[];
/** Each player's rank, record and win percentage. */
const records = async (storePath: string, key: string) => (await readCategory(key, { storePath }))!.rows.map(row => [row.rank, row.name, row.shown, row.leaderContext]);

/** Manager 1 wins every week, so player 6 is 6–0, player 5 is 5–1 and player 0 is 0–6. */
const sevenRecords = Array.from({ length: 6 }, (_, index) => {
  const started = (won: boolean) => Object.fromEntries(Array.from({ length: 7 }, (_, wins) => [`P${wins}`, 1] as const).filter((_, wins) => wins > index === won));
  return week('12 34', { 1: started(true), 2: started(false) });
});

test('published charms and curses are the three best and three worst team records, whoever started the player', async () => {
  await withHistory(async storePath => {
    await publish(storePath, aftermathSource(sevenRecords, []));
    assert.deepEqual(await records(storePath, 'lucky-charms'), [[1, 'Player P6', '6–0', '100.0% of games won'], [2, 'Player P5', '5–1', '83.3% of games won'], [3, 'Player P4', '4–2', '66.7% of games won']]);
    assert.deepEqual(await records(storePath, 'curses'), [[1, 'Player P0', '0–6', '0.0% of games won'], [2, 'Player P1', '1–5', '16.7% of games won'], [3, 'Player P2', '2–4', '33.3% of games won']]);
    const leader = (await readCategory('lucky-charms', { storePath }))!.leaders[0];
    assert.deepEqual([leader.manager, leader.period], [undefined, null], 'a player holds it, not a manager');
  });
});

/** Manager 1 goes 5–0, manager 2 goes 3–2, manager 3 goes 2–3 and manager 4 goes 0–5. Player E starts for manager 1, then for manager 4. */
const fiveWeeks = ['12 34', '13 24', '14 23', '12 34', '13 24'].map((pairs, index) =>
  week(pairs, { 1: { A: 1, ...index < 2 && { E: 1 }, ...index < 4 && { F: 1 } }, 2: { B: 1 }, 3: { C: 1 }, 4: { D: 1, ...index >= 2 && { E: 1 } } }));

test('published charms and curses wait for five starts in every season, and keep ties together', async () => {
  await withHistory(async storePath => {
    await publish(storePath, aftermathSource(fiveWeeks.slice(0, 4), []));
    assert.deepEqual(await records(storePath, 'lucky-charms'), [], 'four weeks are too few');
    assert.deepEqual(await records(storePath, 'curses'), []);
  });
  await withHistory(async storePath => {
    const source = aftermathSource(fiveWeeks, []);
    await publish(storePath, source);
    // Player F won all four of his starts, one short.
    assert.deepEqual(await records(storePath, 'lucky-charms'), [[1, 'Player A', '5–0', '100.0% of games won'], [2, 'Player B', '3–2', '60.0% of games won']]);
    assert.deepEqual(await records(storePath, 'curses'), [[1, 'Player D', '0–5', '0.0% of games won'], [2, 'Player C', '2–3', '40.0% of games won'], [2, 'Player E', '2–3', '40.0% of games won']]);
    // An override ties managers 1 and 3 in week 5: players A and C have four decided starts left, and player E is in the middle of three.
    games(source, 5)[2].custom_points = 100;
    await publish(storePath, source);
    assert.deepEqual(await records(storePath, 'lucky-charms'), [[1, 'Player B', '3–2', '60.0% of games won']]);
    assert.deepEqual(await records(storePath, 'curses'), [[1, 'Player D', '0–5', '0.0% of games won']]);
  });
  await withHistory(async storePath => {
    const alike = week('12 34', { 1: { A: 1 }, 3: { B: 1 } });
    await publish(storePath, aftermathSource([alike, alike, alike, alike, alike], []));
    assert.deepEqual([await records(storePath, 'lucky-charms'), await records(storePath, 'curses')], [[], []], 'nobody is best when everyone ties');
  });
});

test('published charms and curses add up a player’s teams across seasons and managers', async () => {
  await withHistory(async storePath => {
    // Manager 5 ran roster 1 in the first season. A second season asks for ten starts.
    await publish(storePath, withEarlierSeason(aftermathSource(fiveWeeks.map(({ pairs, starts }) => week(pairs, { ...starts, 2: { B2: 1 } })), []), aftermathSource(fiveWeeks, [])));
    assert.deepEqual(await records(storePath, 'lucky-charms'), [[1, 'Player A', '10–0', '100.0% of games won']]);
    assert.deepEqual(await records(storePath, 'curses'), [[1, 'Player D', '0–10', '0.0% of games won']]);
  });
});

test('published one-man army is a starter’s share of the official team score, and a score of zero or below has none', async () => {
  await withHistory(async storePath => {
    const source = aftermathSource([
      // Manager 2 scored 90. Player C's 50 of manager 3's 80 and player D's 100 don't count once the overrides below apply.
      week('12 34', { 1: { A: 60 }, 2: { B: 45, Z: 0 }, 3: { C: 50 }, 4: { D: 100 } }),
      week('13 24', { 1: { A: 25 }, 2: { B: 20.25 } }),
    ], []);
    games(source, 1)[2].custom_points = 125;
    games(source, 1)[3].custom_points = 0;
    games(source, 2)[0].custom_points = -5;
    await publish(storePath, source);
    const army = (await readCategory('one-man-army', { storePath }))!;
    assert.deepEqual(army.rows.map(row => [row.rank, row.manager, row.name, row.value, row.leaderContext, row.opponent, row.period]), [
      [1, 'Record manager 01', 'Player A', 60, 'Record manager 01 · Week 1 · 2021 · 60.00 of 100.00 points', 'Record manager 02', { year: '2021', week: 1, playedAt: null }],
      [2, 'Record manager 02', 'Player B', 50, 'Record manager 02 · Week 1 · 2021 · 45.00 of 90.00 points', 'Record manager 01', { year: '2021', week: 1, playedAt: null }],
      [3, 'Record manager 03', 'Player C', 40, 'Record manager 03 · Week 1 · 2021 · 50.00 of 125.00 points', 'Record manager 04', { year: '2021', week: 1, playedAt: null }],
      [4, 'Record manager 02', 'Player B', 22.5, 'Record manager 02 · Week 2 · 2021 · 20.25 of 90.00 points', 'Record manager 04', { year: '2021', week: 2, playedAt: null }],
      [5, 'Record manager 02', 'Player Z', 0, 'Record manager 02 · Week 1 · 2021 · 0.00 of 90.00 points', 'Record manager 01', { year: '2021', week: 1, playedAt: null }],
    ]);
    assert.ok((await readRecordsHeld('person-960000000000000001', { storePath }))!.some(view => view.category.key === 'one-man-army'));
  });
  await withHistory(async storePath => {
    const source = aftermathSource([week('12 34', { 1: { A: 60 } })], []);
    games(source, 1)[0].custom_points = 0;
    await publish(storePath, source);
    assert.deepEqual((await readCategory('one-man-army', { storePath }))!.rows, []);
  });
});

test('published one-man army adds a decimal to tell apart the shares its ranking shows, not thousands below them', async () => {
  await withHistory(async storePath => {
    const shares = (points: number[]) => aftermathSource([week('12 34', { 1: Object.fromEntries(points.map((points, index) => [`P${index}`, points])) })], []);
    const precision = async () => (await readCategory('one-man-army', { storePath }))!.category.displayPrecision;
    await publish(storePath, shares([20, 15, 10, 9, 8, 7, 6, 5, 4, 3, 2.01, 2.02]));
    assert.equal(await precision(), 1);
    assert.equal((await readCategory('one-man-army', { storePath, limit: 20 }))!.category.displayPrecision, 2);
    await publish(storePath, shares([20.01, 20.02, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]));
    assert.equal(await precision(), 2);
  });
});

test('published journeyman counts the people who rostered a player in a regular-season week, without team defenses', async () => {
  await withHistory(async storePath => {
    // Player B sat on manager 2's bench, and never scored. Team defense D and player C get around too. Player E never moved.
    const present = aftermathSource([
      { ...week('12 34', { 1: { A: 10, D: 5 }, 3: { E: 0 } }), bench: { 2: { B: 0 } } },
      { ...week('12 34', { 2: { A: 10, D: 5 }, 3: { E: 0, C: 1 } }), bench: { 1: { B: 0 } } },
      week('12 34', { 1: { A: 10 }, 3: { D: 5 }, 4: { B: 0 } }),
    ], []);
    // Manager 5 ran roster 1 the season before, so its player A counts again. The same manager's second week doesn't.
    const past = aftermathSource([week('12 34', { 1: { A: 10 }, 4: { C: 1 } }), week('12 34', { 1: { A: 10 }, 4: { D: 5 } })], []);
    const source = withEarlierSeason(present, past);
    (source.responses['players/nfl'] as any).D.position = 'DEF';
    await publish(storePath, source);
    const journeyman = (await readCategory('journeyman', { storePath }))!;
    assert.deepEqual(journeyman.rows.map(row => [row.rank, row.name, row.value, row.manager, row.period]), [
      [1, 'Player A', 3, undefined, null], [1, 'Player B', 3, undefined, null], [3, 'Player C', 2, undefined, null],
    ]);
    assert.ok((await readHome({ storePath }))!.recent.every(row => row.personId), 'a player holds it, not a manager');
  });
});

/** Each manager's short name, answers, figure with its unit, chances and rank, best first. */
const stat = async (storePath: string, key: string) => (await readManagerStats({ storePath, places: ['players'] }))!.find(stat => stat.key === key)?.rows
  .map(row => [row.name.slice(-2), row.names, `${row.figure} ${row.unit}`, row.sample, row.rank]);

test('published most-started players list every tie, count an actual zero and keep a replaced manager’s starts', async () => {
  await withHistory(async storePath => {
    await publish(storePath, withEarlierSeason(aftermathSource([
      // Manager 2 left a slot empty three times. Manager 1 started A once and B twice, once for zero.
      { ...week('12 34', { 1: { A: 10, B: 0 }, 2: { C: 5, 0: 0 } }), bench: { 2: { E: 9 } } },
      { ...week('13 24', { 1: { B: 4 }, 2: { D: 5, 0: 0 } }), bench: { 2: { E: 9 } } },
      { ...week('14 23', { 2: { D: 5, C: 1, 0: 0 }, 3: { C: 2 } }), bench: { 2: { E: 9 } } },
    ], []), aftermathSource([
      // The season before, manager 5 started A three times on the roster manager 1 took over.
      week('12 34', { 1: { A: 10 } }), week('13 24', { 1: { A: 10 } }), week('14 23', { 1: { A: 10 } }),
    ], [])));
    assert.deepEqual(await stat(storePath, 'most-started'), [
      ['05', ['Player A'], '3 starts', 'of 3 weeks', 1],
      ['01', ['Player B'], '2 starts', 'of 3 weeks', 2],
      ['02', ['Player C', 'Player D'], '2 starts each', 'of 6 weeks', 2],
      ['03', ['Player C'], '1 start', 'of 6 weeks', 4],
    ]);
  });
});

test('published scored-most-against adds up an opponent’s starters exactly, ties and all, for the person who faced them', async () => {
  await withHistory(async storePath => {
    await publish(storePath, withEarlierSeason(aftermathSource([
      // Manager 1 faces A twice for different managers, 0.1 and 0.2, level with C's 0.3. Manager 2 faces only a zero.
      { ...week('12 34', { 1: { E: 0 }, 2: { A: 0.1 }, 3: { B: 12.5 } }), bench: { 2: { D: 90 } } },
      week('13 24', { 3: { A: 0.2, C: 0.3 } }),
    ], []), aftermathSource([
      // The season before, manager 5 faced A on the roster manager 1 took over.
      week('12 34', { 2: { A: 30.25 } }), week('12 34', { 2: { A: 30.25 } }),
    ], [])));
    assert.deepEqual(await stat(storePath, 'scored-most-against'), [
      ['05', ['Player A'], '60.50 points', 'in 2 weeks', 1],
      ['04', ['Player B'], '12.50 points', 'in 4 weeks', 2],
      ['01', ['Player A', 'Player C'], '0.30 points each', 'in 2 weeks', 3],
      ['02', ['Player E'], '0.00 points', 'in 4 weeks', 4],
    ]);
    const stats = (await readManagerStats({ storePath, places: ['players'] }))!;
    assert.deepEqual(stats.map(stat => [stat.label, stat.unit]), [['Most-started player', 'starts'], ['Scored most against them', 'points']]);
  });
});
