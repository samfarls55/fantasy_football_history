import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Archive } from './types.ts';

function assertArchive(value: unknown): asserts value is Archive {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The history candidate must be an archive object.');
  }
  const archive = value as Record<string, unknown>;
  if (archive.version !== 1 || typeof archive.leagueId !== 'string' || !archive.leagueId.trim() ||
      typeof archive.importedAt !== 'string' || !Number.isFinite(Date.parse(archive.importedAt))) {
    throw new Error('The history candidate needs schema version 1, a string league ID and an import date.');
  }
  for (const field of ['seasons', 'people', 'franchises', 'contests', 'performances', 'players', 'transactions', 'drafts', 'coverage']) {
    if (!Array.isArray(archive[field])) throw new Error(`The history candidate is missing its ${field} collection.`);
  }
  if (!archive.source || typeof archive.source !== 'object' || Array.isArray(archive.source)) {
    throw new Error('The history candidate is missing its source object.');
  }
  for (const season of archive.seasons as unknown[]) {
    if (!season || typeof season !== 'object' ||
        !['id', 'year', 'name'].every(field => typeof (season as Record<string, unknown>)[field] === 'string')) {
      throw new Error('Every published season needs a string ID, year and name.');
    }
  }
}

/** Runtime configuration is shared by the web process and the refresh command. */
export function configuredStorePath(storePath?: string): string {
  return resolve(storePath ?? process.env.MUSEUM_STORE_PATH ?? 'data/history.json');
}

/** Read each publication afresh so a refresh never requires a server restart. */
export async function loadArchive(storePath?: string): Promise<Archive | null> {
  try {
    const archive: unknown = JSON.parse(await readFile(configuredStorePath(storePath), 'utf8'));
    assertArchive(archive);
    return archive;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Publish one complete snapshot. Readers see either the old file or the new file. */
export async function publishArchive(archive: Archive, storePath?: string): Promise<void> {
  assertArchive(archive);
  const path = configuredStorePath(storePath);
  const previous = await loadArchive(path);
  if (previous && previous.leagueId !== archive.leagueId) {
    throw new Error('The published archive belongs to another league. Configure a separate store path for the new league.');
  }
  const directory = dirname(path);
  const temporaryPath = `${path}.tmp-${process.pid}-${randomUUID()}`;
  const contents = `${JSON.stringify(archive)}\n`;
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
    const parent = await open(directory, 'r');
    try {
      await parent.sync();
    } finally {
      await parent.close();
    }
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}
