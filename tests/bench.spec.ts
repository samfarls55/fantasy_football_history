import { test, expect } from '@playwright/test';

const selectedId = '900000000000002021-w2-r1-901';
const categoryPath = `/records/benched-player/?season=2021&scope=regular&sort=newest&result=${selectedId}`;

test('bench rankings open the selected real lineup row by keyboard and return with category context intact', async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.abort());
  await page.goto(categoryPath);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Highest-scoring benched player');
  await expect(page.getByLabel('Leading result')).toContainText('Shared lead · 3 results');
  await expect(page.getByLabel('Leading result')).toContainText('Manager 1 · Week 2 · 2021');
  await expect(page.locator('.record-ranking tbody tr')).toHaveCount(3);
  await expect(page.locator('.record-ranking .team-image img')).toHaveCount(0);
  const selected = page.locator(`[id="result-${selectedId}"]`);
  await expect(selected).toHaveClass(/selected-record/);
  await selected.getByRole('link', { name: 'Synthetic Player 901', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/seasons/2021/matchups/900000000000002021-w2-m1/?scope=regular&week=2&player=901&team=1#player-1-901');
  const benchRow = page.locator('#player-1-901');
  await expect(benchRow).toHaveAttribute('aria-current', 'true');
  await expect(benchRow).toContainText('50');
  await expect(benchRow).toBeInViewport();
  await expect(page.getByRole('table', { name: 'Manager 1 bench', exact: true })).toContainText('Synthetic Player 901');
  await expect(page.getByLabel('Official score for Manager 1', { exact: true })).toHaveText('10');
  await page.reload();
  await expect(benchRow).toHaveAttribute('aria-current', 'true');
  await benchRow.getByRole('link', { name: 'Synthetic Player 901', exact: true }).click();
  await expect(page).toHaveURL('/managers/person-800000000000000001/players/901/?season=2021&scope=regular');
  await expect(page.locator('.contribution-facts dd')).toHaveText(['0', '0']);
  await page.goBack();
  await expect(benchRow).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(categoryPath);
  await expect(page.getByLabel('Season', { exact: true })).toHaveValue('2021');
  await expect(page.getByLabel('Sort results')).toHaveValue('newest');
  await selected.getByRole('link', { name: 'Player history', exact: true }).click();
  await expect(page).toHaveURL('/managers/person-800000000000000001/players/901/?scope=regular&season=2021');
});

test('unknown bench coverage never presents a false leader or a no-activity result', async ({ page }) => {
  // The browser fixture deliberately has one unknown 2020 bench score.
  await page.goto('/records/benched-player/?scope=regular');
  await expect(page.getByText('Results unavailable for this selection.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Leading result')).toHaveCount(0);
  await expect(page.getByText('No qualifying results.', { exact: true })).toHaveCount(0);
  await page.getByLabel('Season', { exact: true }).selectOption('2019');
  await page.getByRole('button', { name: 'Show rankings', exact: true }).click();
  await expect(page.getByText('No qualifying results.', { exact: true })).toBeVisible();
});

test('bench category and selected matchup retain the approved stacked phone hierarchy and quiet selection', async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.abort());
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(categoryPath);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `category ${width}px`).toBe(true);
    await page.screenshot({ path: `.impeccable/review/ticket-13-synthetic-category-${width}.png`, fullPage: true });
    const selected = page.locator(`[id="result-${selectedId}"]`);
    if (width <= 600) {
      const identity = await selected.locator('th').boundingBox();
      const points = await selected.locator('.record-result').boundingBox();
      expect(points!.y).toBeGreaterThan(identity!.y);
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused();
    }
    await selected.getByRole('link', { name: 'Synthetic Player 901', exact: true }).click();
    await expect(page.locator('.lineup-selected')).toHaveCount(1);
    await expect(page.locator('.lineup-selected')).toHaveAttribute('aria-current', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `matchup ${width}px`).toBe(true);
    await page.screenshot({ path: `.impeccable/review/ticket-13-synthetic-matchup-${width}.png`, fullPage: true });
    await expect(page.getByText(/would have won|legal substitution|Last updated|Source JSON|How it’s measured/)).toHaveCount(0);
  }
});
