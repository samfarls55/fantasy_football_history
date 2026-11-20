import { test, expect } from '@playwright/test';

test('championship history opens the season bracket and each competition keeps working contest links', async ({ page }) => {
  await page.goto('/seasons/');
  const season = page.getByRole('row').filter({ has: page.getByRole('link', { name: '2025', exact: true }) });
  await expect(season).toContainText('Format Manager 5');
  await expect(season).toContainText('Format Manager 1');
  await expect(season.getByRole('link', { name: 'Format Manager 5' })).toHaveAttribute('href', '/managers/person-950000000000000005/seasons/2025/');
  await season.getByRole('link', { name: '2025', exact: true }).click();
  await expect(page.locator('.season-results')).toContainText('Champion Format Manager 5');
  await page.getByRole('link', { name: 'Playoffs', exact: true }).click();
  await expect(page.getByLabel('Competition', { exact: true })).toHaveValue('playoffs');
  await expect(page.locator('.bracket-contest')).toHaveCount(5);
  await expect(page.locator('.bracket-byes')).toContainText('Format Manager 1');
  await expect(page.locator('.bracket-contest').filter({ hasText: 'Final · Weeks 4–5' })).toContainText('35.3');
  await page.getByRole('link', { name: 'Final · Weeks 4–5', exact: true }).click();
  await expect(page).toHaveURL(/matchups\/950000000000002501-winners-m16\/\?scope=playoffs&week=5/);
  await expect(page.getByRole('heading', { name: 'Weeks 4–5' })).toBeVisible();
  await page.goBack();
  await page.getByLabel('Competition', { exact: true }).selectOption('consolation');
  await page.getByRole('button', { name: 'Show bracket' }).click();
  await expect(page).toHaveURL('/seasons/2025/?tab=playoffs&scope=consolation');
  await expect(page.locator('.bracket-contest')).toHaveCount(4);
  await page.getByRole('link', { name: 'Final · Weeks 3–4', exact: true }).click();
  await expect(page).toHaveURL(/losers-m13\/\?scope=consolation&week=4/);
  await page.goBack();
  await page.getByLabel('Competition', { exact: true }).selectOption('placement');
  await page.getByRole('button', { name: 'Show bracket' }).click();
  await expect(page.locator('.bracket-contest')).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel('Competition', { exact: true })).toHaveValue('placement');
  await expect(page.getByText(/trophy|How it’s measured|Last updated|Source fixture/i)).toHaveCount(0);
});

test('future brackets show unknown outcomes and responsive brackets stay inside their region', async ({ page }) => {
  await page.goto('/seasons/2021/?tab=playoffs');
  await expect(page.locator('.season-results')).toHaveText('Champion Not yet determined · Runner-up Not yet determined');
  await expect(page.locator('.bracket-score')).toHaveText(['—', '—', '—', '—', '—', '—']);
  await expect(page.locator('.bracket-contest h3 a')).toHaveCount(0);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/seasons/2025/?tab=playoffs');
    await page.evaluate(() => document.fonts.ready);
    const region = page.getByRole('region', { name: 'Championship playoffs bracket' });
    await expect(region).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px`).toBe(true);
  }
  await page.getByLabel('Season', { exact: true }).selectOption('2019');
  await page.getByRole('button', { name: 'Open season' }).click();
  await expect(page).toHaveURL('/seasons/2019/?tab=playoffs&scope=playoffs');
  await page.goto('/seasons/2019/?tab=playoffs&scope=wrong');
  await expect(page).toHaveURL('/seasons/2019/?tab=playoffs&scope=playoffs');
});
