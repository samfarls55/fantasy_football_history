import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-franchises-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
async function fixture() {
  return JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8'));
}

test('published franchise history retains both replacement owners without assigning their careers to each other', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    source.responses['league/900000000000002020/rosters'][0].metadata = { team_name: 'Harbor Crew' };
    source.responses['league/900000000000002021/rosters'][2].metadata = { team_name: 'Buccaneers' };
    await publish(storePath, source);
    const { readFranchises, readFranchise } = await import('../../src/history/franchises.ts');
    const { readManager } = await import('../../src/history/managers.ts');
    const franchise = await readFranchise('franchise-7', { storePath });
    assert.equal(franchise?.name, 'Buccaneers');
    assert.equal(franchise?.owner.name, 'Timh17');
    assert.deepEqual(franchise?.seasons.map(row => [row.year, row.owner.name, row.name]), [
      ['2021', 'Timh17', 'Buccaneers'], ['2020', 'Timh17', 'Harbor Crew'], ['2019', 'Woody14', 'Woody14'],
    ]);
    assert.equal(franchise?.facts.record, '2–3');
    assert.equal(franchise?.facts.games, 5);
    assert.equal(franchise?.facts.points, 101);
    assert.equal(franchise?.facts.championships, 1);
    assert.deepEqual(franchise?.tenures.map(tenure => [tenure.owner.name, tenure.range]), [['Woody14', '2019'], ['Timh17', '2020–2021']]);
    assert.equal(franchise?.tenures[1].events[0].predecessor?.name, 'Woody14');
    assert.ok(franchise?.tenures[1].events.some(event => event.label === 'Played as Buccaneers'));
    assert.equal((await readManager('person-608473907007143936', { storePath }))?.facts.record, '1–3');
    assert.equal((await readManager('person-472580465006473216', { storePath }))?.facts.record, '1–0');
    assert.equal((await readFranchises({ storePath }))?.length, 6);
    const returning = await readFranchise('franchise-1', { storePath });
    assert.equal(returning?.range, '2019, 2021');
    assert.deepEqual(returning?.tenures.map(tenure => tenure.range), ['2019', '2021']);
    assert.equal(returning?.tenures[1].events[0].predecessor, null);
    assert.equal(returning?.tenures[1].events[0].label, 'Next season in the archive');
    assert.deepEqual((await readFranchise('franchise-10', { storePath }))?.seasons.map(row => row.owner.name), ['sebastian12', 'alecswartout', 'alecswartout']);
    assert.equal(await readFranchise('missing', { storePath }), null);
  });
});

test('a franchise season retains its actual owner, official game links, selected scope and resolved finish', async () => {
  await withHistory(async storePath => {
    await publish(storePath, await fixture());
    const { readFranchiseSeason } = await import('../../src/history/franchises.ts');
    const season = await readFranchiseSeason('franchise-7', '2020', { storePath, scope: 'combined', sort: 'oldest' });
    assert.equal(season?.seasonOwner.name, 'Timh17');
    assert.equal(season?.facts.record, '2–0');
    assert.equal(season?.facts.points, 56);
    assert.equal(season?.team.finish, 1);
    assert.equal(season?.team.playoffSeed, null);
    assert.equal(season?.games[0].opponent.name, 'alecswartout');
    assert.equal(season?.games[0].href, '/seasons/2020/matchups/900000000000002020-w1-m1/?scope=combined&week=1');
    assert.equal((await readFranchiseSeason('franchise-7', '2019', { storePath }))?.seasonOwner.name, 'Woody14');
    assert.equal((await readFranchiseSeason('franchise-7', '2021', { storePath }))?.team.finish, null);
    assert.equal(await readFranchiseSeason('franchise-7', '2018', { storePath }), null);
  });
});

test('a missing display field retains known identity while unknown ownership preserves the last published franchise', async () => {
  await withHistory(async storePath => {
    const source = await fixture();
    await publish(storePath, source);
    const { readFranchise } = await import('../../src/history/franchises.ts');
    source.responses['league/900000000000002021/users'][2].display_name = null;
    await publish(storePath, source);
    const retained = await readFranchise('franchise-7', { storePath });
    assert.equal(retained?.owner.name, 'Timh17');
    assert.equal(retained?.owner.current, true);
    assert.equal(retained?.name, 'Timh17');
    assert.deepEqual(retained?.tenures.map(tenure => tenure.owner.name), ['Woody14', 'Timh17']);
    source.responses['league/900000000000002021/rosters'][2].owner_id = null;
    await assert.rejects(publish(storePath, source), /owner_id/);
    assert.deepEqual(await readFranchise('franchise-7', { storePath }), retained);
  });
});
