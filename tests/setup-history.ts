import { readFile, rm } from 'node:fs/promises';
import { refresh } from '../src/history/refresh.ts';

export default async function setup() {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/provider-history.json', import.meta.url), 'utf8'));
  // Browser-only source edge cases, kept separate from the worked metric history.
  fixture.responses['league/900000000000002021/users'][0].avatar = 'controlled-source-image';
  fixture.responses['league/900000000000002021/rosters'][1].metadata = { team_name: 'The Museum Team With A Very Long Historical Name That Wraps Across Lines' };
  await refresh({ leagueId: fixture.seedLeagueId, storePath: process.env.MUSEUM_STORE_PATH, now: new Date(fixture.now), provider: {
    async get(path) {
      if (!(path in fixture.responses)) throw new Error(`Missing controlled response: ${path}`);
      return structuredClone(fixture.responses[path]);
    },
  } });
  return async () => { await rm(process.env.MUSEUM_STORE_PATH!, { force: true }); };
}
