import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const tim = 'person-608473907007143936';
test.beforeEach(async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' }));
});

test('Players opens scoped starting history and retains year and game scope through actual games and franchise history', async ({ page }) => {
  await page.goto(`/managers/${tim}/?tab=players&scope=combined&season=2020`);
  await expect(page.getByRole('link', { name: 'Players', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.contributors-table')).toContainText('50.5');
  await page.locator('.contributors-table').getByRole('link', { name: 'Synthetic Player 107', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic Player 107', exact: true })).toBeVisible();
  await expect(page.locator('.contribution-facts')).toContainText('88.5');
  await expect(page.getByLabel('Games season')).toHaveValue('2020');
  await expect(page.locator('.contribution-games tbody tr')).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel('Games season')).toHaveValue('2020');
  await page.getByRole('link', { name: 'Week 1', exact: true }).click();
  await expect(page).toHaveURL(/seasons\/2020\/matchups\/.*scope=combined&week=1&player=107&team=7#player-7-107/);
  await expect(page.locator('.lineup-selected')).toContainText('Synthetic Player 107');
  await page.goBack();
  await page.getByRole('link', { name: 'Franchise contributions', exact: true }).click();
  await expect(page).toHaveURL('/franchises/franchise-7/players/107/?scope=combined&season=2020');
  await expect(page.locator('.contribution-seasons')).toContainText('Woody14');
  await expect(page.locator('.contribution-games')).toContainText('Timh17');
  await page.getByLabel('Games season').selectOption('2019');
  await page.getByRole('button', { name: 'Show games', exact: true }).click();
  await expect(page).toHaveURL('/franchises/franchise-7/players/107/?scope=combined&season=2019');
  await expect(page.locator('.contribution-games')).toContainText('Woody14');
  await page.locator('.contribution-games').getByRole('link', { name: 'alecswartout', exact: true }).first().click();
  await expect(page).toHaveURL(/managers\/person-473910025325113344\/seasons\/2019\/\?scope=combined/);
});

test('season and owner-season Players views keep their context and a benched player has genuine no-start history', async ({ page }) => {
  await page.goto('/seasons/2021/?tab=players&scope=regular');
  await expect(page.getByRole('link', { name: 'Players', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.contributors-table')).toContainText('Timh17');
  await page.locator('.contributors-table').getByRole('link', { name: 'Synthetic Player 107', exact: true }).click();
  await expect(page).toHaveURL(`/managers/${tim}/players/107/?scope=regular&season=2021`);
  await page.locator('.contribution-seasons').getByRole('link', { name: '2020', exact: true }).click();
  await expect(page).toHaveURL(`/managers/${tim}/seasons/2020/?tab=players&scope=regular`);
  await expect(page.locator('.contributors-table')).toContainText('20');
  await page.getByLabel('Season', { exact: true }).selectOption('2021');
  await page.getByRole('button', { name: 'Show players', exact: true }).click();
  await expect(page).toHaveURL(`/managers/${tim}/seasons/2021/?tab=players&scope=regular&sort=newest`);
  await expect(page.getByRole('link', { name: 'Players', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goto('/franchises/franchise-7/seasons/2019/?tab=players&scope=regular');
  await expect(page.locator('.profile-context')).toContainText('Woody14');
  await page.locator('.contributors-table').getByRole('link', { name: 'Synthetic Player 107', exact: true }).click();
  await expect(page).toHaveURL('/franchises/franchise-7/players/107/?scope=regular&season=2019');
  await page.goto('/managers/person-800000000000000001/players/901/?season=2021&scope=regular');
  await expect(page.locator('.contribution-facts dd')).toHaveText(['0', '0']);
  await expect(page.getByText('No contributing games in 2021.', { exact: true })).toBeVisible();
  await expect(page.locator('.contribution-games')).toHaveCount(0);
  expect((await page.goto(`/managers/${tim}/players/no-such-player/`))?.status()).toBe(404);
});

test('contribution history and Players rows stay usable on phones, a narrow desktop viewport and through keyboard controls', async ({ page }) => {
  const targets = [
    ['manager-players', `/managers/${tim}/?tab=players&scope=regular`],
    ['season-players', '/seasons/2021/?tab=players&scope=regular'],
    ['person-player', `/managers/${tim}/players/107/?scope=combined&season=2020`],
    ['franchise-player', '/franchises/franchise-7/players/107/?scope=regular&season=2019'],
  ];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, path] of targets) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} at ${width}px`).toBe(true);
      if (name.endsWith('players')) await expect(page.getByRole('link', { name: 'Players', exact: true })).toBeInViewport();
      await page.screenshot({ path: `.impeccable/review/ticket-12-synthetic-${name}-${width}.png`, fullPage: true });
      if (width <= 600 && name.includes('player') && !name.endsWith('players')) {
        const first = page.locator('.contribution-games tbody tr').first();
        const identity = await first.locator('th').boundingBox();
        const points = await first.locator('td').nth(1).boundingBox();
        expect(points!.y).toBeGreaterThan(identity!.y);
      }
    }
  }
  await page.getByLabel('Games season').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Show games', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Games season')).toHaveValue('2019');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused();
  // A 720px CSS viewport is the reflow width of a 1440px desktop at 200% browser zoom.
  await page.setViewportSize({ width: 720, height: 500 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByLabel('Games season')).toBeVisible();
  await expect(page.getByText(/How it’s measured|Last updated|Sample stats|Source JSON/)).toHaveCount(0);
});
