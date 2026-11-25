import { Exact } from './decimal.ts';
import { readArchive } from './store.ts';
import { identity } from './game-records.ts';
import { completedContests } from './scope.ts';
import type { CategoryDefinition } from './records.ts';
import type { Archive, Contest } from './types.ts';

/** `from` is the week they took it by a title or a win, or just the season when the belt passed to them. A reign nobody holds is a vacancy. */
interface Reign { personId: string | null; from: { year: string; week: number | null }; defenses: Contest[] }

const lastWeek = (game: Contest) => Math.max(...game.weeks);

/** Every reign, oldest first. A league with no resolved title has none. */
function beltReigns(archive: Archive): Reign[] {
  const reigns: Reign[] = [];
  const champions: string[] = [];
  for (const season of archive.seasons.toReversed()) {
    const plays = (personId: string) => season.teams.some(team => team.personId === personId);
    const take = (personId: string | null, game?: Contest) => reigns.push({ personId, from: { year: season.year, week: game ? lastWeek(game) : null }, defenses: [] });
    if (reigns.length) {
      const held = reigns.at(-1)!.personId;
      if (held && !plays(held)) take(champions.findLast(plays) ?? null);
      for (const game of completedContests(archive, { scope: 'combined', seasonId: season.id }).sort((a, b) => lastWeek(a) - lastWeek(b) || a.id.localeCompare(b.id))) {
        const { personId, defenses } = reigns.at(-1)!;
        if (!game.sides.some(side => side.personId === personId)) continue;
        if (game.tie || game.winnerId === personId) defenses.push(game);
        else take(game.winnerId, game);
      }
    }
    if (!season.championId) continue;
    champions.push(season.championId);
    if (!reigns.at(-1)?.personId) take(season.championId, archive.contests.find(game => game.seasonId === season.id && game.championship));
  }
  return reigns;
}

export const beltRule = 'The first champion starts with it, and beating the holder in the regular season or championship playoffs takes it. A tie keeps it. If the holder leaves, it goes to the latest champion still playing.';
export function reignStart({ year, week }: Reign['from']): string { return week === null ? `the start of ${year}` : `Week\u00a0${week}, ${year}`; }

/** Every reign with a defense. */
export const beltCandidates: CategoryDefinition['candidates'] = (archive, selection) =>
  beltReigns(archive).filter(({ from, defenses }) => defenses.length && (!selection.season || from.year === selection.season)).map(({ personId, from, defenses }) => {
    const last = defenses.at(-1)!;
    return { ...identity(archive, personId!, last.year), id: `${personId}:${from.year}:${from.week ?? 'passed'}`, metric: Exact.from(defenses.length), sample: null,
      leaderContext: `from ${reignStart(from)}`, period: { year: last.year, week: lastWeek(last), playedAt: last.playedAt },
      href: `/managers/${personId}/`, historyLabel: 'Open career' };
  });

/** Every reign, oldest first, and how many weeks of each season they run over. */
export async function readBelt(options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  const reigns = beltReigns(archive).map(({ personId, from, defenses }) => ({ person: archive.people.find(person => person.id === personId) ?? null, from, defenses: defenses.length }));
  const seasons = archive.seasons.toReversed().filter(season => reigns.length && season.year >= reigns[0].from.year)
    .map(season => ({ year: season.year, weeks: season.completedWeeks.at(-1) ?? 1 }));
  return { reigns, seasons };
}

/** A person's reigns, and the most defenses in one. */
export async function readManagerBelt(personId: string, options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  const reigns = archive && beltReigns(archive);
  if (!reigns?.length) return null;
  const runs = reigns.filter(reign => reign.personId === personId).map(reign => reign.defenses.length);
  return { reigns: runs.length, bestRun: runs.length ? Math.max(...runs) : null };
}
