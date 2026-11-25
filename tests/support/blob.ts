import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Stands in for @vercel/blob, with no network: a directory named by BLOB_STAND_IN, so child processes share it too.
// It keeps the rules of a private store that the site depends on, including reads that stay stale unless they skip the cache.
const cache = new Map<string, Buffer | null>();
const file = (pathname: string) => join(process.env.BLOB_STAND_IN!, encodeURIComponent(pathname));

function authorize(access: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('No blob credentials found.');
  if (access !== 'private') throw new Error('The store is private.');
}

export async function get(pathname: string, options: { access: string; useCache?: boolean }) {
  authorize(options.access);
  const path = file(pathname);
  const current = await readFile(path).catch(() => null);
  if (options.useCache !== false && !cache.has(path)) cache.set(path, current);
  const contents = options.useCache === false ? current : cache.get(path)!;
  return contents && { statusCode: 200, stream: new Response(new Uint8Array(contents)).body, blob: { uploadedAt: (await stat(path)).mtime } };
}

export async function put(pathname: string, body: Buffer, options: { access: string; allowOverwrite?: boolean }) {
  authorize(options.access);
  await mkdir(process.env.BLOB_STAND_IN!, { recursive: true });
  await writeFile(file(pathname), body, { flag: options.allowOverwrite ? 'w' : 'wx' });
}
