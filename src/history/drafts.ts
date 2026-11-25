import { playerContributionHref, recordedStarts } from './contributions.ts';
import { Exact, exactSum } from './decimal.ts';
import type { Archive, Season } from './types.ts';
import type { CategoryDefinition, RecordCandidate, RecordSelection } from './records.ts';

/** The draft a completed season's results are measured on: the largest snake or linear one that filled the rosters its own settings describe. An auction has no rounds to compare, and a rookie draft fills part of a roster. */
function resultsDraft(archive: Archive, season: Season) {
  return archive.drafts.filter(draft => draft.seasonId === season.id).map(draft => {
    const settings = draft.source.settings as Record<string, number>;
    const spots = Object.keys(settings).filter(key => key.startsWith('slots_')).reduce((total, key) => total + settings[key], 0);
    return { ...draft, rounds: settings.rounds, full: spots > 0 && settings.rounds >= spots && settings.player_type !== 1 };
  }).filter(draft => draft.full && draft.source.status === 'complete' && ['snake', 'linear'].includes(draft.source.type as string))
    .sort((a, b) => b.picks.length - a.picks.length)[0];
}

/** What each pick scored in its drafter's regular-season starting lineups: the second half of the rounds for steals, the first round for busts. */
export function pickCandidates(key: 'best-steal' | 'worst-bust'): NonNullable<CategoryDefinition['candidates']> {
  return (archive, selection) => archive.seasons.filter(season => season.complete && (!selection.season || season.year === selection.season)).flatMap(season => {
    const draft = resultsDraft(archive, season);
    if (!draft) return [];
    const starts = recordedStarts(archive, {}, { season: season.year });
    return draft.picks.filter(pick => !pick.keeper && (key === 'worst-bust' ? pick.source.round === 1 : Number(pick.source.round) * 2 > draft.rounds)).flatMap(pick => {
      // The roster that made the pick, whoever's slot it came from.
      const team = season.teams.find(team => team.rosterId === pick.rosterId);
      if (!team) return [];
      const person = archive.people.find(person => person.id === team.personId)!;
      const own = starts.filter(start => start.playerId === pick.playerId && start.performance.personId === person.id);
      return [{ id: `${draft.id}:${pick.playerId}`, personId: person.id, name: archive.players.find(player => player.id === pick.playerId)!.name, avatar: null, metric: exactSum(own.map(start => start.points)),
        sample: `${own.length} ${own.length === 1 ? 'start' : 'starts'}`, leaderContext: `${person.name} · ${key === 'worst-bust' ? `Pick ${pick.source.pick_no}` : `Round ${pick.source.round}`} · ${season.year}`,
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
    const order = (draft.source.draft_order ?? {}) as Record<string, number>;
    const slots = draft.picks.filter(pick => pick.rosterId === champion.rosterId).map(pick => Number(pick.source.draft_slot));
    const picks = (slot: number) => slots.filter(other => other === slot).length;
    // The order names the account that drafted. A champion who took the roster over has the slot most of its picks came from.
    const slot = order[archive.people.find(person => person.id === champion.personId)!.accountId] ?? slots.sort((a, b) => picks(b) - picks(a))[0];
    return slot ? [{ slot, slots: season.teams.length, winner: { personId: champion.personId, year: season.year } }] : [];
  });
  return Array.from({ length: Math.max(0, ...titles.map(title => title.slots)) }, (_, index) => {
    const winners = titles.filter(title => title.slot === index + 1).map(title => title.winner);
    return { id: `slot-${index + 1}`, name: `Slot ${index + 1}`, avatar: null, metric: Exact.from(winners.length), sample: null, period: null, href: '', winners };
  });
}
