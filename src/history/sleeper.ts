import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { sleeperProvider } from './refresh.ts';
import type { Provider } from './types.ts';

const playerCacheAge = 24 * 60 * 60 * 1000;
const concurrency = 10;

/**
 * A Sleeper provider for on-demand imports. Refresh asks for paths one at a time; this
 * starts every predictable path of each linked season as soon as its league loads, ten at a
 * time to respect Sleeper's rate limit, so refresh mostly reads finished responses. A path it
 * did not predict is fetched on request. The 14 MB player list is cached on disk for a day,
 * as Sleeper asks.
 */
export function sleeperImportProvider(playerCachePath: string, source: Provider = sleeperProvider): Provider {
  const responses = new Map<string, Promise<unknown>>();
  const queue: (() => void)[] = [];
  let active = 0;

  function fetchOnce(path: string): Promise<unknown> {
    let response = responses.get(path);
    if (!response) {
      response = new Promise<void>(resolve => { queue.push(resolve); drain(); })
        .then(() => source.get(path))
        .finally(() => { active--; drain(); });
      response.catch(() => undefined); // Surfaced when refresh asks for the path.
      responses.set(path, response);
    }
    return response;
  }
  function drain() {
    while (active < concurrency && queue.length) { active++; queue.shift()!(); }
  }
  async function prefetchLeague(leagueId: string) {
    const path = `league/${leagueId}`;
    const league = await fetchOnce(path).catch(() => null) as { previous_league_id?: string | null; settings?: { last_scored_leg?: number } } | null;
    if (!league) return;
    const last = Math.max(18, Number(league.settings?.last_scored_leg) || 0);
    // Prefetches run in the background; a failure is kept in its response and surfaces only if refresh asks for that path.
    for (const endpoint of ['users', 'rosters', 'winners_bracket', 'losers_bracket', 'drafts']) void fetchOnce(`${path}/${endpoint}`);
    for (let week = 1; week <= last; week++) void fetchOnce(`${path}/matchups/${week}`);
    for (let round = 0; round <= last; round++) void fetchOnce(`${path}/transactions/${round}`);
    if (league.previous_league_id) void prefetchLeague(league.previous_league_id);
  }
  async function players() {
    const cached = await stat(playerCachePath).catch(() => null);
    if (cached && Date.now() - cached.mtimeMs < playerCacheAge) return JSON.parse(await readFile(playerCachePath, 'utf8'));
    const value = await source.get('players/nfl');
    await mkdir(dirname(playerCachePath), { recursive: true });
    const temporary = `${playerCachePath}.tmp-${process.pid}`;
    await writeFile(temporary, JSON.stringify(value));
    await rename(temporary, playerCachePath);
    return value;
  }

  return {
    get(path) {
      if (path === 'players/nfl') return players();
      const league = /^league\/(\d+)$/.exec(path);
      if (league && !responses.has(path)) void prefetchLeague(league[1]);
      return fetchOnce(path);
    },
  };
}
