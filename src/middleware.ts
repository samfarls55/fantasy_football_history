import { defineMiddleware } from 'astro:middleware';
import { readArchive, withHistorySnapshot } from './history/store';

/** Pin every composite page to one publication for the lifetime of its request. */
export const onRequest = defineMiddleware(async (context, next) => {
  // Public files do not depend on league history, including initial server readiness.
  if (/^\/(assets|fonts|_astro)\//.test(context.url.pathname)) return next();
  return withHistorySnapshot(async () => {
    if (!await readArchive() && context.url.pathname !== '/unavailable/') {
      return context.rewrite('/unavailable/');
    }
    return next();
  });
});
