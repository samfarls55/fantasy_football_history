import { test, expect } from '@playwright/test';

test('game scopes separate regular, playoff, consolation, and placement results', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('tbody tr:visible');
  await expect(rows).toHaveCount(2);
  await expect(page.locator('.lead-value')).toHaveText('+24%');
  await page.getByLabel('Game scope').selectOption('playoffs');
  await page.getByRole('button', { name: 'Apply scope' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('Playoff scoring high');
  await expect(rows).toContainText('162.4');
  await page.getByLabel('Game scope').selectOption('combined');
  await page.getByRole('button', { name: 'Apply scope' }).click();
  await expect(rows).toHaveCount(3);
  for (const scope of ['consolation', 'placement']) {
    await page.getByLabel('Game scope').selectOption(scope);
    await page.getByRole('button', { name: 'Apply scope' }).click();
    await expect(rows).toHaveCount(0);
    await expect(page.getByText('No sample records in this scope.')).toBeVisible();
  }
});

test('missing images preserve identity and usable record links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/assets/plates/**', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/');
  await expect(page.locator('.lead-record .image-fallback')).toHaveText('MB');
  await expect(page.locator('.bench-record .image-fallback')).toHaveText('25C');
  await expect(page.locator('.lead-action')).toHaveAttribute('href', '/records/best-without-title/');
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

test('Home uses the shared navigation without public source or calculation panels', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link')).toHaveText(['Records', 'Managers', 'Seasons', 'Rivalries']);
  await expect(page.locator('.museum-header [aria-current]')).toHaveCount(0);
  await expect(page.getByText(/How it’s measured|Source fixture|View sample data|View evidence/)).toHaveCount(0);
  expect((await request.get('/sample-history.json')).status()).toBe(404);
});
