import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' }));
});

test('imported seasons open real regular standings and share their selected order', async ({ page }) => {
  await page.goto('/seasons/');
  await expect(page.getByRole('heading', { name: 'Seasons', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '2020', exact: true }).click();
  await expect(page.getByRole('heading', { name: '2020', exact: true })).toBeVisible();
  const tim = page.getByRole('row').filter({ hasText: 'Timh17' });
  await expect(tim).toContainText('1–0');
  await expect(tim).toContainText('25.5');
  await page.getByLabel('Sort standings').selectOption('name');
  await page.getByRole('button', { name: 'Apply order' }).click();
  await expect(page).toHaveURL(/tab=standings&sort=name/);
  await page.reload();
  await expect(page.getByLabel('Sort standings')).toHaveValue('name');
  await page.getByLabel('Season', { exact: true }).selectOption('2019');
  await page.getByRole('button', { name: 'Open season' }).click();
  await expect(page).toHaveURL('/seasons/2019/?tab=standings&sort=name');
  await expect(page.getByRole('row').filter({ hasText: 'Manager 1' })).toContainText('0–0–1');
  await page.goBack();
  await expect(page.getByRole('heading', { name: '2020', exact: true })).toBeVisible();
  await expect(page.getByText(/How it’s measured|Source fixture|Last updated|Sample stats/)).toHaveCount(0);
});

test('a failed source image retains its complete rounded frame and long historical names wrap', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/seasons/2021/');
  const identity = page.getByRole('row').filter({ hasText: 'Manager 1' }).locator('.team-image');
  await expect(identity.locator('img')).toBeHidden();
  await expect(identity).toHaveText('M1');
  const frame = await identity.boundingBox();
  expect(frame?.width).toBe(44);
  expect(frame?.height).toBe(44);
  await expect(page.getByText('The Museum Team With A Very Long Historical Name That Wraps Across Lines')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('unknown years use a real shared not-found page and invalid query state normalizes once', async ({ page }) => {
  const response = await page.goto('/seasons/1900/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Season not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Browse seasons' }).click();
  await expect(page).toHaveURL('/seasons/');
  await page.goto('/seasons/2021/?tab=wrong&sort=wrong');
  await expect(page).toHaveURL('/seasons/2021/?tab=standings&sort=standing');
});

test('phone Menu restores focus and standings retain readable labels without overflow', async ({ page }) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/seasons/2021/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px`).toBe(true);
    await expect(page.getByRole('row').filter({ hasText: 'Timh17' })).toContainText('0–3');
  }
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Records', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
});
