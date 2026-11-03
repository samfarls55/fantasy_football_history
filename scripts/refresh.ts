import { refresh } from '../src/history/refresh.ts';

try {
  const { archive, changed, storePath } = await refresh();
  console.log(JSON.stringify({ operation: 'refresh', leagueId: archive.leagueId, storePath, changed,
    seasons: archive.seasons.map(season => ({ id: season.id, year: season.year, completedWeeks: season.completedWeeks })),
    people: archive.people.length, contests: archive.contests.length, coverage: archive.coverage,
  }));
} catch (error) {
  console.error(`History refresh failed: ${error instanceof Error ? error.message : String(error)}. The last published history was retained.`);
  process.exitCode = 1;
}
