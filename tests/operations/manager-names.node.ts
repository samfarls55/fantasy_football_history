import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishControlledHistory as publish } from '../support/history.ts';
import { readManagerName } from '../../src/history/manager-names.ts';

async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'museum-manager-names-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('a published manager name opens current and former managers in any letter case, and a near miss offers the nearest name', async () => {
  await withHistory(async storePath => {
    const read = (name: string) => readManagerName(name, { storePath });
    assert.equal(await read('Timh17'), null, 'unpublished history has no managers');
    await publish(storePath, JSON.parse(await readFile(new URL('../fixtures/provider-history.json', import.meta.url), 'utf8')));
    assert.deepEqual(await read('Timh17'), { id: 'person-608473907007143936', suggestion: null });
    assert.deepEqual(await read('Woody14'), { id: 'person-472580465006473216', suggestion: null }, 'a replaced manager keeps a name');
    assert.deepEqual(await read('timH17'), { id: 'person-608473907007143936', suggestion: null });
    // One typo per four letters, and never fewer than one.
    assert.deepEqual(await read('Wody14'), { id: null, suggestion: 'Woody14' });
    assert.deepEqual(await read('sebastain12'), { id: null, suggestion: 'sebastian12' });
    assert.deepEqual(await read('Wdy1'), { id: null, suggestion: null }, 'three typos in four letters');
    // Three letters that start a name are enough.
    assert.deepEqual(await read('ale'), { id: null, suggestion: 'alecswartout' });
    assert.deepEqual(await read('al'), { id: null, suggestion: null });
    assert.deepEqual(await read('nobody here'), { id: null, suggestion: null });
  });
});
