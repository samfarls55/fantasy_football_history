import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' }));
});

test('directory opens distinct current and former careers with shareable scoped seasons and attributed games', async ({ page }) => {
  await page.goto('/managers/');
  await expect(page.getByRole('heading', { name: 'Managers', exact: true })).toBeVisible();
  await expect(page.getByRole('rowgroup', { name: 'Former managers' })).toContainText('Woody14');
  await page.getByRole('link', { name: 'Timh17', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Timh17', exact: true })).toBeVisible();
  await expect(page.getByLabel('Tenure timeline')).toContainText('Took over from Woody14');
  await expect(page.getByLabel('Tenure timeline')).toContainText('Renamed Buccaneers');
  await expect(page.getByRole('table', { name: 'Season history' })).not.toContainText('2019');
  await page.getByLabel('Game scope').selectOption('combined');
  await page.getByLabel('Season', { exact: true }).selectOption('2020');
  await page.getByRole('button', { name: 'Show history' }).click();
  await expect(page).toHaveURL(/season=2020&scope=combined/);
  await page.reload();
  await expect(page.getByLabel('Game scope')).toHaveValue('combined');
  await page.getByRole('link', { name: '2020', exact: true }).click();
  await expect(page).toHaveURL('/managers/person-608473907007143936/seasons/2020/?scope=combined');
  await expect(page.getByRole('table', { name: '2020 matchup history' })).toContainText('alecswartout');
  await expect(page.getByRole('table', { name: '2020 matchup history' })).toContainText('25.5');
  await page.getByLabel('Sort games').selectOption('oldest');
  await page.getByRole('button', { name: 'Show matchups' }).click();
  await expect(page).toHaveURL(/scope=combined&sort=oldest/);
  await page.getByRole('link', { name: 'Week 1', exact: true }).click();
  await expect(page).toHaveURL('/seasons/2020/matchups/900000000000002020-w1-m1/?scope=combined&week=1');
  await page.goBack();
  await expect(page.getByLabel('Sort games')).toHaveValue('oldest');
  await page.getByLabel('Season', { exact: true }).selectOption('2021');
  await page.getByRole('button', { name: 'Show matchups' }).click();
  await expect(page).toHaveURL('/managers/person-608473907007143936/seasons/2021/?scope=combined&sort=oldest');
  await expect(page.getByText(/Source fixture|How it’s measured|Last updated|Sample stats/)).toHaveCount(0);
});

test('phone timeline is vertical above the season archive and complete image frames retain fallbacks', async ({ page }) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/managers/person-800000000000000001/');
    await expect(page.getByLabel('Tenure timeline')).toContainText('First recorded season');
    await expect(page.getByLabel('Tenure timeline')).toContainText('Recorded again');
    const timeline = await page.getByLabel('Tenure timeline').boundingBox();
    const tabs = await page.getByRole('navigation', { name: 'Manager views' }).boundingBox();
    expect(timeline!.y + timeline!.height).toBeLessThan(tabs!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px`).toBe(true);
    await page.goto('/managers/person-608473907007143936/');
    if (width <= 600) {
      const events = await page.locator('.timeline-tenure li').all();
      const first = await events[0].boundingBox();
      const second = await events[1].boundingBox();
      expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height);
      expect(second!.x).toBe(first!.x);
    }
    await page.goto('/managers/');
    const frames = await page.locator('.directory-table .team-image').evaluateAll(items => items.map(item => ({ width: item.getBoundingClientRect().width, height: item.getBoundingClientRect().height })));
    expect(frames.every(frame => frame.width === 44 && frame.height === 44)).toBe(true);
  }
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/managers/person-800000000000000001/');
  await expect(page.locator('.profile-identity .team-image img')).toBeHidden();
  await expect(page.locator('.profile-identity .team-image')).toHaveText('M1');
});

test('unknown people and unowned seasons return 404 and invalid URL filters normalize', async ({ page }) => {
  expect((await page.goto('/managers/missing/'))?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Manager not found' })).toBeVisible();
  expect((await page.goto('/managers/person-608473907007143936/seasons/2019/'))?.status()).toBe(404);
  await page.goto('/managers/person-608473907007143936/?scope=wrong&season=2019&tab=wrong');
  await expect(page).toHaveURL('/managers/person-608473907007143936/?tab=seasons&scope=regular');
});
