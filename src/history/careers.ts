import { Exact } from './decimal.ts';
import { identity } from './game-records.ts';
import { personSeasons, personTenures } from './managers.ts';
import { careerMetrics } from './metrics.ts';
import { completedContests } from './scope.ts';
import { plural } from './wording.ts';
import type { ManagerStat, StatValue } from './manager-stats.ts';
import type { CategoryDefinition } from './records.ts';
import type { Archive, Person, Season } from './types.ts';

function perPerson(read: (person: Person, archive: Archive) => StatValue | null): ManagerStat['values'] {
  return archive => new Map(archive.people.flatMap(person => {
    const value = read(person, archive);
    return value ? [[person.id, value]] : [];
  }));
}
/** One value from each person's regular-season career. */
const fromCareer = (read: (career: ReturnType<typeof careerMetrics>, person: Person, archive: Archive) => StatValue | null) =>
  perPerson((person, archive) => read(careerMetrics(archive, { personId: person.id }), person, archive));

/** Counts that can only happen in some seasons, beside how many of those the person had. */
const ofSeasons = (chance: (season: Season) => boolean, happened: (season: Season, personId: string) => boolean) => perPerson(({ id }, { seasons }) => {
  const played = seasons.filter(season => chance(season) && season.teams.some(team => team.personId === id));
  return { value: Exact.from(played.filter(season => happened(season, id)).length), sample: plural(played.length, 'season') };
});

/** Everyone who lost a final and has never won one. */
export const bridesmaidCandidates: NonNullable<CategoryDefinition['candidates']> = (archive, selection) => archive.people.flatMap(person => {
  const lost = archive.seasons.filter(season => season.runnerUpId === person.id && (!selection.season || season.year === selection.season)).toReversed();
  if (!lost.length || archive.seasons.some(season => season.championId === person.id)) return [];
  const last = lost.at(-1)!;
  const final = archive.contests.find(game => game.seasonId === last.id && game.championship)!;
  return [{ ...identity(archive, person.id, last.year), id: person.id, metric: Exact.from(lost.length), sample: null,
    leaderContext: lost.map(season => season.year).join(', '), period: { year: last.year, week: Math.max(...final.weeks), playedAt: final.playedAt },
    href: `/managers/${person.id}/`, historyLabel: 'Open career' }];
});

/** Elo, a week at a time, so every game of a week is judged by the ratings from before it. */
const powerRatings: ManagerStat['values'] = archive => {
  const ratings = new Map<string, number>();
  const rating = (personId: string) => ratings.get(personId) ?? 1500;
  const games = completedContests(archive).sort((a, b) => a.year.localeCompare(b.year) || a.weeks[0] - b.weeks[0]);
  for (const week of Map.groupBy(games, game => `${game.year}/${game.weeks[0]}`).values()) {
    const changes = week.flatMap(({ sides: [a, b], winnerId, tie }) => {
      const expected = 1 / (1 + 10 ** ((rating(b.personId) - rating(a.personId)) / 400));
      const change = 24 * ((tie ? 0.5 : winnerId === a.personId ? 1 : 0) - expected);
      return [[a.personId, change], [b.personId, -change]] as const;
    });
    for (const [personId, change] of changes) ratings.set(personId, rating(personId) + change);
  }
  return new Map([...ratings].map(([personId, value]) => [personId, { value }]));
};

export function ordinal(place: number): string { return `${place}${['th', 'st', 'nd', 'rd'][place % 100 > 10 && place % 100 < 14 ? 0 : place % 10] ?? 'th'}`; }

const yearChanges: ManagerStat['values'] = archive => new Map(archive.people.flatMap(person => {
  const seasons = personSeasons(archive, person.id);
  const changes = seasons.flatMap(({ season, team }) => {
    const before = seasons.find(earlier => Number(earlier.season.year) === Number(season.year) - 1);
    return season.complete && before?.season.complete && team.finish && before.team.finish
      ? [{ size: Math.abs(team.finish - before.team.finish), name: `${ordinal(before.team.finish)}\u00a0to\u00a0${ordinal(team.finish)}\u00a0in\u00a0${season.year}` }] : [];
  });
  if (!changes.length) return [];
  const size = Math.max(...changes.map(change => change.size));
  return [[person.id, { value: Exact.from(size), names: changes.filter(change => change.size === size).map(change => change.name),
    sample: plural(seasons.filter(({ season, team }) => season.complete && team.finish).length, 'season') }]];
}));

/** Legacy's careers table. The numbers a league argues over come first, so a phone shows them before any scroll; the years trail. */
export const careerStats: ManagerStat[] = [
  { key: 'titles', place: 'legacy', label: 'Titles', unit: 'won', displayPrecision: 0, better: 'higher', values: ofSeasons(season => season.championId !== null, (season, personId) => season.championId === personId),
    rule: 'Championship games won.' },
  { key: 'finals-lost', place: 'legacy', label: 'Finals lost', unit: 'finals', displayPrecision: 0, better: 'higher', values: ofSeasons(season => season.runnerUpId !== null, (season, personId) => season.runnerUpId === personId),
    rule: 'Championship games lost.' },
  { key: 'record', place: 'legacy', label: 'Record', unit: archive => completedContests(archive).some(game => game.tie) ? 'wins–losses–ties' : 'wins–losses', displayPrecision: 0, better: 'higher',
    values: fromCareer(({ facts }) => ({ value: Exact.from(facts.wins), shown: facts.record })),
    rule: 'Regular-season games, sorted by wins.' },
  { key: 'win-rate', place: 'legacy', label: 'Win %', unit: 'of games', percent: true, displayPrecision: 1, better: 'higher', values: fromCareer(({ winPercentage }) => winPercentage && { value: winPercentage }),
    rule: 'Regular-season games won, with a tie counting as half a win.' },
  { key: 'playoffs', place: 'legacy', label: 'Playoffs', unit: 'trips', displayPrecision: 0, better: 'higher', values: ofSeasons(season => season.playoffPersonIds.length > 0, (season, personId) => season.playoffPersonIds.includes(personId)),
    rule: 'Seasons they reached the championship bracket, a first-round bye included.' },
  { key: 'points', place: 'legacy', label: 'Points per game', unit: 'points', displayPrecision: 1, better: 'higher',
    values: fromCareer(({ points, games }) => games.length ? { value: points.divide(games.length) } : null),
    rule: 'Official regular-season scores added up, divided by games played.' },
  { key: 'points-against', place: 'legacy', label: 'Opponents’ points per game', unit: 'points', displayPrecision: 1, better: 'lower',
    values: fromCareer(({ pointsAgainst, games }) => games.length ? { value: pointsAgainst.divide(games.length) } : null),
    rule: 'Their opponents’ official scores in those same games, divided by games played.' },
  { key: 'power-rating', place: 'legacy', label: 'Power rating', unit: 'rating points', displayPrecision: 0, better: 'higher', values: powerRatings,
    rule: 'Elo: everyone starts at 1,500, and a regular-season win takes up to 24 points from the opponent, more from a higher-rated one.' },
  { key: 'one-year-change', place: 'legacy', label: 'Biggest one-year change in finish', unit: 'places', displayPrecision: 0, better: 'higher', values: yearChanges,
    rule: 'The biggest move, up or down, between their final finishes in back-to-back finished seasons.' },
  { key: 'seasons', place: 'legacy', label: 'Seasons', unit: 'years', displayPrecision: 0, better: 'higher',
    values: perPerson((person, archive) => {
      const seasons = personSeasons(archive, person.id);
      return { value: Exact.from(seasons.length), shown: personTenures(archive, seasons).map(tenure => tenure.range).join(', ') };
    }),
    rule: 'Seasons they’ve had a team in this league, sorted by how many.' },
];
