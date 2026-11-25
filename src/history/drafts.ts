import { playerContributionHref, recordedStarts } from './contributions.ts';
import { Exact, exactSum } from './decimal.ts';
import { plural } from './wording.ts';
import { rosterPerson } from './rosters.ts';
import type { ManagerStat } from './manager-stats.ts';
import type { Archive, Season } from './types.ts';
import type { CategoryDefinition, RecordCandidate, RecordSelection } from './records.ts';

/** The draft a completed season's results are measured on: the largest snake or linear one that filled the rosters its own settings describe, with every pick placed. An auction has no rounds to compare, and a rookie draft fills part of a roster. */
function resultsDraft(archive: Archive, season: Season) {
  return archive.drafts.filter(draft => draft.seasonId === season.id).map(draft => {
    const { settings } = draft.source;
    const spots = Object.keys(settings).filter(key => key.startsWith('slots_')).reduce((total, key) => total + settings[key], 0);
    return { ...draft, rounds: settings.rounds, full: spots > 0 && settings.rounds >= spots && settings.player_type !== 1 };
  }).filter(({ full, source, picks }) => full && source.status === 'complete' && (source.type === 'snake' || source.type === 'linear') && picks.every(({ source }) => source.round && source.pick_no && source.draft_slot))
    .sort((a, b) => b.picks.length - a.picks.length)[0];
}

/** What each pick scored in its drafter's regular-season starting lineups: the second half of the rounds for steals, the first round for busts. */
export function pickCandidates(key: 'best-steal' | 'worst-bust'): CategoryDefinition['candidates'] {
  return (archive, selection) => archive.seasons.filter(season => season.complete && (!selection.season || season.year === selection.season)).flatMap(season => {
    const draft = resultsDraft(archive, season);
    if (!draft) return [];
    const starts = recordedStarts(archive, {}, { season: season.year });
    return draft.picks.filter(pick => !pick.keeper && (key === 'worst-bust' ? pick.source.round === 1 : pick.source.round! * 2 > draft.rounds)).flatMap(pick => {
      // The roster that made the pick, whoever's slot it came from.
      const personId = rosterPerson(archive, season.id, pick.rosterId);
      if (!personId) return [];
      const person = archive.people.find(person => person.id === personId)!;
      const own = starts.filter(start => start.playerId === pick.playerId && start.performance.personId === person.id);
      return [{ id: `${draft.id}:${pick.playerId}`, personId: person.id, name: archive.players.find(player => player.id === pick.playerId)!.name, avatar: null, metric: exactSum(own.map(start => start.points)),
        sample: plural(own.length, 'start'), leaderContext: `${person.name} · ${key === 'worst-bust' ? `Pick ${pick.source.pick_no}` : `Round ${pick.source.round}`} · ${season.year}`,
        period: { year: season.year, week: Math.max(...season.completedWeeks), playedAt: null }, href: playerContributionHref({ personId: person.id }, pick.playerId, { season: season.year }), historyLabel: 'Open player history' }];
    });
  });
}

/** How many champions drafted from each slot, the slots without one included. */
export function slotCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  const titles = archive.seasons.filter(season => season.complete && (!selection.season || season.year === selection.season)).flatMap(season => {
    const draft = resultsDraft(archive, season);
    const champion = season.teams.find(team => team.personId === season.championId);
    if (!draft || !champion) return [];
    const slots = draft.picks.filter(pick => pick.rosterId === champion.rosterId).map(pick => pick.source.draft_slot!);
    const picks = (slot: number) => slots.filter(other => other === slot).length;
    // The order names the account that drafted. A champion who took the roster over has the slot most of its picks came from.
    const slot = draft.source.draft_order[archive.people.find(person => person.id === champion.personId)!.accountId] ?? slots.sort((a, b) => picks(b) - picks(a))[0];
    return slot ? [{ slot, slots: season.teams.length, winner: { personId: champion.personId, year: season.year } }] : [];
  });
  return Array.from({ length: Math.max(0, ...titles.map(title => title.slots)) }, (_, index) => {
    const winners = titles.filter(title => title.slot === index + 1).map(title => title.winner);
    return { id: `slot-${index + 1}`, name: `Slot ${index + 1}`, avatar: null, metric: Exact.from(winners.length), sample: null, period: null, href: '', winners };
  });
}

/** Each person's picks in finished drafts of every type, keepers included. */
function personPicks(archive: Archive) {
  const players = new Map(archive.players.map(player => [player.id, player]));
  return Map.groupBy(archive.drafts.filter(draft => draft.source.status === 'complete').flatMap(draft => draft.picks.flatMap(pick => {
    const personId = rosterPerson(archive, draft.seasonId, pick.rosterId);
    return personId ? [{ personId, draft, pick, player: players.get(pick.playerId)! }] : [];
  })), row => row.personId);
}
type PersonPick = NonNullable<ReturnType<ReturnType<typeof personPicks>['get']>>[number];

/** Each person's most-drafted answer, and every tied one. Answers drafted once each are no tendency. */
function mostDrafted(answer: (row: PersonPick) => string | null | undefined, name = answer): ManagerStat['values'] {
  return archive => new Map([...personPicks(archive)].flatMap(([personId, picks]) => {
    const answers = [...Map.groupBy(picks.filter(answer), answer).values()];
    const most = Math.max(...answers.map(rows => rows.length));
    return most > 1 ? [[personId, { value: Exact.from(most), names: answers.filter(rows => rows.length === most).map(([row]) => name(row)!).sort((a, b) => a.localeCompare(b)) }]] : [];
  }));
}

const easternDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });
const draftAge: ManagerStat['values'] = archive => new Map([...personPicks(archive)].flatMap(([personId, picks]) => {
  const days = picks.flatMap(({ draft, player }) => {
    const start = draft.source.start_time;
    return start && player.birthDate && player.position !== 'DEF' ? [(Date.parse(easternDay.format(start)) - Date.parse(player.birthDate)) / 86_400_000] : [];
  });
  return days.length ? [[personId, { value: exactSum(days).divide(Exact.from('365.25').multiply(days.length)) }]] : [];
}));

/** Draft's Scouting reports table. */
export const draftStats: ManagerStat[] = [
  { key: 'most-drafted', place: 'draft', label: 'Most-drafted player', unit: 'times', displayPrecision: 0, better: 'higher', values: mostDrafted(row => row.player.id, row => row.player.name),
    rule: 'The player they picked most, at least twice. Every finished draft of any type, keepers included.' },
  { key: 'drafted-team', place: 'draft', label: 'Most-drafted team', unit: 'times', displayPrecision: 0, better: 'higher', values: mostDrafted(row => row.pick.source.metadata.team),
    rule: 'The NFL team they picked from most, at least twice, going by each player’s team at the draft. Every finished draft of any type, keepers included.' },
  { key: 'drafted-college', place: 'draft', label: 'Most-drafted college', unit: 'times', displayPrecision: 0, better: 'higher', values: mostDrafted(row => row.player.position === 'DEF' ? null : row.player.college),
    rule: 'The college they picked from most, at least twice. Every finished draft of any type, keepers included; team defenses and unknown colleges don’t count.' },
  { key: 'draft-age', place: 'draft', label: 'Average draft age', unit: 'years', displayPrecision: 1, better: 'lower', values: draftAge,
    rule: 'The average of each player’s age on the day of the draft. Every finished draft of any type, keepers included; team defenses and unknown birth dates don’t count.' },
];
