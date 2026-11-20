import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });

test('phone visitors can see every full season tab and select views with touch and keyboard', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/seasons/2025/');
    await page.evaluate(() => document.fonts.ready);
    const views = page.getByRole('navigation', { name: 'Season views' });
    for (const name of ['Standings', 'Matchups', 'Playoffs', 'Players']) {
      await expect(views.getByRole('link', { name, exact: true })).toBeInViewport({ ratio: 1 });
    }
    for (const name of ['Matchups', 'Playoffs', 'Players', 'Standings']) {
      await views.getByRole('link', { name, exact: true }).tap();
      await expect(views.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    }
    await views.getByRole('link', { name: 'Standings', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(views.getByRole('link', { name: 'Matchups', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/tab=matchups/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('phone playoff rounds read vertically and follow advancement and byes to the linked final', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/seasons/2025/?tab=playoffs');
    const bracket = page.getByRole('region', { name: 'Championship playoffs bracket' });
    expect(await bracket.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(page.getByText('Round 1 byes:')).toContainText('Format Manager 1');
    const rounds = page.getByRole('navigation', { name: 'Bracket rounds' });
    await expect(rounds.getByRole('link')).toHaveText(['Round 1', 'Round 2', 'Final']);
    await page.screenshot({ path: `.impeccable/review/spec-21/ticket25-bracket-${width}.png`, fullPage: true });
    await rounds.getByRole('link', { name: 'Round 1', exact: true }).tap();
    const opener = bracket.getByRole('article', { name: 'Round 1 · Week 2, game 1', exact: true });
    await expect(opener).toContainText('Format Manager 3');
    await opener.getByRole('link', { name: 'Advancing side to Round 2, game 1' }).tap();
    const semifinal = bracket.getByRole('article', { name: 'Round 2 · Week 3, game 1', exact: true });
    await expect(semifinal).toBeInViewport({ ratio: 1 });
    await expect(semifinal).toContainText('Format Manager 1');
    await semifinal.getByRole('link', { name: 'Advancing side to Final' }).focus();
    await page.keyboard.press('Enter');
    const final = bracket.getByRole('article', { name: 'Final · Weeks 4–5, game 1', exact: true });
    await expect(final).toBeInViewport({ ratio: 1 });
    await final.getByRole('link', { name: 'Final · Weeks 4–5', exact: true }).tap();
    await expect(page).toHaveURL(/winners-m16\/\?scope=playoffs&week=5/);
    await expect(page.getByRole('heading', { name: 'Weeks 4–5' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('missing format facts and unresolved season outcomes stay readable on desktop and phones', async ({ page }) => {
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/seasons/');
    const season = page.getByRole('row').filter({ has: page.getByRole('link', { name: '2021', exact: true }) });
    await expect(season).toContainText('Playoff places not recorded');
    await expect(season.locator('[data-label="Champion"]')).toHaveText('Not yet determined');
    await expect(season.locator('[data-label="Runner-up"]')).toHaveText('Not yet determined');
    await season.getByRole('link', { name: '2021', exact: true }).click();
    await expect(page.locator('.season-results')).toHaveText('Champion Not yet determined · Runner-up Not yet determined');
    await page.getByText('Season format', { exact: true }).click();
    await expect(page.locator('.season-format dl > div').filter({ has: page.locator('dt', { hasText: 'Playoff places' }) }).locator('dd')).toHaveText('Not recorded');
    await page.getByRole('navigation', { name: 'Season views' }).getByRole('link', { name: 'Playoffs', exact: true }).click();
    await expect(page.locator('.bracket-identity')).toHaveText(Array(6).fill('Not yet determined'));
    await expect(page.locator('.bracket-score')).toHaveText(Array(6).fill('—'));
    await expect(page.getByRole('link', { name: /Final · Week/ })).toHaveCount(0);
    await expect(page.getByText(/NaN|In progress|Last updated/)).toHaveCount(0);
    await page.goto('/seasons/2019/');
    await page.getByText('Season format', { exact: true }).click();
    await expect(page.locator('.season-format dl > div').filter({ has: page.locator('dt', { hasText: 'Playoff rounds' }) }).locator('dd')).toHaveText('Not recorded');
  }
});

test('changing seasons from Players retains the selected view and game scope', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/seasons/2025/?tab=players&scope=combined');
  await page.getByLabel('Season', { exact: true }).selectOption('2019');
  await page.getByRole('button', { name: 'Open season' }).tap();
  await expect(page).toHaveURL('/seasons/2019/?tab=players&scope=combined');
  await expect(page.getByLabel('Game scope', { exact: true })).toHaveValue('combined');
  await expect(page.getByRole('navigation', { name: 'Season views' }).getByRole('link', { name: 'Players', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page.getByLabel('Game scope', { exact: true })).toHaveValue('combined');
  await page.goBack();
  await expect(page).toHaveURL('/seasons/2025/?tab=players&scope=combined');
});

test('every championship contest opens from the bracket with its season and completed week', async ({ page }) => {
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/seasons/2025/?tab=playoffs');
    const bracket = page.getByRole('region', { name: 'Championship playoffs bracket' });
    const games = bracket.getByRole('link', { name: /^(Round \d+|Final) · Weeks? \d+/ });
    await expect(games).toHaveCount(5);
    if (width === 768) await expect(page.getByText('Scroll across rounds', { exact: true })).toBeVisible();
    await page.screenshot({ path: `.impeccable/review/spec-21/ticket25-contests-${width}.png`, fullPage: true });
    for (let index = 0; index < 5; index++) {
      const href = await games.nth(index).getAttribute('href');
      if (width === 1440) {
        await games.nth(index).focus();
        await page.keyboard.press('Enter');
      } else await games.nth(index).tap();
      await expect(page).toHaveURL(href!);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('2025');
      await expect(page.getByText('Championship playoffs', { exact: false }).first()).toBeVisible();
      await page.goBack();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
