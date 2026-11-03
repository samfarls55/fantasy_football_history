import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
const tim = 'person-608473907007143936';
const spell = '900000000000002021:930000000000000001:107:7';
test.beforeEach(async ({ page }) => { await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' })); });

test('a pickup result opens its selected spell and preserves year, scope, game links and Back before returning to whole manager history', async ({ page }) => {
  await page.goto('/records/productive-pickup/?season=2021&scope=regular');
  const result = page.locator('.record-ranking tbody tr').filter({ hasText: 'Synthetic Player 107' });
  await expect(result).toContainText('38');
  await expect(result).toContainText('Timh17');
  await result.getByRole('link', { name: 'Synthetic Player 107', exact: true }).click();
  await expect(page).toHaveURL(`/managers/${tim}/players/107/?scope=regular&season=2021&pickup=${encodeURIComponent(spell)}`);
  await expect(page.locator('.pickup-context')).toContainText('2021 · Week 0 pickup');
  await expect(page.locator('.contribution-facts dd')).toHaveText(['38', '3']);
  await expect(page.locator('.contribution-games tbody tr')).toHaveCount(3);
  await page.reload();
  await page.getByLabel('Game scope', { exact: true }).selectOption('combined');
  await page.getByRole('button', { name: 'Show contributions', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`pickup=${encodeURIComponent(spell)}`));
  await expect(page.getByLabel('Game scope', { exact: true })).toHaveValue('combined');
  await expect(page.locator('.contribution-facts dd')).toHaveText(['38', '3']);
  await page.getByRole('link', { name: 'Week 2', exact: true }).click();
  await expect(page.locator('.lineup-selected')).toContainText('Synthetic Player 107');
  await expect(page).toHaveURL(/scope=combined&week=2&player=107&team=7/);
  await page.goBack();
  await expect(page.locator('.pickup-context')).toBeVisible();
  await page.getByRole('link', { name: 'Whole manager history', exact: true }).click();
  await expect(page).toHaveURL(`/managers/${tim}/players/107/?scope=combined&season=2021`);
  await expect(page.locator('.contribution-facts dd')).toHaveText(['88.5', '5']);
  await page.goto(`/managers/${tim}/seasons/2021/?tab=players&scope=regular`);
  await expect(page.locator('.pickups-table')).toContainText('38');
  await page.locator('.pickups-table').getByRole('link', { name: 'Synthetic Player 107', exact: true }).click();
  await expect(page.locator('.contribution-facts dd')).toHaveText(['38', '3']);
  expect((await page.goto(`/managers/${tim}/players/107/?pickup=wrong-spell`))?.status()).toBe(404);
});

test('pickup category, contextual list and selected history reflow on phones with native controls and keyboard Menu', async ({ page }) => {
  const targets = [
    ['category', '/records/productive-pickup/?season=2021&scope=regular'],
    ['players', `/managers/${tim}/seasons/2021/?tab=players&scope=regular`],
    ['spell', `/managers/${tim}/players/107/?scope=regular&season=2021&pickup=${encodeURIComponent(spell)}`],
  ];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, path] of targets) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} at ${width}px`).toBe(true);
      await page.screenshot({ path: `.impeccable/review/ticket-14-synthetic-${name}-${width}.png`, fullPage: true });
      if (name === 'spell') await expect(page.locator('.contribution-facts dd')).toHaveText(['38', '3']);
      if (name === 'players' && width <= 600) {
        const first = page.locator('.pickups-table tbody tr').first();
        expect((await first.locator('td').nth(1).boundingBox())!.y).toBeGreaterThan((await first.locator('th').boundingBox())!.y);
      }
    }
  }
  await page.getByLabel('Game scope', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Show contributions', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused();
  await expect(page.getByText(/How it’s measured|Last updated|Source JSON|Sample stats|Transaction feed/)).toHaveCount(0);
});
