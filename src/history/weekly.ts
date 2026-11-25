import { Exact } from './decimal.ts';
import { regularScores } from './luck.ts';
import { completedContests } from './scope.ts';
import { plural, winLoss } from './wording.ts';
import type { ManagerStat } from './manager-stats.ts';
import type { Archive } from './types.ts';

/** Weeks with the best or worst score in the league, ties included. */
function extremes(end: 'top' | 'bottom'): ManagerStat['values'] {
  return archive => new Map([...Map.groupBy(regularScores(archive), ({ own }) => own.personId)].map(([personId, scores]) => [personId, {
    value: Exact.from(scores.filter(({ own, week }) => week.every(other => end === 'top' ? other.points <= own.points : other.points >= own.points)).length),
    sample: plural(scores.length, 'week'),
  }]));
}

/** The league's own big score: its 80th-percentile regular-season score, the lowest that 80% of them don't pass, to the nearest 10. */
function bigScoreLine(archive: Archive) {
  const scores = regularScores(archive).map(({ own }) => own.points).sort((a, b) => a - b);
  return Math.round(scores[Math.ceil(scores.length * 4 / 5) - 1] / 10) * 10;
}
const bigScores: ManagerStat['values'] = archive => {
  const line = bigScoreLine(archive);
  return new Map([...Map.groupBy(regularScores(archive), ({ own }) => own.personId)].map(([personId, scores]) =>
    [personId, { value: Exact.from(scores.filter(({ own }) => own.points >= line).length), sample: plural(scores.length, 'game') }]));
};

/** Standard deviation of each score as a share of its week's average. An all-zero week has no such share, and one score has no swing. */
const boomOrBust: ManagerStat['values'] = archive => {
  const shares = regularScores(archive).map(({ own, week }) => ({ personId: own.personId, average: week.reduce((sum, score) => sum + score.points, 0) / week.length, points: own.points }))
    .filter(({ average }) => average > 0).map(({ personId, average, points }) => ({ personId, share: points / average }));
  return new Map([...Map.groupBy(shares, ({ personId }) => personId)].filter(([, weeks]) => weeks.length > 1).map(([personId, weeks]) => {
    const mean = weeks.reduce((sum, { share }) => sum + share, 0) / weeks.length;
    const variance = weeks.reduce((sum, { share }) => sum + (share - mean) ** 2, 0) / weeks.length;
    return [personId, { value: Math.sqrt(variance) * 100, sample: plural(weeks.length, 'week') }];
  }));
};

/** Win percentage over part of each regular season, a tie counting half. */
function winRate(from: number, through = Infinity): ManagerStat['values'] {
  return archive => {
    const sides = completedContests(archive).filter(({ weeks: [week] }) => week >= from && week <= through).flatMap(game => game.sides.map(({ personId }) => ({ personId, game })));
    return new Map([...Map.groupBy(sides, ({ personId }) => personId)].map(([personId, played]) => {
      const wins = played.filter(({ game }) => game.winnerId === personId).length;
      const ties = played.filter(({ game }) => game.tie).length;
      return [personId, { value: Exact.from(wins).add(Exact.from(ties).divide(2)).multiply(100).divide(played.length),
        sample: winLoss(wins, played.length - wins - ties, ties) }];
    }));
  };
}

/** Games' table. */
export const weeklyStats: ManagerStat[] = [
  { key: 'top-scores', place: 'games', label: 'Week’s top score', unit: 'times', displayPrecision: 0, better: 'higher', values: extremes('top'),
    rule: 'Regular-season weeks they had the league’s best score. Everyone tied for it gets one.' },
  { key: 'bottom-scores', place: 'games', label: 'Week’s bottom score', unit: 'times', displayPrecision: 0, better: 'lower', values: extremes('bottom'),
    rule: 'Regular-season weeks they had the league’s worst score. Everyone tied for it gets one.' },
  { key: 'big-scores', place: 'games', label: archive => `${bigScoreLine(archive)}+ point games`, unit: 'games', displayPrecision: 0, better: 'higher', values: bigScores,
    rule: 'Regular-season scores at or above the league’s line: its 80th-percentile score, to the nearest 10.' },
  { key: 'boom-or-bust', place: 'games', label: 'Boom or bust: typical weekly swing, % of league average', unit: 'of league average', percent: true, displayPrecision: 1, better: 'higher', values: boomOrBust,
    rule: 'Each regular-season score as a share of that week’s league average, and the standard deviation of those shares.' },
  { key: 'early-wins', place: 'games', label: 'Win % in weeks 1–5', unit: 'of games', percent: true, displayPrecision: 1, better: 'higher', values: winRate(1, 5),
    rule: 'Regular-season games won in weeks 1 to 5, with a tie counting as half a win.' },
  { key: 'late-wins', place: 'games', label: 'Win % from week 9', unit: 'of games', percent: true, displayPrecision: 1, better: 'higher', values: winRate(9),
    rule: 'Regular-season games won from week 9 to the end of the regular season, with a tie counting as half a win.' },
];
