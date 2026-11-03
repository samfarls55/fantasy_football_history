import { test, expect } from '@playwright/test';
const tim = 'person-608473907007143936';
const event = '900000000000002021:910000000000000002:50:7';
const selected = `/managers/${tim}/seasons/2021/?tab=players&scope=regular&view=drops&event=${encodeURIComponent(event)}`;

test('a drop result opens the dropping person season and follows actual receiving people and games with native scope and Back', async ({ page }) => {
  await page.goto('/records/productive-drop/?season=2021&scope=regular');
  const result = page.locator('.record-ranking tbody tr').filter({ hasText: 'Timh17' });
  await expect(result).toContainText('7');
  await result.getByRole('link', { name: 'Synthetic Player 50', exact: true }).click();
  await expect(page).toHaveURL(selected);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Timh17');
  await expect(page.locator('.drop-context')).toContainText('2021 · Week 1 drop');
  await expect(page.locator('.drop-context .contribution-facts dd')).toHaveText(['7', '1']);
  await expect(page.locator('.drop-receivers')).toContainText('sebastian12');
  await expect(page.locator('.drop-games tbody tr')).toHaveCount(1);
  await page.reload();
  await page.getByLabel('Game scope', { exact: true }).selectOption('combined');
  await page.getByRole('button', { name: 'Show players', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`view=drops&event=${encodeURIComponent(event)}`));
  await expect(page.locator('.drop-context .contribution-facts dd')).toHaveText(['7', '1']);
  await page.locator('.drop-receivers').getByRole('link', { name: 'sebastian12', exact: true }).click();
  await expect(page).toHaveURL('/managers/person-740265931783245824/players/50/?scope=combined&season=2021');
  await expect(page.locator('.contribution-games tbody')).toContainText('Week 2');
  await page.goBack();
  await expect(page.locator('.drop-context')).toBeVisible();
  await page.locator('.drop-games').getByRole('link', { name: 'Week 2', exact: true }).click();
  await expect(page.locator('.lineup-selected')).toContainText('Synthetic Player 50');
  await page.goBack();
  await page.getByRole('link', { name: 'All players', exact: true }).click();
  await expect(page.locator('.contributors-table tbody tr').filter({ hasText: 'Synthetic Player 50' })).toContainText('16');
  expect((await page.goto(`/managers/${tim}/seasons/2021/?tab=players&view=drops&event=unknown`))?.status()).toBe(404);
});

test('drop category and selected season history reflow at phone widths, retain keyboard navigation and distinguish an empty scope', async ({ page }) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, path] of [['category', '/records/productive-drop/?season=2021&scope=regular'], ['event', selected], ['players', `/managers/${tim}/seasons/2021/?tab=players&scope=regular`]]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} at ${width}px`).toBe(true);
      await page.screenshot({ path: `.impeccable/review/ticket-15-synthetic-${name}-${width}.png`, fullPage: true });
      if (name === 'event') {
        await expect(page.getByRole('navigation', { name: 'Player history views' }).getByRole('link', { name: 'Drops', exact: true })).toHaveAttribute('aria-current', 'page');
        await expect(page.locator('.drop-context .contribution-facts dd')).toHaveText(['7', '1']);
        if (width <= 600) {
          const receiver = page.locator('.drop-receivers tbody tr').first();
          expect((await receiver.locator('td').first().boundingBox())!.y).toBeGreaterThan((await receiver.locator('th').boundingBox())!.y);
        }
      }
    }
  }
  await page.getByLabel('Game scope', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Show players', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused();
  await page.goto(selected.replace('scope=regular', 'scope=playoffs'));
  await expect(page.locator('.drop-context .contribution-facts dd')).toHaveText(['0', '0']);
  await expect(page.locator('.drop-context')).toContainText('No later starts elsewhere for this selection.');
  await expect(page.locator('.drop-games')).toHaveCount(0);
  await expect(page.getByText(/How it’s measured|Last updated|Source JSON|Sample stats|Transaction feed|would have won/)).toHaveCount(0);
  await page.goto(selected);
  await page.getByLabel('Season', { exact: true }).selectOption('2020');
  await page.getByRole('button', { name: 'Show players', exact: true }).click();
  await expect(page).toHaveURL(`/managers/${tim}/seasons/2020/?tab=players&scope=regular&sort=newest&view=drops`);
  await expect(page.locator('.empty-history')).toHaveText('No drops for this selection.');
});
