import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const project = resolve(import.meta.dirname, '../..');

function publication(args: string[], storePath: string) {
  const result = spawnSync(process.execPath, ['scripts/history-publication.ts', ...args], {
    cwd: project,
    env: { ...process.env, MUSEUM_STORE_PATH: storePath },
    encoding: 'utf8',
  });
  return { ...result, output: result.stdout ? JSON.parse(result.stdout) : null };
}

// A prepared import candidate at the operator publication boundary. The provider
// import and calculation slices add their own fixtures to the confirmed seam.
function candidate(name = 'Autumn league') {
  return {
    version: 1, leagueId: '9007199254740993123', importedAt: '2026-11-03T12:00:00.000Z',
    seasons: [{
      id: '9007199254740993123', year: '2026', name, previousLeagueId: null,
      complete: false, completedWeeks: [1], regularWeeks: [1], teams: [],
      scoring: {}, settings: {}, rosterPositions: [], championId: null,
      runnerUpId: null, playoffPersonIds: [], bracket: [],
    }],
    people: [], franchises: [], contests: [], performances: [], players: [],
    transactions: [], drafts: [], coverage: [], source: {},
  };
}

test('published history survives a new process and a correction replaces the visible season', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'museum-publication-'));
  try {
    const storePath = join(directory, 'durable', 'history.json');
    const inputPath = join(directory, 'candidate.json');
    await writeFile(inputPath, JSON.stringify(candidate()));
    const published = publication(['publish', inputPath], storePath);
    assert.equal(published.status, 0, published.stderr);
    const read = publication(['inspect'], storePath);
    assert.equal(read.status, 0, read.stderr);
    assert.deepEqual(read.output.seasons, [{ id: '9007199254740993123', year: '2026', name: 'Autumn league' }]);
    assert.equal(read.output.leagueId, '9007199254740993123');

    await writeFile(inputPath, JSON.stringify(candidate('Corrected league name')));
    const corrected = publication(['publish', inputPath], storePath);
    assert.equal(corrected.status, 0, corrected.stderr);
    const nextRead = publication(['inspect'], storePath);
    assert.deepEqual(nextRead.output.seasons, [{ id: '9007199254740993123', year: '2026', name: 'Corrected league name' }]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('an incomplete or corrupt candidate fails without replacing published history', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'museum-recovery-'));
  try {
    const storePath = join(directory, 'history.json');
    const inputPath = join(directory, 'candidate.json');
    await writeFile(inputPath, JSON.stringify(candidate()));
    assert.equal(publication(['publish', inputPath], storePath).status, 0);
    const previous = publication(['inspect'], storePath).output;

    for (const invalid of [JSON.stringify({ ...candidate(), contests: undefined }), '{broken json']) {
      await writeFile(inputPath, invalid);
      const failed = publication(['publish', inputPath], storePath);
      assert.equal(failed.status, 1);
      assert.match(failed.stderr, /History publication failed:/);
      const retained = publication(['inspect'], storePath);
      assert.equal(retained.status, 0, retained.stderr);
      assert.deepEqual(retained.output, previous);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
