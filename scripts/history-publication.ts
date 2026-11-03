import { readFile } from 'node:fs/promises';
import { configuredStorePath, loadArchive, publishArchive } from '../src/history/store.ts';
import type { Archive } from '../src/history/types.ts';

/** Operator-only tool for the publication boundary; never a public HTTP route. */
try {
  const [operation, candidatePath, ...extra] = process.argv.slice(2);
  if (extra.length || !['publish', 'inspect'].includes(operation ?? '') ||
      (operation === 'publish' ? !candidatePath : candidatePath)) {
    throw new Error('Usage: npm run history:publish -- <candidate.json> or npm run history:inspect');
  }
  if (operation === 'publish') {
    const candidate = JSON.parse(await readFile(candidatePath!, 'utf8')) as Archive;
    await publishArchive(candidate);
  }
  const archive = await loadArchive();
  console.log(JSON.stringify({
    operation, published: archive !== null, storePath: configuredStorePath(),
    ...(archive ? {
      leagueId: archive.leagueId,
      seasons: archive.seasons.map(({ id, year, name }) => ({ id, year, name })),
      people: archive.people.length, contests: archive.contests.length,
    } : {}),
  }));
} catch (error) {
  console.error(`History publication failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
