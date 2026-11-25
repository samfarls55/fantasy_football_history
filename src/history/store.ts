import { AsyncLocalStorage } from 'node:async_hooks';
import { resolve } from 'node:path';
import { publish, readPublished } from './files.ts';
import type { Archive } from './types.ts';

function assertArchive(value: unknown): asserts value is Archive {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The history candidate must be an archive object.');
  }
  const archive = value as Record<string, unknown>;
  if (archive.version !== 2 || typeof archive.leagueId !== 'string' || !archive.leagueId.trim() ||
      typeof archive.importedAt !== 'string' || !Number.isFinite(Date.parse(archive.importedAt))) {
    throw new Error('The history candidate needs schema version 2, a string league ID and an import date.');
  }
  for (const field of ['seasons', 'people', 'franchises', 'contests', 'performances', 'players', 'transactions', 'drafts', 'coverage']) {
    if (!Array.isArray(archive[field])) throw new Error(`The history candidate is missing its ${field} collection.`);
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

/** Read each publication afresh so a refresh never requires a server restart. A version 1 archive counts as missing. */
export async function loadArchive(storePath?: string): Promise<Archive | null> {
  const contents = await readPublished(configuredStorePath(storePath));
  if (contents === null) return null;
  const archive: unknown = JSON.parse(contents);
  if ((archive as { version?: unknown } | null)?.version === 1) return null;
  assertArchive(archive);
  return archive;
}

/** Each visitor request reads the one archive it was given, even if a refresh finishes mid-request. */
const snapshots = new AsyncLocalStorage<{ storePath: string; archive: Archive | null }>();

export function withHistorySnapshot<T>(archive: Archive | null, read: () => Promise<T>, storePath?: string): Promise<T> {
  return snapshots.run({ storePath: configuredStorePath(storePath), archive }, read);
}

/** Visitor reads share their request snapshot; refreshes always read the durable publication. */
export async function readArchive(storePath?: string): Promise<Archive | null> {
  const snapshot = snapshots.getStore();
  return snapshot?.storePath === configuredStorePath(storePath) ? snapshot.archive : loadArchive(storePath);
}

/** Publish one complete snapshot. Readers see either the old one or the new one. */
export async function publishArchive(archive: Archive, storePath?: string, previous?: Archive | null): Promise<void> {
  assertArchive(archive);
  const path = configuredStorePath(storePath);
  if (previous === undefined) previous = await loadArchive(path);
  if (previous && previous.leagueId !== archive.leagueId) {
    throw new Error('The published archive belongs to another league. Configure a separate store path for the new league.');
  }
  await publish(path, `${JSON.stringify(archive)}\n`);
}
