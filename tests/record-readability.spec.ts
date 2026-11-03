import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' }));
});

test('margin records name each participant once and open the supporting contest by keyboard', async ({ page }) => {
  await page.goto('/records/');
  for (const name of ['Closest game', 'Biggest blowout']) {
    const row = page.getByRole('row').filter({ has: page.getByRole('link', { name, exact: true }) });
    await expect(row.locator('[data-label="Value"]')).toContainText('point margin');
  }
  for (const category of ['closest-game', 'biggest-blowout']) {
    await page.goto(`/records/${category}/?season=2020`);
    await expect(page.locator('.leading-value')).toHaveText('1.25point margin');
    await expect(page.getByRole('columnheader', { name: 'Margin (points)', exact: true })).toBeAttached();
    const result = page.locator('.record-ranking tbody tr').first();
    await expect(result.getByRole('rowheader')).toHaveAccessibleName('Timh17 vs alecswartout');
    await expect(result.locator('th a')).toHaveCount(1);
    await expect(page.locator('.record-lead h2')).toHaveText('Timh17 vs alecswartout');
    await page.screenshot({ path: `.impeccable/review/ticket-24-${category}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 320, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.impeccable/review/ticket-24-${category}-320.png`, fullPage: true });
    const matchup = result.getByRole('link', { name: 'Timh17 vs alecswartout', exact: true });
    await matchup.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/seasons\/2020\/matchups\/.+\?scope=regular&week=1/);
    await expect(page.getByLabel('Official score for Harbor Crew')).toHaveText('25.5');
  }
});

test('a large shared lead stays compact while every tied result remains keyboard accessible', async ({ page }) => {
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/records/lowest-score/');
    await expect(page.locator('.shared-lead')).toHaveText('Shared lead · 38 results');
    await expect(page.locator('.record-lead .leading-identity')).toHaveCount(2);
    await expect(page.locator('.record-ranking tbody tr[data-rank="1"]')).toHaveCount(38);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.locator('.record-controls').boundingBox())!.y).toBeLessThan(900);
    await page.screenshot({ path: `.impeccable/review/ticket-24-large-tie-${width}.png`, fullPage: true });
    const ranking = page.getByRole('table', { name: 'Lowest team score rankings', exact: true });
    await page.getByRole('link', { name: 'View all 38 tied results', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(ranking).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(ranking.locator('tbody tr').first().getByRole('link')).toBeFocused();
  }
  const before = await page.locator('.record-ranking tbody tr').evaluateAll(rows => Object.fromEntries(rows.map(row => [row.id, row.getAttribute('data-rank')])));
  await page.getByLabel('Sort results').selectOption('name');
  await page.getByRole('button', { name: 'Show rankings', exact: true }).click();
  await expect(page.locator('.record-ranking tbody tr[data-rank="1"]')).toHaveCount(38);
  expect(await page.locator('.record-ranking tbody tr').evaluateAll(rows => Object.fromEntries(rows.map(row => [row.id, row.getAttribute('data-rank')])))).toEqual(before);
});

test('percentages use readable precision and keep close results distinct without changing their ranks', async ({ page }) => {
  await page.goto('/records/win-percentage/?season=2024');
  const rate = page.locator('.record-ranking tbody tr').filter({ hasText: 'Rivalry manager 04' });
  await expect(rate.locator('.record-result strong')).toHaveText('96.2%');
  await expect(rate).toContainText('12–0–1 · 13 games');
  await expect(rate).toHaveAttribute('data-rank', '2');
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/records/dominant-season/?season=2023');
    await expect(page.locator('.record-ranking tbody tr .record-result strong')).toHaveText(['20.004%', '20.003%', '-20.003%', '-20.004%']);
    await expect(page.locator('.record-ranking tbody tr')).toHaveCount(4);
    expect(await page.locator('.record-ranking tbody tr').evaluateAll(rows => rows.map(row => row.getAttribute('data-rank')))).toEqual(['1', '2', '3', '4']);
    await expect(page.locator('.lead-sample')).toHaveText('1 regular-season week');
    await expect(page.locator('.record-lead .record-context')).toHaveText('2023 season · Regular season');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.impeccable/review/ticket-24-close-percentages-${width}.png`, fullPage: true });
  }
  await page.getByLabel('Sort results').selectOption('value-asc');
  await page.getByRole('button', { name: 'Show rankings', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.record-ranking tbody tr .record-result strong')).toHaveText(['-20.004%', '-20.003%', '20.003%', '20.004%']);
  expect(await page.locator('.record-ranking tbody tr').evaluateAll(rows => rows.map(row => row.getAttribute('data-rank')))).toEqual(['4', '3', '2', '1']);
  await page.reload();
  await expect(page.getByLabel('Sort results')).toHaveValue('value-asc');
});
