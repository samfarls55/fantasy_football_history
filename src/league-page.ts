import type { AstroGlobal } from 'astro';
import { ensureLeague, leagueStorePath } from './leagues.ts';
import { withHistorySnapshot } from './history/store.ts';

type Page = Pick<AstroGlobal, 'params' | 'url'>;

/** Every page under a league opens the same way: import it if needed, then read its whole view from one publication, or say why it can't be shown. */
export async function openLeague<T>(page: Page & Pick<AstroGlobal, 'response'>, read: (storePath: string) => Promise<T>) {
  const id = page.params.id!;
  const { status, archive } = /^\d+$/.test(id) ? await ensureLeague(id) : { status: 'missing' as const, archive: null };
  if (status === 'ready') {
    const storePath = leagueStorePath(id);
    return { failure: null, view: await withHistorySnapshot(archive, () => read(storePath), storePath) };
  }
  page.response.status = status === 'missing' ? 404 : 502;
  return { failure: status, view: null };
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

export function managerHref(page: Page, name: string, query: Record<string, string> = {}): string {
  return leagueHref(page, `/managers/${encodeURIComponent(name)}`, query);
}

export function isViewer(page: Page, name: string): boolean {
  return name.toLowerCase() === viewer(page).toLowerCase();
}

export function fixed(number: number, digits: number): string {
  return number.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
