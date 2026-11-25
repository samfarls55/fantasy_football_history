import type { AstroGlobal } from 'astro';
import { ensureLeague, leagueStorePath } from './leagues.ts';
import { readSeasons } from './history/read.ts';
import { readPlaceRecords } from './history/records.ts';
import { withHistorySnapshot } from './history/store.ts';
import { readTabs, tabs as allTabs, type TabKey } from './history/tabs.ts';

type Page = Pick<AstroGlobal, 'params' | 'url'>;

type Tabs = NonNullable<Awaited<ReturnType<typeof readTabs>>>;
/** One publication's tabs never change, and every page shows them, so each league's are worked out once per import. */
const tabsOf = new Map<string, { importedAt: string; tabs: Tabs }>();

/** Every page under a league opens the same way: import it if needed, then read its tabs and its whole view from one publication, or say why it can't be shown. */
export async function openLeague<T>(page: Page & Pick<AstroGlobal, 'response'>, read: (storePath: string) => Promise<T>) {
  const id = page.params.id!;
  const { status, archive } = /^\d+$/.test(id) ? await ensureLeague(id) : { status: 'missing' as const, archive: null };
  if (status === 'ready') {
    const storePath = leagueStorePath(id);
    return withHistorySnapshot(archive, async () => {
      if (tabsOf.get(id)?.importedAt !== archive!.importedAt) tabsOf.set(id, { importedAt: archive!.importedAt, tabs: (await readTabs({ storePath }))! });
      return { failure: null, tabs: tabsOf.get(id)!.tabs, view: await read(storePath) };
    }, storePath);
  }
  page.response.status = status === 'missing' ? 404 : 502;
  return { failure: status, tabs: [] as Tabs, view: null };
}

/** A tab's page: its record cards and whatever else it reads, and the frame its layout takes. A tab this league has no stat for sends the visitor Home. */
export async function openTab<T = {}>(page: Page & Pick<AstroGlobal, 'response' | 'redirect'>, key: TabKey, read: (storePath: string) => Promise<T> = async () => ({}) as T) {
  const { failure, tabs, view } = await openLeague(page, async storePath => ({
    league: (await readSeasons(storePath))![0].name,
    records: (await readPlaceRecords(allTabs.find(tab => tab.key === key)!.places, { storePath }))!,
    ...await read(storePath),
  }));
  const tab = tabs.find(tab => tab.key === key);
  return { redirect: view && !tab ? page.redirect(leagueHref(page)) : null, frame: { failure, tabs, tab, league: view?.league }, view };
}

/** The Sleeper username the visitor looked up, from ?u=. */
export function viewer(page: Page): string {
  return page.url.searchParams.get('u')?.trim() ?? '';
}

/** A link inside this league; ?u= rides along so the visitor stays marked. */
export function leagueHref(page: Page, path = '', query: Record<string, string> = {}): string {
  const u = viewer(page);
  const search = new URLSearchParams({ ...(u && { u }), ...query }).toString();
  return `/leagues/${page.params.id}${path}${search && `?${search}`}`;
}

export function tabHref(page: Page, key: TabKey): string {
  return leagueHref(page, key === 'home' ? '' : `/${key}`);
}

export function managerHref(page: Page, name: string, query: Record<string, string> = {}): string {
  return leagueHref(page, `/managers/${encodeURIComponent(name)}`, query);
}

export function isViewer(page: Page, name: string): boolean {
  return name.toLowerCase() === viewer(page).toLowerCase();
}

export function fixed(number: number, digits: number): string {
  return number.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
