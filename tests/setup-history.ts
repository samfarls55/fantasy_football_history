import { readFile, rm } from 'node:fs/promises';
import { refresh } from '../src/history/refresh.ts';

export default async function setup() {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/provider-history.json', import.meta.url), 'utf8'));
  // Browser-only source edge cases, kept separate from the worked metric history.
  fixture.responses['league/900000000000002021/users'][0].avatar = 'controlled-source-image';
  fixture.responses['league/900000000000002021/rosters'][1].metadata = { team_name: 'The Museum Team With A Very Long Historical Name That Wraps Across Lines' };
  fixture.responses['league/900000000000002020/rosters'][0].metadata = { team_name: 'Harbor Crew' };
  fixture.responses['league/900000000000002021/rosters'][2].metadata = { team_name: 'Buccaneers' };
  fixture.responses['league/900000000000002020/matchups/1'][0].players.push('90');
  const native = JSON.parse(await readFile(new URL('./fixtures/playoff-type-1.json', import.meta.url), 'utf8'));
  native.responses[`league/${native.seedLeagueId}`].previous_league_id = fixture.seedLeagueId;
  native.responses['players/nfl'] = { ...fixture.responses['players/nfl'], ...native.responses['players/nfl'] };
  Object.assign(fixture.responses, native.responses);
  await refresh({ leagueId: native.seedLeagueId, storePath: process.env.MUSEUM_STORE_PATH, now: new Date('2025-12-31T12:00:00Z'), provider: {
    async get(path) {
      if (!(path in fixture.responses)) throw new Error(`Missing controlled response: ${path}`);
      return structuredClone(fixture.responses[path]);
    },
  } });
  return async () => { await rm(process.env.MUSEUM_STORE_PATH!, { force: true }); };
}
