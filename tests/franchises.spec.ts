import { test, expect } from '@playwright/test';

test('franchise history crosses owners and links each season to its person and official games', async ({ page }) => {
  await page.goto('/managers/');
  await page.getByRole('link', { name: 'Franchise histories', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Franchise histories', exact: true })).toBeVisible();
  await page.locator('a[href="/franchises/franchise-7/"]').click();
  await expect(page.getByRole('heading', { name: 'Format Manager 7', exact: true })).toBeVisible();
  await expect(page.getByLabel('Ownership timeline')).toContainText('Woody14');
  await expect(page.getByLabel('Ownership timeline')).toContainText('Took over from Woody14');
  const seasons = page.getByRole('table', { name: 'Franchise season history' });
  await expect(seasons).toContainText('2019');
  await expect(seasons).toContainText('Woody14');
  await expect(seasons).toContainText('Timh17');
  await page.getByLabel('Season', { exact: true }).selectOption('2020');
  await page.getByLabel('Game scope').selectOption('combined');
  await page.getByRole('button', { name: 'Show history' }).click();
  await expect(page).toHaveURL(/season=2020&scope=combined/);
  await page.reload();
  await expect(page.getByLabel('Season', { exact: true })).toHaveValue('2020');
  await page.getByRole('link', { name: '2020', exact: true }).click();
  await expect(page).toHaveURL('/franchises/franchise-7/seasons/2020/?scope=combined');
  await expect(page.getByRole('link', { name: 'Timh17', exact: true }).first()).toHaveAttribute('href', '/managers/person-608473907007143936/seasons/2020/?scope=combined');
  await expect(page.getByRole('link', { name: '2020', exact: true })).toHaveAttribute('href', '/seasons/2020/');
  await page.getByLabel('Sort games').selectOption('oldest');
  await page.getByRole('button', { name: 'Show matchups' }).click();
  await page.getByRole('link', { name: 'Week 1', exact: true }).click();
  await expect(page).toHaveURL('/seasons/2020/matchups/900000000000002020-w1-m1/?scope=combined&week=1');
  await page.goBack();
  await expect(page.getByLabel('Sort games')).toHaveValue('oldest');
  await page.getByLabel('Season', { exact: true }).selectOption('2019');
  await page.getByRole('button', { name: 'Show matchups' }).click();
  await expect(page).toHaveURL('/franchises/franchise-7/seasons/2019/?scope=combined&sort=oldest');
  await expect(page.getByRole('region', { name: '2019 season summary' }).getByRole('link', { name: 'Manager season', exact: true })).toHaveAttribute('href', '/managers/person-472580465006473216/seasons/2019/?scope=combined');
  await expect(page.getByText(/Source fixture|How it’s measured|Last updated|Sample stats/)).toHaveCount(0);
});

test('franchise directory sorting survives a shared link and phone rows retain owners without overflow', async ({ page }) => {
  await page.goto('/franchises/');
  await page.getByLabel('Sort franchises').selectOption('seasons');
  await page.getByRole('button', { name: 'Sort histories' }).click();
  await expect(page).toHaveURL('/franchises/?sort=seasons');
  await page.reload();
  await expect(page.getByLabel('Sort franchises')).toHaveValue('seasons');
  await expect(page.locator('.directory-table tbody tr').first()).toContainText('Format Manager 10');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/franchises/', '/franchises/franchise-7/', '/franchises/franchise-2/seasons/2021/', '/franchises/franchise-7/seasons/2020/']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}px`).toBe(true);
    }
    await expect(page.getByRole('link', { name: 'Timh17', exact: true }).first()).toBeVisible();
  }
  expect((await page.goto('/franchises/missing/'))?.status()).toBe(404);
  expect((await page.goto('/franchises/franchise-7/seasons/2018/'))?.status()).toBe(404);
  await page.goto('/franchises/franchise-7/?scope=wrong&season=2018&tab=wrong');
  await expect(page).toHaveURL('/franchises/franchise-7/?tab=seasons&scope=regular');
});
