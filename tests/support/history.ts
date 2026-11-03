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
