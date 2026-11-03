import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' }));
});

test('season awards label the measured season instead of their recognition week', async ({ page }) => {
  await page.goto('/records/dominant-season/');
  await expect(page.getByRole('columnheader', { name: 'Season', exact: true })).toBeAttached();
  await expect(page.locator('.record-lead .record-context')).toHaveText('2019 season · Regular season');
  await expect(page.locator('.record-ranking tbody tr').first().locator('[data-label="Season"]')).toHaveText('2019 season');
  await expect(page.getByText('Week 4 · 2019', { exact: true })).toHaveCount(0);
  await expect(page.locator('.lead-sample')).toHaveText('1 regular-season week');
});

test('season record definitions distinguish dominance and the opposite schedule sign without changing history links', async ({ page }) => {
  for (const key of ['dominant-season', 'best-without-title']) {
    await page.goto(`/records/${key}/?season=2019`);
    await expect(page.getByText("Points per played regular-season week versus that season's league average. +10% means 10% above average.", { exact: true })).toBeVisible();
    if (key === 'best-without-title') await expect(page.getByText('Completed seasons without a title.', { exact: true })).toBeVisible();
    const first = page.locator('.record-ranking tbody tr').first();
    await expect(first).toContainText('2019');
    await expect(first).toContainText('1 regular-season week');
    await expect(page.locator('.leading-value')).toHaveText('73.8%');
    await expect(first).toHaveAttribute('data-rank', '1');
    await page.getByRole('link', { name: 'Open season', exact: true }).click();
    await expect(page).toHaveURL('/managers/person-472580465006473216/seasons/2019/?scope=regular');
  }
  await page.goto('/records/unluckiest-season/?season=2019');
  await expect(page.getByText("Expected minus actual wins, the opposite of standings' Wins vs expected. Positive means fewer wins than expected.", { exact: true })).toBeVisible();
  await expect(page.getByText("Expected wins sum each week's share of other teams outscored. Ties count as half.", { exact: true })).toBeVisible();
  await expect(page.locator('.leading-value')).toHaveText('0.4wins below expected');
  await expect(page.locator('.lead-sample')).toHaveText('1 regular-season week');
  await page.getByRole('link', { name: 'Open season', exact: true }).click();
  await expect(page).toHaveURL('/managers/person-473910025325113344/seasons/2019/?scope=regular');
  await page.goto('/seasons/2019/');
  const alec = page.getByRole('row').filter({ hasText: 'alecswartout' });
  await expect(alec.locator('[data-label="Wins vs expected"]')).toHaveText('-0.4');
  await alec.locator('[data-label="Wins vs expected"] a').click();
  await expect(page.locator('.selected-record')).toContainText('0.4');
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByText("Expected minus actual wins, the opposite of standings' Wins vs expected. Positive means fewer wins than expected.", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.impeccable/review/ticket-23-record-${width}.png`, fullPage: true });
  }
});

test('standings explain their season scoring and expected-win comparisons beside the results', async ({ page }) => {
  await page.goto('/seasons/2021/');
  await expect(page.getByText('Regular season · 3 completed weeks', { exact: true })).toBeVisible();
  await expect(page.getByText("Points per played week versus the season's league average. +10% means 10% above average.", { exact: true })).toBeVisible();
  await expect(page.getByText('Actual minus expected wins. Positive means more wins than expected.', { exact: true })).toBeVisible();
  await expect(page.getByText("Expected wins sum each week's share of other teams outscored. Ties count as half.", { exact: true })).toBeVisible();
  const tim = page.getByRole('row').filter({ hasText: 'Timh17' });
  await expect(tim.locator('[data-label="Scoring vs league"]')).toHaveText('-20.0%');
  await expect(tim.locator('[data-label="Wins vs expected"]')).toHaveText('-1.0');
  await expect(tim.locator('[data-label="Wins vs expected"] a')).toHaveAttribute('href', '/managers/person-608473907007143936/seasons/2021/?scope=regular');
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByText("Expected wins sum each week's share of other teams outscored. Ties count as half.", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.impeccable/review/ticket-23-standings-${width}.png`, fullPage: true });
  }
});
