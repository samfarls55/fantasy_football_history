import { test, expect } from '@playwright/test';

test('game scopes separate regular, playoff, consolation, and placement results', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('tbody tr:visible');
  await expect(rows).toHaveCount(2);
  await expect(page.locator('.lead-value')).toHaveText('+24%');
  await page.getByLabel('Game scope').selectOption('playoffs');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('Playoff scoring high');
  await expect(rows).toContainText('162.4');
  await page.getByLabel('Game scope').selectOption('combined');
  await expect(rows).toHaveCount(3);
  for (const scope of ['consolation', 'placement']) {
    await page.getByLabel('Game scope').selectOption(scope);
    await expect(rows).toHaveCount(0);
    await expect(page.getByText('No sample records in this scope.')).toBeVisible();
  }
});

test('a keyboard-opened bench record identifies its player and limits the lineup claim', async ({ page }) => {
  await page.goto('/');
  await page.locator('.bench-action').focus();
  await page.keyboard.press('Enter');
  const panel = page.locator('[data-record-id="bench-2023-week-7"]');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Highest-scoring benched player' })).toBeFocused();
  await expect(panel).toContainText('Sample receiver');
  await expect(panel.locator('.evidence-metric')).toContainText('Sample receiver');
  await expect(panel).toContainText('38.7');
  await expect(panel).toContainText('does not establish that a legal lineup change');
  await panel.getByText('Source fixture', { exact: true }).click();
  await expect(panel.locator('pre')).toContainText('"lineupStatus": "bench"');
});

test('shared links reproduce evidence and browser history restores the record', async ({ page, request }) => {
  const fixture = await (await request.get('/sample-history.json')).json();
  expect(fixture.sample).toBe(true);
  expect(fixture.league.seedLeagueId).toBe('1385327861673529344');
  await page.goto('/?scope=combined&record=uncrowned-2024#evidence');
  const panel = page.locator('[data-record-id="uncrowned-2024"]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('1,736 points ÷ 14 games = 124 PPG');
  await expect(panel).toContainText('14,000 points ÷ 140 team-games = 100 PPG');
  await expect(panel).toContainText('(124 ÷ 100 − 1) × 100 = +24%');
  await page.getByRole('link', { name: 'Back to records', exact: true }).first().click();
  await expect(page.locator('#evidence')).toBeHidden();
  await expect(page.locator('tbody tr:visible')).toHaveCount(3);
  await page.goBack();
  await expect(panel).toBeVisible();
  await page.getByRole('link', { name: 'Playoff scoring high', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-record-id="playoff-2024-week-15"]')).toBeVisible();
  await page.goto('/?record=missing');
  await expect(page.getByRole('heading', { name: 'Record not found' })).toBeVisible();
});

test('copy-link success and failure give accurate feedback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => undefined } });
  });
  await page.goto('/?record=bench-2023-week-7#evidence');
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Link copied.' })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Permission denied'); } } });
  });
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByLabel('Record link')).toBeFocused();
  await expect(page.getByLabel('Record link')).toHaveValue(/record=bench-2023-week-7/);
  await expect(page.locator('#copy-status')).toHaveText('Select and copy this record link.');
});

test('missing images preserve identity and usable record links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/assets/plates/**', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/');
  await expect(page.locator('.lead-record .image-fallback')).toHaveText('MB');
  await expect(page.locator('.bench-record .image-fallback')).toHaveText('25C');
  await page.locator('.lead-action').click();
  await expect(page.locator('[data-record-id="uncrowned-2024"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the page stays within the viewport at desktop, tablet, and phone widths', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1600, 1440, 1280, 980, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`).toBe(true);
    await expect(page.locator('.lead-action')).toBeInViewport();
    for (const record of ['.lead-record', '.bench-record']) {
      const container = (await page.locator(record).boundingBox())!;
      const image = (await page.locator(`${record} img`).boundingBox())!;
      expect(image.y, `${record} image top at ${width}px`).toBeGreaterThanOrEqual(container.y);
      expect(image.y + image.height, `${record} image bottom at ${width}px`).toBeLessThanOrEqual(container.y + container.height);
    }
  }
  expect(errors).toEqual([]);
});
