import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ path: resolve('public/assets/plates/achievement-logo.png'), contentType: 'image/png' }));
});

test('directory explains person careers and franchise slots without repeating identical identities', async ({ page }) => {
  await page.goto('/managers/');
  await expect(page.getByText('Manager careers follow people.')).toBeVisible();
  await expect(page.getByText('follow one league slot across owners.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Franchise histories', exact: true }).click();
  await expect(page.getByText('A franchise follows one league slot across owners.')).toBeVisible();
  const history = page.getByRole('row').filter({ has: page.locator('a[href="/franchises/franchise-7/"]') });
  await expect(history.getByText('Format Manager 7', { exact: true })).toHaveCount(1);
  await expect(history.getByRole('link', { name: 'Manager career', exact: true })).toHaveAttribute('href', '/managers/person-950000000000000007/');
  await history.getByRole('link', { name: 'Format Manager 7', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Format Manager 7', exact: true })).toBeVisible();
});

test('profiles show identical names once while preserving distinct teams, owners and season links', async ({ page }) => {
  await page.goto('/managers/person-950000000000000007/');
  await expect(page.getByRole('region', { name: 'Career summary' }).getByText('Format Manager 7', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Full franchise history', exact: true })).toHaveAttribute('href', '/franchises/franchise-7/?scope=regular');
  const managerYear = page.getByRole('row').filter({ has: page.getByRole('link', { name: '2025', exact: true }) });
  await expect(managerYear).not.toContainText('Format Manager 7');
  await managerYear.getByRole('link', { name: '2025', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Franchise season', exact: true })).toHaveAttribute('href', '/franchises/franchise-7/seasons/2025/?scope=regular');
  await page.getByRole('link', { name: 'Franchise season', exact: true }).click();
  const season = page.getByRole('region', { name: '2025 season summary' });
  await expect(season.getByText('Format Manager 7', { exact: true })).toHaveCount(1);
  await expect(season.getByRole('link', { name: 'Manager season', exact: true })).toHaveAttribute('href', '/managers/person-950000000000000007/seasons/2025/?scope=regular');
  await page.getByRole('link', { name: 'Full franchise history', exact: true }).click();
  const franchiseYear = page.getByRole('row').filter({ has: page.getByRole('link', { name: '2025', exact: true }) });
  await expect(franchiseYear.getByText('Format Manager 7', { exact: true })).toHaveCount(1);
  await expect(franchiseYear.getByRole('link', { name: 'Format Manager 7', exact: true })).toHaveAttribute('href', '/managers/person-950000000000000007/seasons/2025/?scope=regular');
  await page.goto('/managers/person-608473907007143936/seasons/2020/');
  await expect(page.getByRole('region', { name: '2020 season summary' }).getByRole('link', { name: 'Harbor Crew', exact: true })).toHaveAttribute('href', '/franchises/franchise-7/seasons/2020/?scope=regular');
  await page.goto('/franchises/franchise-7/seasons/2020/');
  await expect(page.getByRole('region', { name: '2020 season summary' }).getByRole('link', { name: 'Timh17', exact: true })).toHaveAttribute('href', '/managers/person-608473907007143936/seasons/2020/?scope=regular');
});

test('timelines describe recorded seasons and team names without claiming an exact rename or return', async ({ page }) => {
  await page.goto('/managers/person-608473907007143936/');
  const tenure = page.getByRole('region', { name: 'Tenure timeline' });
  await expect(tenure).toContainText('Took over from Woody14');
  await expect(tenure).toContainText('Played as Harbor Crew');
  await expect(tenure).toContainText('Played as Buccaneers');
  await expect(tenure).not.toContainText('Renamed');
  await expect(tenure.getByRole('link', { name: 'Woody14', exact: true })).toHaveAttribute('href', '/managers/person-472580465006473216/');
  await page.goto('/managers/person-800000000000000001/');
  await expect(page.getByRole('region', { name: 'Tenure timeline' })).toContainText('First season in the archive');
  await expect(page.getByRole('region', { name: 'Tenure timeline' })).toContainText('Next season in the archive');
  await page.goto('/franchises/franchise-7/seasons/2020/');
  const ownership = page.getByRole('region', { name: 'Ownership timeline' });
  await expect(ownership).toContainText('Took over from Woody14');
  await expect(ownership).toContainText('Played as Harbor Crew');
  await expect(ownership).not.toContainText('Buccaneers');
});

test('profile game facts identify their scope and season separately from season honors', async ({ page }) => {
  await page.goto('/managers/person-608473907007143936/');
  await expect(page.getByRole('heading', { name: 'Regular season · All seasons', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Regular season statistics' })).toContainText('1–3');
  await page.getByLabel('Game scope').selectOption('combined');
  await page.getByLabel('Season', { exact: true }).selectOption('2020');
  await page.getByRole('button', { name: 'Show history' }).click();
  await expect(page.getByRole('heading', { name: 'Regular + playoffs · 2020', exact: true })).toBeVisible();
  const games = page.getByRole('region', { name: 'Regular + playoffs statistics' });
  await expect(games).toContainText('2–0');
  await expect(games).toContainText('2 games');
  await expect(games).not.toContainText('Championships');
  await expect(page.getByLabel('Season honors')).toContainText('Championships1');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Regular + playoffs · 2020', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '2020', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Regular + playoffs · 2020', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Harbor Crew', exact: true }).click();
  await expect(page).toHaveURL('/franchises/franchise-7/seasons/2020/?scope=combined');
  await expect(page.getByRole('region', { name: 'Regular + playoffs statistics' })).toContainText('2–0');
});

for (const width of [390, 320]) {
  test(`keyboard journey retains manager, franchise and season context at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/managers/');
    await page.getByRole('link', { name: 'Timh17', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Timh17', exact: true })).toBeVisible();
    await page.getByLabel('Game scope').focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Show history' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Regular + playoffs · All seasons', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Full franchise history', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/franchises/franchise-7/?scope=combined');
    await expect(page.getByRole('region', { name: 'Ownership timeline' })).toContainText('Took over from Woody14');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: '2020', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/franchises/franchise-7/seasons/2020/?scope=combined');
    await expect(page.getByRole('table', { name: '2020 franchise matchup history' })).toContainText('alecswartout');
    await page.getByRole('region', { name: '2020 season summary' }).getByRole('link', { name: 'Timh17', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/managers/person-608473907007143936/seasons/2020/?scope=combined');
    await expect(page.getByRole('heading', { name: 'Regular + playoffs · 2020', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
