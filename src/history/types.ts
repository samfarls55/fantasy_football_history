/** Persisted, provider-independent history. Provider IDs always remain strings. */
export type Scope = 'regular' | 'playoffs' | 'combined' | 'consolation' | 'placement';
export type Competition = Exclude<Scope, 'combined'>;
export interface Person { id: string; accountId: string; name: string; avatar: string | null; current: boolean }
export interface Franchise { id: string; name: string; rosterId: string }
export interface SeasonTeam {
  id: string; rosterId: string; franchiseId: string; personId: string; name: string;
  nameSource: 'historical-roster' | 'account-fallback'; avatar: string | null;
  standing: number | null; finish: number | null; playoffSeed: number | null;
}
export interface Season {
  id: string; year: string; name: string; previousLeagueId: string | null;
  complete: boolean; completedWeeks: number[]; regularWeeks: number[];
  teams: SeasonTeam[]; scoring: Record<string, number>; settings: Record<string, unknown>;
  rosterPositions: string[]; championId: string | null; runnerUpId: string | null;
  playoffPersonIds: string[]; bracket: BracketEntry[];
}
export interface Player { id: string; name: string; position: string | null }
export interface LineupPlayer { playerId: string; slot: string | null; points: number | null }
export interface Performance {
  id: string; contestId: string; seasonId: string; year: string; week: number;
  personId: string; franchiseId: string; rosterId: string; teamName: string;
  competition: Competition; points: number; sourcePoints: number; overridePoints: number | null;
  starters: LineupPlayer[]; bench: LineupPlayer[];
  weeklyMatchupId: string;
  /** Only provider-supported historical precision. Year/week labels are not fabricated dates. */
  playedAt: string | null;
}
export interface ContestSide { personId: string; franchiseId: string; rosterId: string; teamName: string; points: number }
export interface Contest {
  id: string; seasonId: string; year: string; competition: Competition;
  weeks: number[]; sides: [ContestSide, ContestSide]; performanceIds: string[];
  winnerId: string | null; tie: boolean; championship: boolean; round: number | null;
  /** Only finalized contests enter W-L-T; completed legs may exist before this is true. */
  complete: boolean; bracketId: string | null;
  playedAt: string | null;
}
export interface BracketEntry {
  id: string; competition: Competition; round: number; match: number;
  rosterA: string | null; rosterB: string | null; winnerRosterId: string | null;
  loserRosterId: string | null; placement: number | null; contestId: string | null;
  weeks: number[]; bye: boolean;
  family: 'winners' | 'losers'; championship: boolean;
  fromA: { outcome: 'w' | 'l'; match: number } | null;
  fromB: { outcome: 'w' | 'l'; match: number } | null;
}
export interface Transaction {
  id: string; seasonId: string; year: string; week: number;
  type: string; status: string; completedAt: number | null;
  adds: Record<string, string>; drops: Record<string, string>;
  /** Exact source event and assets retained internally, never exposed as a public feed. */
  source: Record<string, unknown>;
  /** Production Sleeper has no documented per-player historical start timestamp. */
  orderingSupported: boolean;
}
export interface Draft {
  id: string; seasonId: string; source: Record<string, unknown>;
  picks: Array<{ playerId: string; rosterId: string | null; keeper: boolean | null; source: Record<string, unknown> }>;
}
export interface CoverageIssue { seasonId: string | null; area: string; detail: string; blocks: string[] }
export interface Archive {
  version: 1; leagueId: string; importedAt: string;
  seasons: Season[]; people: Person[]; franchises: Franchise[];
  contests: Contest[]; performances: Performance[]; players: Player[];
  transactions: Transaction[]; drafts: Draft[]; coverage: CoverageIssue[];
  /** Raw read-only provider responses retained for replay/provenance; not in public routes. */
  source: Record<string, unknown>;
}
export interface Provider { get(path: string): Promise<unknown> }
export interface RefreshOptions { leagueId?: string; storePath?: string; provider?: Provider; now?: Date }
export interface RefreshResult { archive: Archive; changed: boolean; storePath: string }
