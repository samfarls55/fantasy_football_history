import { test, expect } from '@playwright/test';

const tim = 'person-608473907007143936';
const zeroPickup = '900000000000002021:910000000000000001:50:7';

test('season player stories explain actual starts and retain a zero-start pickup in its acquisition period on phones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://sleepercdn.com/avatars/**', route => route.abort());
  await page.goto('/seasons/2021/?tab=players&scope=regular');
  await expect(page.getByText('Points from actual starts. Bench points are excluded.', { exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Player stories', exact: true }).getByRole('link', { name: 'Pickups', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pickups by starting points', exact: true })).toBeInViewport();
  const pickup = page.locator('.pickups-table tbody tr').filter({ hasText: 'Timh17' }).filter({ hasText: 'Synthetic Player 50' }).filter({ hasText: '2021 · Week 1' });
  await expect(pickup.locator('td[data-label="Starts"]')).toHaveText('0');
  await pickup.getByRole('link', { name: 'Synthetic Player 50', exact: true }).click();
  await expect(page).toHaveURL(`/managers/${tim}/players/50/?scope=regular&season=2021&pickup=${encodeURIComponent(zeroPickup)}`);
  await expect(page.locator('.contribution-heading')).toContainText('Timh17');
  await expect(page.locator('.pickup-context')).toContainText('2021 · Week 1 pickup');
  await expect(page.getByText('Pickup and departure were both in Week 1. No full weeks in this pickup period.', { exact: true })).toBeVisible();
  await expect(page.getByText('No starts in this pickup period for this game scope.', { exact: true })).toBeVisible();
  await expect(page.locator('.contribution-facts dd')).toHaveText(['0', '0']);
  await page.getByLabel('Game scope', { exact: true }).selectOption('combined');
  await page.getByRole('button', { name: 'Show contributions', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`pickup=${encodeURIComponent(zeroPickup)}`));
  await expect(page.locator('.pickup-context')).toContainText('2021 · Week 1 pickup');
  await expect(page.getByLabel('Game scope', { exact: true })).toHaveValue('combined');
  await expect(page.locator('.contribution-facts dd')).toHaveText(['0', '0']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.impeccable/review/ticket-28-zero-start-390.png', fullPage: true });
});

test('lineups and linked histories name defenses from supported source identity and keep unsupported identities explicit', async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.abort());
  await page.goto('/seasons/2021/matchups/900000000000002021-w2-m2/?scope=combined&week=2&player=60&team=7#player-7-60');
  await expect(page.locator('.lineup-selected')).toContainText('Buffalo Bills D/ST');
  await page.locator('.lineup-selected').getByRole('link', { name: 'Buffalo Bills D/ST', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Buffalo Bills D/ST');
  await expect(page.getByLabel('Games season')).toHaveValue('2021');
  await expect(page.getByLabel('Game scope', { exact: true })).toHaveValue('combined');
  await page.screenshot({ path: '.impeccable/review/ticket-28-defense-1440.png', fullPage: true });
  await page.goto('/seasons/2021/matchups/900000000000002021-w2-m1/?scope=regular&week=2');
  await expect(page.getByRole('table', { name: 'Manager 1 starters', exact: true })).toContainText('Player 101');
  await expect(page.getByRole('link', { name: 'BAL D/ST', exact: true })).toBeVisible();
});

test('move rankings keep neutral headings when their selected scope has no actual starts', async ({ page }) => {
  await page.goto('/records/productive-pickup/?season=2021&scope=playoffs');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pickups by starting points');
  await expect(page.locator('.record-ranking tbody tr').first()).toContainText('0 starts');
  await page.getByRole('navigation', { name: 'Related records', exact: true }).getByRole('link', { name: "Dropped players' starting points elsewhere", exact: true }).click();
  await expect(page).toHaveURL('/records/productive-drop/?season=2021&scope=playoffs');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Dropped players' starting points elsewhere");
  await expect(page.locator('.record-ranking tbody tr').first()).toContainText('0 starts');
});

test('a manager story opens a drop, its receiving manager and actual game, then reaches a season bench lineup by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route('https://sleepercdn.com/avatars/**', route => route.abort());
  await page.goto(`/managers/${tim}/?tab=players&scope=combined&season=2021`);
  await page.getByRole('navigation', { name: 'Player stories', exact: true }).getByRole('link', { name: 'Drops', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.locator('.drops-table').getByRole('link', { name: 'Synthetic Player 50', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Timh17');
  await expect(page.locator('.drop-context')).toContainText('Actual starts for other managers after Week 1 in 2021. The drop week is excluded.');
  await expect(page.locator('.drop-context .contribution-facts dd')).toHaveText(['7', '1']);
  await page.screenshot({ path: '.impeccable/review/ticket-28-drop-320.png', fullPage: true });
  await page.locator('.drop-receivers').getByRole('link', { name: 'sebastian12', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Games · 2021', exact: true })).toBeVisible();
  await expect(page.getByText('Totals count actual starts across all seasons. Bench points are excluded.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Week 2', exact: true }).click();
  await expect(page.locator('.lineup-selected')).toContainText('Synthetic Player 50');
  await expect(page).toHaveURL(/scope=combined&week=2&player=50&team=10#player-10-50/);
  await page.goBack();
  await page.goBack();
  await page.getByRole('navigation', { name: 'Player history views', exact: true }).getByRole('link', { name: '2021 bench records', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/records/benched-player/?season=2021&scope=combined');
  await page.locator('[id="result-900000000000002021-w2-r1-901"]').getByRole('link', { name: 'Synthetic Player 901', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Manager 1 bench', exact: true }).locator('.lineup-selected')).toContainText('50');
  await expect(page.locator('.lineup-selected')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.impeccable/review/ticket-28-bench-320.png', fullPage: true });
});
