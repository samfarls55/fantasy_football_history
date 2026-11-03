import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' }));
});

test('season matchups share week and game scope, open official totals and restore the selection', async ({ page }) => {
  await page.goto('/seasons/2020/');
  await page.getByRole('link', { name: 'Matchups', exact: true }).click();
  await expect(page.getByLabel('Game scope')).toHaveValue('regular');
  await page.getByLabel('Week', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Show matchups' }).click();
  await expect(page).toHaveURL(/tab=matchups&scope=regular&week=1/);
  await expect(page.getByRole('article', { name: 'Harbor Crew versus alecswartout' })).toContainText('25.5');
  await page.getByRole('link', { name: 'View matchup' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Week 1 · 2020');
  await expect(page.getByLabel('Official score for Harbor Crew')).toHaveText('25.5');
  await expect(page.getByRole('table', { name: 'Harbor Crew starters' }).getByRole('row').filter({ hasText: 'Synthetic Player 107' })).toContainText('20');
  await expect(page.getByRole('table', { name: 'Harbor Crew bench' }).getByRole('row').filter({ hasText: 'Synthetic Player 90' })).toContainText('—');
  await page.getByRole('link', { name: 'Back to 2020 season' }).click();
  await expect(page).toHaveURL(/tab=matchups&scope=regular&week=1/);
  await page.getByLabel('Game scope').focus();
  await page.keyboard.press('ArrowDown');
  await page.getByLabel('Week', { exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await page.getByRole('button', { name: 'Show matchups' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('article')).toContainText('Championship playoffs');
  await page.reload();
  await expect(page.getByLabel('Game scope')).toHaveValue('playoffs');
});

test('phone lineup hierarchy, selected bench row and keyboard controls remain usable without overflow', async ({ page }) => {
  await page.goto('/seasons/2021/?tab=matchups');
  await expect(page.getByLabel('Week', { exact: true })).toHaveValue('3');
  await expect(page.getByLabel('Week', { exact: true }).locator('option[value="4"]')).toHaveCount(0);
  await page.getByRole('article').filter({ hasText: 'Manager 1' }).getByRole('link', { name: 'View matchup' }).click();
  const path = new URL(page.url()).pathname;
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${path}?scope=regular&week=3&player=901&team=1#player-1-901`);
    await expect(page.locator('#player-1-901')).toContainText('50');
    await expect(page.locator('#player-1-901')).toHaveClass(/lineup-selected/);
    await expect(page.getByRole('heading', { name: 'Manager 1 lineup', exact: true })).toBeAttached();
    await expect(page.getByRole('table', { name: 'Manager 1 starters' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Manager 1 bench' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px`).toBe(true);
  }
  await page.getByRole('link', { name: 'Back to 2021 season' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Week', { exact: true })).toHaveValue('3');
  await expect(page.getByText(/How it’s measured|Source fixture|Last updated|Sample stats|would have won/)).toHaveCount(0);
});

test('multiweek matchups show the official aggregate and switch weekly lineups through shared links', async ({ page }) => {
  await page.goto('/seasons/2025/?tab=matchups&scope=playoffs&week=5');
  await page.getByRole('link', { name: 'View matchup' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weeks 4–5 · 2025');
  await expect(page.getByLabel('Official score for Format Manager 1')).toHaveText('30.3');
  await page.getByRole('link', { name: 'Week 4', exact: true }).click();
  await expect(page).toHaveURL(/week=4/);
  await expect(page.getByRole('table', { name: 'Format Manager 1 starters' }).getByRole('row').filter({ hasText: 'Format Player 1' })).toContainText('10.1');
});

test('missing matchups return a real 404 and invalid selection values normalize once', async ({ page }) => {
  expect((await page.goto('/seasons/2021/matchups/missing/'))?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Matchup not found' })).toBeVisible();
  await page.goto('/seasons/2021/?tab=matchups&scope=wrong&week=4');
  await expect(page).toHaveURL('/seasons/2021/?tab=matchups&scope=regular&week=3');
});
