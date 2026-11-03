import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' }));
});

test('weekly score rankings open the official matchup with the selected week and team and restore sorted filters', async ({ page }) => {
  await page.goto('/records/highest-score/?season=2020&scope=regular&sort=newest');
  await expect(page.locator('.record-lead')).toContainText('25.5');
  await page.getByRole('link', { name: 'Open matchup', exact: true }).click();
  await expect(page).toHaveURL(/scope=regular&week=1&team=7/);
  await expect(page.locator('.score-team[data-selected="true"]')).toContainText('Harbor Crew');
  await expect(page.getByLabel('Official score for Harbor Crew')).toHaveText('25.5');
  await expect(page.locator('.score-team[data-selected="true"] .team-image')).toHaveCSS('outline-style', 'solid');
  await page.screenshot({ path: '.impeccable/review/ticket-10-selected-matchup-1440.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: '.impeccable/review/ticket-10-selected-matchup-390.png', fullPage: true });
  await page.goBack();
  await expect(page.getByLabel('Sort results')).toHaveValue('newest');
  await expect(page.getByLabel('Season', { exact: true })).toHaveValue('2020');
  await page.reload();
  await expect(page.getByLabel('Game scope')).toHaveValue('regular');
  await page.getByRole('link', { name: 'Closest game', exact: true }).click();
  await expect(page).toHaveURL('/records/closest-game/?season=2020&scope=regular&sort=newest');
  await expect(page.locator('.record-ranking tbody tr')).toHaveCount(1);
  await expect(page.locator('.record-ranking')).toContainText('1.25');
  await expect(page.locator('.record-ranking')).toContainText('alecswartout');
});

test('streak rankings open the selected interval and actual counted games, including through share and Back', async ({ page }) => {
  await page.goto('/records/winning-streak/?season=2021&scope=regular&sort=name');
  const row = page.locator('.record-ranking tbody tr').filter({ hasText: 'Manager 2' });
  await expect(row).toContainText('Week 1 · 2021 – Week 3 · 2021');
  await row.getByRole('link', { name: 'Manager 2', exact: true }).click();
  await expect(page).toHaveURL(/season=2021&scope=regular&streak=winning&from=.+&through=/);
  await expect(page.getByRole('table', { name: 'Winning streak history' })).toBeVisible();
  await expect(page.locator('.streak-history tbody tr')).toHaveCount(3);
  await expect(page.locator('.streak-interval')).toHaveText('Winning streak · 3 games · Week 1 · 2021 – Week 3 · 2021');
  await page.reload();
  await expect(page.locator('.streak-history tbody tr')).toHaveCount(3);
  await page.locator('.streak-history tbody tr').first().getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Week 1 · 2021');
  await page.goBack();
  await expect(page.locator('.streak-history tbody tr')).toHaveCount(3);
  await page.goBack();
  await expect(page.getByLabel('Sort results')).toHaveValue('name');
});

test('a weekly score in a multiweek contest opens its leg with the official weekly total beside the final aggregate', async ({ page }) => {
  await page.goto('/records/lowest-score/?season=2025&scope=playoffs&limit=20');
  const row = page.locator('.record-ranking tbody tr').filter({ hasText: 'Format Manager 1' }).filter({ hasText: 'Week 4 · 2025' });
  await expect(row).toContainText('10.1');
  await row.getByRole('link', { name: 'Format Manager 1', exact: true }).click();
  await expect(page).toHaveURL(/scope=playoffs&week=4&team=1/);
  await expect(page.getByLabel('Official score for Format Manager 1')).toHaveText('30.3');
  await expect(page.getByLabel('Official week 4 score for Format Manager 1')).toHaveText('Week 4 · 10.1 points');
  await expect(page.getByRole('link', { name: 'Week 4', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: '.impeccable/review/ticket-10-weekly-leg-matchup-1440.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.impeccable/review/ticket-10-weekly-leg-matchup-390.png', fullPage: true });
});

test('repeated performance leaders are shared results and the six categories fit desktop and phone layouts', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/records/highest-score/?season=2021');
  await expect(page.locator('.shared-lead')).toHaveText('Shared lead · 3 results');
  for (const week of [1, 2, 3]) await expect(page.locator('.leading-identity').filter({ hasText: `Week ${week} · 2021` })).toHaveCount(1);
  await expect(page.locator('.record-ranking tbody tr').filter({ hasText: 'sebastian12' })).toHaveCount(3);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const category of ['highest-score', 'lowest-score', 'closest-game', 'biggest-blowout', 'winning-streak', 'losing-streak']) {
      await page.goto(`/records/${category}/`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${category} at ${width}px`).toBe(true);
      await page.screenshot({ path: `.impeccable/review/ticket-10-${category}-${width}.png`, fullPage: true });
    }
    await page.goto('/records/winning-streak/?season=2021');
    await page.locator('.record-ranking tbody tr').filter({ hasText: 'Manager 2' }).getByRole('link', { name: 'Manager 2', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `streak interval at ${width}px`).toBe(true);
    await page.screenshot({ path: `.impeccable/review/ticket-10-streak-history-${width}.png`, fullPage: true });
  }
});
