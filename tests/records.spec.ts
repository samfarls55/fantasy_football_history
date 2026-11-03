import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' }));
});

test('four-group Records opens tied career rankings and preserves shared selection, ranks and browser Back', async ({ page }) => {
  await page.goto('/records/');
  for (const name of ['Careers', 'Seasons', 'Matchups', 'Players']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Most championships', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Most championships', exact: true })).toBeVisible();
  await expect(page.getByLabel('Game scope')).toHaveCount(0);
  await page.goto('/records/championships/?scope=regular');
  await expect(page).toHaveURL('/records/championships/');
  await expect(page.locator('.record-lead')).toContainText('Shared lead');
  await expect(page.locator('.record-lead')).toContainText('Timh17');
  await page.goto('/records/career-points/?season=2020&scope=combined');
  const ranks = await page.locator('.record-ranking tbody tr').evaluateAll(rows => Object.fromEntries(rows.map(row => [row.id, row.getAttribute('data-rank')])));
  await page.getByLabel('Sort results').selectOption('name');
  await page.getByRole('button', { name: 'Show rankings' }).click();
  await expect(page).toHaveURL('/records/career-points/?season=2020&scope=combined&sort=name');
  await expect(page.getByLabel('Season', { exact: true })).toHaveValue('2020');
  const sortedRanks = await page.locator('.record-ranking tbody tr').evaluateAll(rows => Object.fromEntries(rows.map(row => [row.id, row.getAttribute('data-rank')])));
  expect(sortedRanks).toEqual(ranks);
  await page.locator('.record-ranking').getByRole('link', { name: 'Timh17', exact: true }).click();
  await expect(page).toHaveURL('/managers/person-608473907007143936/?season=2020&scope=combined');
  await page.goBack();
  await expect(page.getByLabel('Sort results')).toHaveValue('name');
  await page.reload();
  await expect(page.getByLabel('Game scope')).toHaveValue('combined');
  await page.getByRole('link', { name: 'Most wins', exact: true }).click();
  await expect(page).toHaveURL(/records\/wins\/\?season=2020&scope=combined&sort=name/);
  await expect(page.getByText(/How it’s measured|Last updated|Sample stats|Source JSON/)).toHaveCount(0);
});

test('expanded URL and context survive sorting while rates show sample sizes and empty scope is honest', async ({ page }) => {
  await page.goto('/records/career-points/');
  await expect(page.getByRole('link', { name: 'Show more', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Show more', exact: true }).click();
  await expect(page).toHaveURL(/limit=20/);
  const count = await page.locator('.record-ranking tbody tr').count();
  expect(count).toBeGreaterThan(10);
  const selectedId = (await page.locator('.record-ranking tbody tr').last().getAttribute('id'))!.replace('result-', '');
  await page.goto(`/records/career-points/?scope=regular&limit=20&result=${selectedId}`);
  await expect(page.locator('.selected-record')).toHaveAttribute('id', `result-${selectedId}`);
  await page.getByLabel('Sort results').selectOption('oldest');
  await page.getByRole('button', { name: 'Show rankings' }).click();
  await expect(page).toHaveURL(/sort=oldest&limit=20&result=/);
  await expect(page.locator('.selected-record')).toHaveAttribute('id', `result-${selectedId}`);
  await page.reload();
  expect(await page.locator('.record-ranking tbody tr').count()).toBe(count);
  await page.goto('/records/win-percentage/?season=2019');
  await expect(page.locator('.record-ranking')).toContainText('0–0–1 · 1 game');
  await page.getByLabel('Game scope').selectOption('consolation');
  await page.getByRole('button', { name: 'Show rankings' }).click();
  await expect(page.getByText('No qualifying results.')).toBeVisible();
  const bad = await page.goto('/records/not-a-category/');
  expect(bad?.status()).toBe(404);
});

test('Records collection and category stack cleanly on phones and support keyboard controls', async ({ page }) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/records/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px collection`).toBe(true);
    await page.screenshot({ path: `.impeccable/review/ticket-9-collection-${width}.png`, fullPage: true });
    await page.goto('/records/win-percentage/?season=2019');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px category`).toBe(true);
    await expect(page.locator('.record-ranking')).toContainText('0–0–1 · 1 game');
    await page.screenshot({ path: `.impeccable/review/ticket-9-category-${width}.png`, fullPage: true });
    if (width <= 760) {
      const identity = await page.locator('.record-ranking tbody th').first().boundingBox();
      const value = await page.locator('.record-ranking .record-result').first().boundingBox();
      expect(value!.y).toBeGreaterThan(identity!.y);
      expect(identity!.width).toBeGreaterThan(width - 100);
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused();
    }
  }
  await page.getByLabel('Season', { exact: true }).focus();
  await expect(page.getByLabel('Season', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Game scope')).toBeFocused();
  await page.getByRole('button', { name: 'Show rankings' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Highest win percentage', exact: true })).toBeVisible();
});
