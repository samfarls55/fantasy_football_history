import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { refresh } from '../../src/history/refresh.ts';

interface ControlledHistorySource {
  seedLeagueId: string;
  responses: Record<string, unknown>;
}

/** Replay controlled responses through the real refresh and durable publication. */
export function publishControlledHistory(storePath: string, source: ControlledHistorySource, now = '2026-11-03T12:00:00Z') {
  return refresh({ storePath, leagueId: source.seedLeagueId, now: new Date(now), provider: {
    async get(path) {
      if (!(path in source.responses)) throw new Error(`Missing controlled response: ${path}`);
      return structuredClone(source.responses[path]);
    },
  } });
}

/** Runs with a store of its own that nothing has been published to. */
export async function withHistory(run: (storePath: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'history-'));
  try { await run(join(directory, 'history.json')); } finally { await rm(directory, { recursive: true, force: true }); }
}
