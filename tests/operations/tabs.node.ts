import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { pickupsSource } from '../fixtures/pickups-source.ts';
import { recordsSource } from '../fixtures/records-source.ts';
import { Exact } from '../../src/history/decimal.ts';
import { managerStats } from '../../src/history/manager-stats.ts';
import { readPlaceRecords, recordCategories } from '../../src/history/records.ts';
import { readTabs } from '../../src/history/tabs.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-tabs-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
const base = async () => JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
const shown = async (storePath: string) => (await readTabs({ storePath }))!.map(tab => [tab.name, ...tab.places]);

test('published tabs show only the ones this league has a stat for', async () => {
  await withHistory(async storePath => {
    assert.equal(await readTabs({ storePath }), null, 'unpublished history has no tabs');
    // Two weeks of a first season: no finished season, lineup, draft or move yet.
    await publish(storePath, recordsSource([[100, 90, 50, 50], [90, 100, 60, 40]]));
    assert.deepEqual(await shown(storePath), [['Home', 'home'], ['Legacy', 'legacy'], ['Games', 'games'], ['Excuses', 'luck']]);
  });
  await withHistory(async storePath => {
    await publish(storePath, pickupsSource(await base()));
    assert.deepEqual(await shown(storePath), [['Home', 'home'], ['Legacy', 'legacy'], ['Games', 'games'], ['Excuses', 'luck', 'lineups'], ['Players', 'players'], ['Moves', 'moves']]);
  });
});

test('published tabs leave out the half of Excuses with no stat, and gain a tab from a record registered later', async () => {
  await withHistory(async storePath => {
    // Two managers who tied their only game: a bench score to argue over, but no result to call lucky.
    const source = recordsSource([[90, 90]]);
    Object.assign((source.responses[`league/${source.seedLeagueId}/matchups/1`] as any[])[0], { players: ['7'], players_points: { 7: 12 } });
    await publish(storePath, source);
    assert.deepEqual(await shown(storePath), [['Home', 'home'], ['Legacy', 'legacy'], ['Games', 'games'], ['Excuses', 'lineups']]);
    recordCategories.push({ key: 'later-record', name: 'Later record', group: 'Players', place: 'draft', unit: 'points', displayPrecision: 0, rule: 'Added after the tabs.', scope: 'none',
      candidates: () => [{ id: 'later', personId: 'person-960000000000000002', name: 'Later player', avatar: null, metric: Exact.from(7), sample: null, period: null, href: '' }] });
    try {
      const draft = (await readTabs({ storePath }))!.at(-1)!;
      assert.deepEqual([draft.key, draft.name, draft.anchors], ['draft', 'Draft', ['later-record']]);
    } finally { recordCategories.pop(); }
    managerStats.push({ key: 'later-stat', place: 'moves', label: 'Later stat', unit: 'moves', displayPrecision: 0, rule: 'Added after the tabs.', better: 'higher',
      values: () => new Map([['person-960000000000000002', { value: Exact.from(0) }]]) });
    try {
      assert.deepEqual((await shown(storePath)).at(-1), ['Moves', 'moves'], 'a stat alone is enough, and a zero is a value');
    } finally { managerStats.pop(); }
  });
});

test('published tabs know which anchors from the one-page league moved to them', async () => {
  await withHistory(async storePath => {
    await publish(storePath, pickupsSource(await base()));
    const anchors = Object.fromEntries((await readTabs({ storePath }))!.map(tab => [tab.key, tab.anchors]));
    assert.deepEqual(anchors, {
      home: ['champions', 'records', 'best-without-title'], legacy: ['careers', 'rivalries'],
      games: ['highest-score', 'lowest-score', 'biggest-blowout', 'closest-game', 'winning-streak', 'losing-streak'],
      excuses: ['luckiest-season', 'unluckiest-season', 'points-in-win', 'points-in-loss', 'benched-player'], players: ['player-contributions'], moves: ['productive-pickup', 'productive-drop'],
    });
  });
});

test('published place records come in registry order without the ones nobody holds', async () => {
  await withHistory(async storePath => {
    await publish(storePath, recordsSource([[100, 90, 50, 50], [90, 100, 60, 40]]));
    const held = async (...places: Parameters<typeof readPlaceRecords>[0]) => (await readPlaceRecords(places, { storePath }))!.map(view => [view.category.key, view.leaders[0].value]);
    assert.deepEqual(await held('games'), [['highest-score', 100], ['lowest-score', 40], ['biggest-blowout', 20], ['closest-game', 0], ['winning-streak', 1], ['losing-streak', 1]]);
    assert.deepEqual(await held('luck'), [['points-in-win', 60], ['points-in-loss', 90]]);
    assert.deepEqual(await held('lineups', 'moves'), []);
  });
});
