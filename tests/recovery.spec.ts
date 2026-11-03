import { test, expect } from '@playwright/test';

test('recovery pages keep their response status and keyboard routes into the museum on desktop and phone', async ({ page }) => {
  const routes = [
    ['/unavailable/', 503, 'League history'],
    ['/missing-page/', 404, 'Page not found'],
    ['/seasons/1900/', 404, 'Season not found'],
    ['/managers/unknown/', 404, 'Manager not found'],
    ['/seasons/1900/matchups/unknown/', 404, 'Matchup not found'],
    ['/records/unknown/', 404, 'Record not found'],
  ] as const;

  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, status, heading] of routes) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(status);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      if (status === 503) {
        await expect(page.getByRole('main')).toContainText('League history is unavailable. Try again in a few minutes.');
      }

      const recovery = page.getByRole('navigation', { name: 'Explore the museum' });
      await expect(recovery.getByRole('link')).toHaveText(['Home', 'Records', 'Managers', 'Seasons']);
      for (const [name, href] of [['Home', '/'], ['Records', '/records/'], ['Managers', '/managers/'], ['Seasons', '/seasons/']]) {
        await expect(recovery.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
      // Page-specific history links remain before the general recovery routes.
      for (const link of await page.getByRole('main').getByRole('link').all()) {
        await page.keyboard.press('Tab');
        await expect(link).toBeFocused();
        await expect(link).toBeInViewport();
      }
      await recovery.getByRole('link', { name: 'Home', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('All-time records');

      if (width === 320) {
        await page.goto(path);
        await page.getByRole('button', { name: 'Menu', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute('aria-expanded', 'true');
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Records', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL('/records/');
      }
    }
  }
});
