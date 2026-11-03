import { test, expect } from '@playwright/test';

test('Players rankings use player initials without presenting owner artwork as player portraits', async ({ page }) => {
  for (const category of ['player-contributions', 'productive-pickup']) {
    await page.goto(`/records/${category}/?season=2021`);
    await expect(page.locator('.record-ranking tbody tr').first()).toBeVisible();
    await expect(page.locator('.record-lead .team-image img, .record-ranking .team-image img')).toHaveCount(0);
    await expect(page.locator('.record-ranking .team-image').first()).toHaveText('SP');
  }
});

test('Home discovery reaches an actual matchup and scoped player with shared URLs, reload and Back restoration', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[data-category="benched-player"] .home-category-link').click();
  await page.getByLabel('Season', { exact: true }).selectOption('2021');
  await page.getByLabel('Sort results').selectOption('newest');
  await page.getByRole('button', { name: 'Show rankings', exact: true }).click();
  const categoryUrl = page.url();
  await page.locator('.record-ranking tbody tr').first().locator('th a').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.lineup-selected')).toContainText('Synthetic Player 901');
  await page.reload();
  await expect(page.locator('.lineup-selected')).toHaveAttribute('aria-current', 'true');
  const gameUrl = page.url();
  await page.locator('.lineup-selected a').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Synthetic Player 901');
  await expect(page.locator('.contribution-facts dd')).toHaveText(['0', '0']);
  const shared = await context.newPage();
  await shared.goto(page.url());
  await expect(shared.getByRole('heading', { level: 1 })).toHaveText('Synthetic Player 901');
  await expect(shared.getByLabel('Games season')).toHaveValue('2021');
  await shared.close();
  await page.goBack();
  await expect(page).toHaveURL(gameUrl);
  await expect(page.locator('.lineup-selected')).toHaveAttribute('aria-current', 'true');
  await page.goBack();
  await expect(page).toHaveURL(categoryUrl);
  await expect(page.getByLabel('Season', { exact: true })).toHaveValue('2021');
  await expect(page.getByLabel('Sort results')).toHaveValue('newest');
  await page.reload();
  await expect(page.getByLabel('Sort results')).toHaveValue('newest');
});

test('main navigation resets section filters on desktop and through the phone keyboard Menu', async ({ page }) => {
  const cases = [
    ['/records/career-points/?season=2020&scope=combined&sort=newest&limit=20', 'Records', '/records/'],
    ['/managers/person-608473907007143936/?tab=players&season=2020&scope=combined', 'Managers', '/managers/'],
    ['/seasons/2021/?tab=matchups&scope=combined&week=2', 'Seasons', '/seasons/'],
    ['/rivalries/?a=person-608473907007143936&b=person-740265931783245824&season=2021&scope=combined&limit=all', 'Rivalries', '/rivalries/'],
  ];
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [from, section, destination] of cases) {
      await page.goto(from);
      if (width === 320) {
        await page.getByRole('button', { name: 'Menu', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute('aria-expanded', 'true');
      }
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: section, exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(destination);
      await expect(page.locator('.museum-header [aria-current]')).toHaveText(section);
      if (section === 'Rivalries') {
        await expect(page.getByLabel('First manager')).toHaveValue('');
        await expect(page.getByLabel('Second manager')).toHaveValue('');
        await expect(page.getByLabel('Season', { exact: true })).toHaveValue('');
        await expect(page.getByLabel('Game scope')).toHaveValue('regular');
      }
      await page.goBack();
      await expect(page).toHaveURL(from);
    }
  }
});

test('shared index, unavailable and invalid shells retain skip navigation and reduced-motion access at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [path, status, heading] of [['/', 200, 'All-time records'], ['/seasons/', 200, 'Seasons'], ['/unavailable/', 503, 'League history'], ['/missing-page/', 404, 'Page not found']] as const) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(status);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', 'rgb(11, 16, 40)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    expect(await page.getByRole('main').evaluate(element => getComputedStyle(element).scrollBehavior)).toBe('auto');
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  }
  await page.goto('/');
  await page.locator('.home-category-link').first().hover();
  expect(await page.evaluate(() => document.getAnimations().filter(animation => Number(animation.effect?.getComputedTiming().duration) > 0).length)).toBe(0);
});

test('Seasons index keeps each year readable on one line at phone widths', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/seasons/');
    for (const year of await page.locator('.seasons-table tbody th a').all()) {
      expect(await year.evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getClientRects().length;
      })).toBe(1);
    }
  }
});
