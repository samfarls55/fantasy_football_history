import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

// Everything here that asks for Vercel Blob gets the stand-in, so no test reaches the network.
registerHooks({ resolve: (specifier, context, next) => specifier === '@vercel/blob'
  ? { url: new URL('./blob.ts', import.meta.url).href, shortCircuit: true } : next(specifier, context) });

type Run = (storePath: string) => Promise<void>;

export async function fileStore(run: Run) {
  const directory = await mkdtemp(join(tmpdir(), 'file-store-'));
  try { await run(join(directory, 'durable', 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}

/** Runs with Blob credentials present, and checks that nothing was kept on this instance's disk. */
export async function sharedStore(run: Run) {
  const directory = await mkdtemp(join(tmpdir(), 'shared-store-'));
  Object.assign(process.env, { BLOB_READ_WRITE_TOKEN: 'controlled', VERCEL_ENV: 'preview', BLOB_STAND_IN: join(directory, 'blob') });
  try {
    await run(join(directory, 'disk', 'history.json'));
    assert.deepEqual(await readdir(directory), ['blob']);
  } finally {
    for (const name of ['BLOB_READ_WRITE_TOKEN', 'VERCEL_ENV', 'BLOB_STAND_IN']) delete process.env[name];
    await rm(directory, { recursive: true, force: true });
  }
}

/** Every publication test runs against both. */
export const stores = [fileStore, sharedStore];

const shared = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const kept = (storePath: string) => shared() ? join(process.env.BLOB_STAND_IN!, encodeURIComponent(`preview/${basename(storePath)}.gz`)) : storePath;

export async function seed(storePath: string, contents: string) {
  await mkdir(dirname(kept(storePath)), { recursive: true });
  await writeFile(kept(storePath), shared() ? gzipSync(contents) : contents);
}
export async function stored(storePath: string): Promise<string> {
  const contents = await readFile(kept(storePath));
  return (shared() ? gunzipSync(contents) : contents).toString();
}
export async function age(storePath: string, hours: number) {
  const then = new Date(Date.now() - hours * 60 * 60 * 1000);
  await utimes(kept(storePath), then, then);
}
