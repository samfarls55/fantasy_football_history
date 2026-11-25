import { Exact } from './decimal.ts';
import { identity } from './game-records.ts';
import { opponentOf, regularScores } from './performances.ts';
import { completedContests } from './scope.ts';
import { plural } from './wording.ts';
import type { ManagerStat } from './manager-stats.ts';
import type { CategoryDefinition } from './records.ts';
import type { Archive } from './types.ts';


/** Scores 2nd from one end of their week that got the opposite result. */
function secondScores(result: 'lost' | 'won'): ManagerStat['values'] {
  return archive => {
    const counted = regularScores(archive).filter(({ week }) => week.length >= 4);
    return new Map([...Map.groupBy(counted, ({ own }) => own.personId)].map(([personId, scores]) => [personId, {
      value: Exact.from(scores.filter(({ own, game, week }) => !game.tie && (game.winnerId === personId) === (result === 'won')
        && week.filter(other => result === 'lost' ? other.points > own.points : other.points < own.points).length === 1).length),
      sample: plural(scores.length, 'week'),
    }]));
  };
}

/** Each person's sides of games decided by more than 0 and under 5 points. */
function closeSides(archive: Archive) {
  const sides = completedContests(archive).filter(({ sides: [a, b] }) => {
    const margin = Exact.from(a.points).subtract(b.points).abs();
    return margin.compare(0) > 0 && margin.compare(5) < 0;
  }).flatMap(game => game.sides.map(({ personId }) => ({ personId, won: game.winnerId === personId })));
  return [...Map.groupBy(sides, side => side.personId)].map(([personId, played]) => ({ personId, played: played.length, wins: played.filter(side => side.won).length }));
}
const closeGames: ManagerStat = {
  key: 'close-games', place: 'luck', label: 'Close games', unit: 'W–L within 5 points', displayPrecision: 1, better: 'higher',
  values: archive => new Map(closeSides(archive).map(({ personId, played, wins }) => [personId, { value: Exact.from(wins * 100).divide(played), shown: `${wins}–${played - wins}` }])),
  rule: 'Wins and losses in regular-season games decided by more than 0 and under 5 points, ranked by the share won.',
};
/** The losses in that column's records. Only a badge ranks them, so they're no column of their own and keep its key. */
export const closeLosses: ManagerStat = {
  ...closeGames, label: 'Close losses', unit: 'losses', displayPrecision: 0,
  values: archive => new Map(closeSides(archive).map(({ personId, played, wins }) => [personId, { value: Exact.from(played - wins), sample: `of ${plural(played, 'game')}` }])),
  rule: 'Regular-season games lost by under 5 points.',
};

const highsFaced: ManagerStat['values'] = archive => {
  const complete = new Set(archive.seasons.filter(season => season.complete).map(season => season.id));
  const scores = regularScores(archive).filter(({ own }) => complete.has(own.seasonId));
  const seasonScores = Map.groupBy(scores, ({ own }) => `${own.seasonId}/${own.personId}`);
  const faced = scores.map(({ own }) => {
    const opponent = opponentOf(archive, own);
    return { personId: own.personId, high: seasonScores.get(`${own.seasonId}/${opponent.personId}`)!.every(other => other.own.points <= opponent.points) };
  });
  return new Map([...Map.groupBy(faced, row => row.personId)].map(([personId, games]) =>
    [personId, { value: Exact.from(games.filter(game => game.high).length) }]));
};

/** One side of each decided regular-season game, with that side's official score. */
export function resultCandidates(result: 'lost' | 'won'): CategoryDefinition['candidates'] {
  return (archive, selection) => completedContests(archive).filter(game => !game.tie && (!selection.season || game.year === selection.season)).map(game => {
    const side = game.sides.find(side => (side.personId === game.winnerId) === (result === 'won'))!;
    const opponent = game.sides.find(other => other !== side)!;
    const when = `Week ${game.weeks[0]} · ${game.year}`;
    return { ...identity(archive, side.personId, game.year), id: game.id, metric: Exact.from(side.points), sample: null,
      opponentId: opponent.personId, result, detail: `${side.teamName} vs ${opponent.teamName}`, leaderContext: when,
      period: { year: game.year, week: game.weeks[0], playedAt: game.playedAt },
      href: `/seasons/${game.year}/matchups/${game.id}/?scope=regular&week=${game.weeks[0]}&team=${side.rosterId}`, historyLabel: 'Open matchup' };
  });
}

/** Excuses' Luck table: the strongest claim to luck, good or bad, ranks first. */
export const luckStats: ManagerStat[] = [
  { key: 'robbed', place: 'luck', label: 'Robbed', unit: 'losses with 2nd-best score', displayPrecision: 0, better: 'higher', values: secondScores('lost'),
    rule: 'Regular-season games lost with the week’s 2nd-best score, in weeks with at least four scores. Teams tied for 2nd all count, but a tied game doesn’t.' },
  { key: 'got-away', place: 'luck', label: 'Got away with it', unit: 'wins with 2nd-worst score', displayPrecision: 0, better: 'higher', values: secondScores('won'),
    rule: 'Regular-season games won with the week’s 2nd-worst score, in weeks with at least four scores. Teams tied for 2nd-worst all count, but a tied game doesn’t.' },
  closeGames,
  { key: 'highs-faced', place: 'luck', label: 'Faced a season high', unit: 'times', displayPrecision: 0, better: 'higher', values: highsFaced,
    rule: 'Completed seasons: games where the opponent had their own best score of that regular season. A tied best counts each time.' },
];
