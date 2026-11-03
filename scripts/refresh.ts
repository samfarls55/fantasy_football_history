import { isDeepStrictEqual } from 'node:util';
import { refresh } from '../src/history/refresh.ts';
import { configuredStorePath, loadArchive } from '../src/history/store.ts';
import type { Archive } from '../src/history/types.ts';

let previous: Archive | null = null;
try {
  previous = await loadArchive();
  const { archive, changed, storePath } = await refresh();
  console.log(JSON.stringify({ operation: 'refresh', leagueId: archive.leagueId, storePath, changed, importedAt: archive.importedAt,
    seasons: archive.seasons.map(season => ({ id: season.id, year: season.year, completedWeeks: season.completedWeeks })),
    people: archive.people.length, contests: archive.contests.length, coverage: archive.coverage,
  }));
} catch (error) {
  const diagnostic = {
    operation: 'refresh', error: `History refresh failed: ${error instanceof Error ? error.message : String(error)}`,
    storePath: configuredStorePath(),
  };
  try {
    const published = await loadArchive();
    console.error(JSON.stringify({ ...diagnostic, published: published !== null,
      retained: previous !== null && published !== null && isDeepStrictEqual(previous, published),
      lastSuccessfulAt: published?.importedAt ?? null, coverage: published?.coverage ?? [],
    }));
  } catch (inspectionError) {
    console.error(JSON.stringify({ ...diagnostic, published: null, retained: null, lastSuccessfulAt: null, coverage: null,
      inspectionError: inspectionError instanceof Error ? inspectionError.message : String(inspectionError),
    }));
  }
  process.exitCode = 1;
}
