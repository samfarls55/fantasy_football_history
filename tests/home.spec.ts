import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const categories = ['best-without-title', 'benched-player', 'unluckiest-season', 'productive-pickup', 'productive-drop', 'winning-streak'];

test.beforeEach(async ({ page }) => {
  await page.route('https://sleepercdn.com/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' }));
});

test('Home offers varied recent top-ten results without claiming newly broken records', async ({ page }) => {
  await page.goto('/');
  const recent = page.getByRole('region', { name: 'Recent top-ten results', exact: true });
  await expect(recent).toBeVisible();
  const links = recent.getByRole('link');
  await expect(links).toHaveCount(6);
  const destinations = await links.evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href));
  expect(new Set(destinations.map(href => new URL(href).pathname)).size).toBe(6);
  await expect(recent).not.toContainText(/new record|record broken/i);
  for (const label of await recent.locator('.home-recent-identity > span:last-child').allTextContents()) expect(label).toMatch(/ · Rank (?:[1-9]|10)$/);
  await page.reload();
  expect(await links.evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href))).toEqual(destinations);
});

test('Home season awards show their season and regular-season sample instead of their recognition week', async ({ page }) => {
  await page.goto('/');
  const season = page.locator('[data-category="best-without-title"]');
  await expect(season).toContainText('2019 season');
  await expect(season).toContainText('1 regular-season week');
  await expect(season).not.toContainText('Week 4');
  const unlucky = page.locator('[data-category="unluckiest-season"]');
  await expect(unlucky).toContainText('2025 season');
  await expect(unlucky).toContainText('1 regular-season week');
  await expect(unlucky).not.toContainText(/Week \d/);
  await season.getByRole('link', { name: 'View rankings' }).click();
  await page.locator('.record-ranking tbody tr').first().locator('th a').first().click();
  await expect(page).toHaveURL(/\/managers\/[^/]+\/seasons\/2019\/\?scope=regular$/);
  await expect(page.getByLabel('2019 season summary')).toContainText('Woody14');
});

test('Home composes six all-time categories and historical recent results from the published archive', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link')).toHaveText(['Records', 'Managers', 'Seasons', 'Rivalries']);
  await expect(page.locator('.museum-header [aria-current]')).toHaveCount(0);
  await expect(page.locator('.home-feature h2')).toHaveText(['Best season without a title', 'Highest-scoring benched player']);
  await expect(page.locator('.home-index tbody tr')).toHaveCount(4);
  await expect(page.locator('[data-category="best-without-title"]')).toContainText('Woody14');
  await expect(page.locator('[data-category="best-without-title"] .home-value')).toHaveText('+73.8%');
  await expect(page.locator('[data-category="productive-pickup"]')).toContainText('Timh17 with Synthetic Player 107');
  await expect(page.locator('[data-category="productive-drop"]')).toContainText('sebastian12 with Synthetic Player 50');
  for (const key of categories) await expect(page.locator(`[data-category="${key}"] .home-category-link`)).toHaveAttribute('href', new RegExp(`^/records/${key}/`));
  await expect(page.locator('.home-recent li')).toHaveCount(6);
  await expect(page.locator('.home-recent')).toContainText('Week 5 · 2025');
  for (const href of await page.locator('.home-recent li > a').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href))) expect(new URL(href).searchParams.has('result')).toBe(true);
  await expect(page.getByText(/Sample stats|Sample archive|Recently added|How it’s measured|Source fixture|View sample data|View evidence|Last updated/)).toHaveCount(0);
  await expect(page.getByLabel('Game scope')).toHaveCount(0);
  expect((await request.get('/sample-history.json')).status()).toBe(404);
});

test('features and compact records open their real rankings and then actual history, preserving Back context', async ({ page }) => {
  for (const key of categories) {
    await page.goto('/');
    await page.locator(`[data-category="${key}"] .home-category-link`).click();
    await expect(page).toHaveURL(new RegExp(`/records/${key}/`));
    // This fixture deliberately blocks all-time bench claims. A covered season still opens actual history.
    if (key === 'benched-player') {
      await expect(page.getByText('Results unavailable for this selection.', { exact: true })).toBeVisible();
      await page.getByLabel('Season', { exact: true }).selectOption('2021');
      await page.getByRole('button', { name: 'Show rankings', exact: true }).click();
    }
    const first = page.locator('.record-ranking tbody tr').first();
    const historyLink = first.locator('th a').first();
    const destination = await historyLink.getAttribute('href');
    await historyLink.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => new URL(page.url()).pathname).toBe(new URL(destination!, 'http://museum.test').pathname);
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/not found/i);
    await expect(page.locator('.not-found')).toHaveCount(0);
    if (key === 'best-without-title') {
      await expect(page.getByLabel('2019 season summary')).toContainText('Woody14');
      await expect(page.getByRole('table', { name: '2019 matchup history' }).locator('tbody tr')).toHaveCount(1);
      await expect(page.getByRole('table', { name: '2019 matchup history' })).toContainText('15.5 – 9.5');
    } else if (key === 'benched-player') {
      await expect(page.locator('.lineup-selected')).toContainText('Synthetic Player 901');
      await expect(page.locator('.lineup-selected')).toContainText('50');
      await expect(page.locator('.lineup-selected')).toHaveAttribute('aria-current', 'true');
    } else if (key === 'unluckiest-season') {
      await expect(page.getByLabel('2025 season summary')).toContainText('Format Manager 2');
    } else if (key === 'productive-pickup') {
      await expect(page.locator('.pickup-context')).toContainText('2021 · Week 0 pickup');
      await expect(page.locator('.contribution-facts dd')).toHaveText(['38', '3']);
    } else if (key === 'productive-drop') {
      await expect(page.locator('.drop-context')).toContainText('Synthetic Player 50');
      await expect(page.locator('.drop-context .contribution-facts dd')).toHaveText(['11', '1']);
    } else {
      await expect(page.locator('.streak-interval')).toContainText('Winning streak · 13 games');
      await expect(page.locator('.streak-history tbody tr')).toHaveCount(13);
    }
    await page.goBack();
    await expect(page.locator('.record-ranking')).toBeVisible();
  }
});

test('a recent result retains category selection and opens its supporting historical row', async ({ page }) => {
  await page.goto('/');
  const recent = page.locator('.home-recent li > a').first();
  const href = await recent.getAttribute('href');
  const result = new URL(href!, 'http://museum.test').searchParams.get('result');
  await recent.click();
  const selected = page.locator(`[id="result-${result}"]`);
  await expect(selected).toHaveClass(/selected-record/);
  await selected.locator('th a').first().click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/not found/i);
  await page.goBack();
  await expect(selected).toHaveClass(/selected-record/);
});

test('Home keeps approved feature artwork complete, wraps names and stacks its index on phones', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1600, 1440, 980, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`).toBe(true);
    const image = page.locator('.home-feature .home-artwork img').first();
    const feature = await page.locator('.home-feature').first().boundingBox();
    const frame = await image.boundingBox();
    expect(frame!.x).toBeGreaterThanOrEqual(feature!.x);
    expect(frame!.x + frame!.width).toBeLessThanOrEqual(feature!.x + feature!.width);
    expect(await image.evaluate(image => getComputedStyle(image).objectFit)).toBe('contain');
    const metric = page.locator('.home-feature').first().locator('.home-value');
    expect(await metric.evaluate(element => element.scrollWidth <= element.clientWidth), `unbroken metric at ${width}px`).toBe(true);
    await expect(page.locator('.home-feature').first().locator('.home-category-link')).toBeInViewport();
    if (width <= 760) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused();
      const row = page.locator('.home-index tbody tr').first();
      expect((await row.locator('.home-index-result').boundingBox())!.y).toBeGreaterThan((await row.locator('th').boundingBox())!.y);
    }
    if ([1440, 390, 320].includes(width)) await page.screenshot({ path: `.impeccable/review/ticket-22-home-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('failed artwork preserves owning identity without a fictional image or result', async ({ page }) => {
  await page.unroute('https://sleepercdn.com/**');
  await page.route('https://sleepercdn.com/**', route => route.abort());
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const feature = page.locator('.home-feature').first();
    await expect(feature.locator('.home-artwork')).toBeVisible();
    await expect(feature.locator('.home-artwork img')).toBeHidden();
    await expect(feature.locator('.home-artwork .team-image > span')).toBeVisible();
    await expect(feature.locator('.home-artwork .team-image')).toHaveText('W');
    await expect(feature.locator('figcaption')).toContainText('Woody14');
    await expect(page.locator('[data-category="benched-player"]')).toContainText('Results unavailable');
    await expect(page.locator('[data-category="benched-player"] .home-value')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `failed artwork at ${width}px`).toBe(true);
    if (width === 390) await page.screenshot({ path: '.impeccable/review/ticket-22-home-failed-artwork.png', fullPage: true });
  }
});
