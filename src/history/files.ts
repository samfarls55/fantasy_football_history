import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { promisify } from 'node:util';
import { gunzip, gzip } from 'node:zlib';

// Archives and the player list live on disk, or in a private Vercel Blob store when its credential is present.
// Blob is loaded only where it is used, so local development and tests never need it.
const shared = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
// Production and previews use one store; each environment keeps its own copies.
const pathname = (path: string) => `${process.env.VERCEL_ENV}/${basename(path)}.gz`;

/** A published file's contents, or null when it is missing or was written longer ago than the maximum age. */
export async function readPublished(path: string, maxAge = Infinity): Promise<string | null> {
  if (shared()) {
    const { get } = await import('@vercel/blob');
    // A cached read can return the previous publication for a minute, which would import the league again.
    const found = await get(pathname(path), { access: 'private', useCache: false });
    if (!found?.stream) return null;
    if (Date.now() - found.blob.uploadedAt.getTime() >= maxAge) {
      await found.stream.cancel();
      return null;
    }
    return (await promisify(gunzip)(await new Response(found.stream).arrayBuffer())).toString();
  }
  try {
    if (Date.now() - (await stat(path)).mtimeMs >= maxAge) return null;
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Replace a file whole. Readers see either the old contents or the new contents. */
export async function publish(path: string, contents: string): Promise<void> {
  if (shared()) {
    const { put } = await import('@vercel/blob');
    await put(pathname(path), await promisify(gzip)(contents), { access: 'private', allowOverwrite: true });
    return;
  }
  const directory = dirname(path);
  const temporaryPath = `${path}.tmp-${process.pid}-${randomUUID()}`;
  await mkdir(directory, { recursive: true });
  try {
    const file = await open(temporaryPath, 'wx', 0o600);
    try {
      await file.writeFile(contents, 'utf8');
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporaryPath, path);
    // Windows rejects fsync on a directory handle; NTFS journals the rename itself.
    if (process.platform !== 'win32') {
      const parent = await open(directory, 'r');
      try {
        await parent.sync();
      } finally {
        await parent.close();
      }
    }
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}
