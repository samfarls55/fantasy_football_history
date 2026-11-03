import { Exact, exactSum } from './decimal.ts';
import type { Archive, Season } from './types.ts';
import type { CategoryDefinition } from './records.ts';

/** Official regular-season comparisons, shared by standings and season awards. */
export function seasonComparisons(archive: Archive, season: Season) {
  const weeks = season.regularWeeks.map(week => ({ week, scores: archive.performances.filter(row => row.seasonId === season.id && row.competition === 'regular' && row.week === week) }));
  const requiredCoverage = !archive.coverage.some(issue => issue.seasonId === season.id && issue.blocks.some(key => ['season-comparisons', 'dominant-season', 'unluckiest-season', 'best-without-title'].includes(key)));
  const fullSeasonCoverage = requiredCoverage && season.complete && weeks.length === Number(season.settings.playoff_week_start) - Number(season.settings.start_week) && weeks.every(row => row.scores.length >= 2);
  return season.teams.map(team => {
    const played = weeks.flatMap(week => {
      const own = week.scores.find(score => score.rosterId === team.rosterId);
      return own ? [{ ...week, own }] : [];
    });
    const covered = requiredCoverage && played.length > 0 && played.every(week => week.scores.length >= 2);
    const points = exactSum(played.map(week => week.own.points));
    const leaguePoints = exactSum(played.flatMap(week => week.scores.map(score => score.points)));
    const leagueWeeks = played.reduce((count, week) => count + week.scores.length, 0);
    const dominance = covered && leaguePoints.compare(0) !== 0 ? points.divide(played.length).divide(leaguePoints.divide(leagueWeeks)).subtract(1).multiply(100) : null;
    const expectedWins = covered ? exactSum(played.map(week => {
      const opponents = week.scores.filter(score => score.rosterId !== team.rosterId);
      const outscored = opponents.filter(score => Exact.from(week.own.points).compare(score.points) > 0).length;
      const tied = opponents.filter(score => Exact.from(week.own.points).compare(score.points) === 0).length;
      return Exact.from(outscored).add(Exact.from(tied).divide(2)).divide(opponents.length);
    })) : null;
    const games = archive.contests.filter(game => game.seasonId === season.id && game.competition === 'regular' && game.complete && game.sides.some(side => side.rosterId === team.rosterId) && game.weeks.every(week => played.some(row => row.week === week)));
    const actualWins = Exact.from(games.filter(game => game.winnerId === team.personId).length).add(Exact.from(games.filter(game => game.tie).length).divide(2));
    const winsVsExpected = expectedWins ? actualWins.subtract(expectedWins) : null;
    return { teamId: team.id, dominance, expectedWins, actualWins, winsVsExpected, fullSeasonCoverage, playedWeeks: played.length, lastWeek: played.at(-1)?.week ?? null };
  });
}

export function seasonCandidates(key: 'dominant-season' | 'unluckiest-season' | 'best-without-title'): NonNullable<CategoryDefinition['candidates']> {
  return (archive, selection) => archive.seasons.filter(season => season.complete && (!selection.season || season.year === selection.season)).flatMap(season =>
    seasonComparisons(archive, season).flatMap(comparison => {
      const team = season.teams.find(team => team.id === comparison.teamId)!;
      const person = archive.people.find(person => person.id === team.personId)!;
      if (!comparison.fullSeasonCoverage || key === 'best-without-title' && (!season.championId || season.championId === team.personId)) return [];
      const metric = key === 'unluckiest-season' ? comparison.winsVsExpected?.multiply(-1) : comparison.dominance;
      if (!metric) return [];
      return [{ id: team.id, personId: person.id, name: person.name, avatar: team.avatar, metric,
        detail: team.name === person.name ? season.year : `${season.year} · ${team.name}`,
        sample: `${comparison.playedWeeks} ${comparison.playedWeeks === 1 ? 'week' : 'weeks'}`,
        period: { year: season.year, week: Math.max(...season.completedWeeks), playedAt: null },
        href: `/managers/${person.id}/seasons/${season.year}/?scope=regular`, historyLabel: 'Open season' }];
    }));
}
