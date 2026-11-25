import { resolve } from 'node:path';
import { refresh, sleeperProvider } from './history/refresh.ts';
import { sleeperImportProvider } from './history/sleeper.ts';
import { loadArchive } from './history/store.ts';
import type { Archive } from './history/types.ts';

const dataDirectory = resolve(process.env.HISTORY_DATA_PATH ?? 'data');
const maxAge = 12 * 60 * 60 * 1000;
const imports = new Map<string, Promise<Archive>>();

export interface LeagueChoice { id: string; name: string; season: string; teams: number; avatar: string | null }

export function leagueStorePath(leagueId: string): string {
  return resolve(dataDirectory, 'leagues', `${leagueId}.json`);
}

/**
 * A username's leagues this season (or last), with the display name the league pages call that manager.
 * Sleeper answers an unknown username with null.
 */
export async function findLeagues(username: string): Promise<{ name: string; leagues: LeagueChoice[] } | null> {
  const user = await sleeperProvider.get(`user/${encodeURIComponent(username)}`) as { user_id: string; display_name: string } | null;
  if (!user) return null;
  const state = await sleeperProvider.get('state/nfl') as { league_season: string; previous_season: string };
  for (const season of [state.league_season, state.previous_season]) {
    const leagues = await sleeperProvider.get(`user/${user.user_id}/leagues/nfl/${season}`) as
      { league_id: string; name: string; season: string; total_rosters: number; avatar: string | null }[];
    if (leagues.length) return { name: user.display_name, leagues: leagues.map(league => ({
      id: league.league_id, name: league.name, season: league.season, teams: league.total_rosters,
      avatar: league.avatar ? `https://sleepercdn.com/avatars/thumbs/${league.avatar}` : null,
    })) };
  }
  return { name: user.display_name, leagues: [] };
}

/** The last league this instance read, parsed. */
let held: Archive | null = null;
const fresh = (archive: Archive) => Date.now() - Date.parse(archive.importedAt) < maxAge;

/** A league's archive, imported on its first visit and again once it is older than 12 hours. Until then, an instance opens the store once for the league it holds. */
export async function ensureLeague(leagueId: string): Promise<{ status: 'ready' | 'missing' | 'failed'; archive: Archive | null }> {
  if (held?.leagueId === leagueId && fresh(held)) return { status: 'ready', archive: held };
  const storePath = leagueStorePath(leagueId);
  const published = await loadArchive(storePath).then(archive => ({ archive }), error => console.error(`League ${leagueId} could not be read`, error));
  if (!published) return { status: 'failed', archive: null };
  const { archive } = published;
  if (archive && fresh(archive)) {
    held = archive;
    return { status: 'ready', archive };
  }
  let pending = imports.get(leagueId);
  if (!pending) {
    pending = refresh({ leagueId, storePath, previous: archive, provider: sleeperImportProvider(resolve(dataDirectory, 'players-nfl.json')) })
      .then(result => held = result.archive)
      .finally(() => imports.delete(leagueId));
    imports.set(leagueId, pending);
  }
  return pending.then(imported => ({ status: 'ready', archive: imported }), async error => {
    console.error(`League ${leagueId} import failed`, error);
    // A failed refresh keeps the previous archive, which is still worth showing.
    if (archive) return { status: 'ready', archive };
    // Sleeper answers an unknown league ID with 404; anything else is Sleeper failing.
    const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
    return { status: response?.status === 404 ? 'missing' : 'failed', archive: null };
  });
}
