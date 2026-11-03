import { test, expect } from '@playwright/test';

const tim = 'person-608473907007143936';
const seb = 'person-740265931783245824';
const alec = 'person-473910025325113344';
const longName = 'Rivalry Manager With A Very Long Display Name That Wraps Across Lines';

test('landing suggestions open a completed rivalry in the selected season and game scope', async ({ page }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ status: 404, body: '' }));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/rivalries/?season=2024&scope=regular');
    const suggestions = page.getByRole('region', { name: 'Most meetings', exact: true });
    await expect(page.getByText('Choose two different managers to compare.', { exact: true })).toHaveCount(0);
    const first = suggestions.getByRole('link').first();
    await expect(first).toContainText(`${longName} vs Rivalry manager 02`);
    await expect(first).toContainText('13 meetings');
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/rivalries/?a=person-960000000000000001&b=person-960000000000000002&season=2024&scope=regular');
    await expect(page.getByRole('heading', { name: `${longName} vs Rivalry manager 02`, exact: true })).toBeVisible();
    await expect(page.getByLabel('Head-to-head summary')).toContainText('13 meetings');
    await expect(page.getByRole('table', { name: 'Head-to-head games' }).locator('tbody tr')).toHaveCount(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.impeccable/review/spec-21/ticket27-suggested-pair-${width}.png`, fullPage: true });
    await page.goBack();
    await expect(suggestions.getByRole('link').first()).toContainText('13 meetings');
    await page.screenshot({ path: `.impeccable/review/spec-21/ticket27-landing-${width}.png`, fullPage: true });
  }
});

test('phone comparisons identify the pair and perspective through custom selection, reversal and zero meetings', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto('/rivalries/?season=2024&scope=placement');
  const suggestions = page.getByRole('region', { name: 'Most meetings', exact: true });
  await expect(suggestions).toContainText('No completed meetings in this selection.');
  await expect(suggestions.getByRole('link')).toHaveCount(0);
  await page.goto('/rivalries/');
  await page.getByLabel('First manager').selectOption(tim);
  await page.getByLabel('Second manager').selectOption(seb);
  await page.getByLabel('Season', { exact: true }).selectOption('2021');
  await page.getByLabel('Game scope').selectOption('regular');
  await page.getByRole('button', { name: 'Compare managers' }).click();
  await expect(page.getByRole('heading', { name: 'Rivalries', exact: true })).toBeVisible();
  expect((await page.getByRole('heading', { name: 'Rivalries', exact: true }).boundingBox())!.height).toBeGreaterThan(30);
  await expect(page.getByRole('heading', { name: 'Timh17 vs sebastian12', exact: true })).toBeVisible();
  await expect(page.getByLabel('Head-to-head summary')).toContainText('Record for Timh17');
  await expect(page.getByLabel('Head-to-head summary')).toContainText('0–3');
  await page.getByRole('link', { name: 'Reverse pair', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`/rivalries/?a=${seb}&b=${tim}&season=2021&scope=regular`);
  await expect(page.getByRole('heading', { name: 'sebastian12 vs Timh17', exact: true })).toBeVisible();
  await expect(page.getByLabel('Head-to-head summary')).toContainText('Record for sebastian12');
  await expect(page.getByLabel('Head-to-head summary')).toContainText('3–0');
  await page.getByRole('link', { name: 'Week 3 · 2021', exact: true }).click();
  await expect(page).toHaveURL('/seasons/2021/matchups/900000000000002021-w3-m2/?scope=regular&week=3');
  await page.goBack();
  await page.getByLabel('Game scope').selectOption('placement');
  await page.getByRole('button', { name: 'Compare managers' }).click();
  await expect(page.getByRole('heading', { name: 'sebastian12 vs Timh17', exact: true })).toBeVisible();
  await expect(page.getByLabel('Head-to-head summary')).toContainText('0 meetings');
  await expect(page.getByLabel('Head-to-head summary')).toContainText('Average margin—');
  await expect(page.getByText('No meetings in this selection.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.impeccable/review/spec-21/ticket27-zero-meetings-phone.png', fullPage: true });
});

test('Rivalries selects distinct people and keeps pair, scope, season and history links through Back and sharing', async ({ page }) => {
  await page.goto('/rivalries/');
  await expect(page.getByRole('heading', { name: 'Rivalries', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Most meetings', exact: true })).toBeVisible();
  await page.getByLabel('First manager').selectOption(tim);
  await page.getByLabel('Second manager').selectOption(seb);
  await page.getByLabel('Season', { exact: true }).selectOption('2021');
  await page.getByRole('button', { name: 'Compare managers' }).click();
  await expect(page).toHaveURL(`/rivalries/?a=${tim}&b=${seb}&season=2021&scope=regular`);
  await expect(page.getByLabel('Head-to-head summary')).toContainText('0–3');
  await expect(page.getByLabel('Head-to-head summary')).toContainText('3 meetings');
  await expect(page.getByLabel('Head-to-head summary')).toContainText('sebastian12, 3 wins');
  await page.reload();
  await expect(page.getByLabel('First manager')).toHaveValue(tim);
  await expect(page.getByLabel('Season', { exact: true })).toHaveValue('2021');
  await page.getByRole('link', { name: 'Reverse pair', exact: true }).click();
  await expect(page.getByLabel('Head-to-head summary')).toContainText('3–0');
  await page.getByRole('link', { name: 'Week 3 · 2021', exact: true }).click();
  await expect(page).toHaveURL('/seasons/2021/matchups/900000000000002021-w3-m2/?scope=regular&week=3');
  await page.goBack();
  await expect(page.getByLabel('First manager')).toHaveValue(seb);
  await page.getByLabel('Game scope').selectOption('placement');
  await page.getByRole('button', { name: 'Compare managers' }).click();
  await expect(page.getByLabel('Head-to-head summary')).toContainText('0 meetings');
  await expect(page.getByText('No meetings in this selection.')).toBeVisible();
  await page.getByLabel('Second manager').selectOption(seb);
  await page.getByRole('button', { name: 'Compare managers' }).click();
  await expect(page.getByLabel('Head-to-head summary')).toHaveCount(0);
  await expect(page.getByText('Choose two different managers to compare.')).toBeVisible();
});

test('person nemeses and franchise owner-year rows open the intended actual pair', async ({ page }) => {
  await page.goto(`/managers/${tim}/?scope=regular&season=2021`);
  await page.getByRole('link', { name: 'Rivalries', exact: true }).last().click();
  await expect(page).toHaveURL(`/managers/${tim}/?tab=rivalries&scope=regular&season=2021`);
  await expect(page.getByRole('region', { name: 'Nemesis' })).toContainText('sebastian12');
  await expect(page.getByRole('region', { name: 'Nemesis' })).toContainText('0–3 · 3 meetings');
  await page.getByRole('table', { name: 'Opponent history' }).getByRole('link', { name: 'sebastian12', exact: true }).click();
  await expect(page).toHaveURL(`/rivalries/?a=${tim}&b=${seb}&season=2021&scope=regular`);
  await page.goBack();
  await expect(page.getByRole('link', { name: 'Rivalries', exact: true }).last()).toHaveAttribute('aria-current', 'page');
  await page.getByLabel('Game scope').selectOption('placement');
  await page.getByRole('button', { name: 'Show history' }).click();
  await expect(page).toHaveURL(/tab=rivalries&season=2021&scope=placement/);
  await expect(page.getByRole('region', { name: 'Nemesis' })).toHaveCount(0);
  await page.goto('/franchises/franchise-7/?tab=rivalries&scope=combined');
  const table = page.getByRole('table', { name: 'Franchise opponent history' });
  const woody = table.getByRole('row').filter({ hasText: 'Woody14' }).filter({ hasText: 'alecswartout' });
  await expect(woody).toContainText('2019');
  await expect(woody).toContainText('alecswartout');
  await woody.getByRole('link', { name: 'alecswartout', exact: true }).click();
  await expect(page).toHaveURL(`/rivalries/?a=person-472580465006473216&b=${alec}&season=2019&scope=combined`);
});

test('ten newest games expand through a shared URL and tied nemeses stay contextual', async ({ page }) => {
  const a = 'person-960000000000000001';
  const b = 'person-960000000000000002';
  await page.goto(`/rivalries/?a=${a}&b=${b}&season=2024&scope=regular`);
  const games = page.getByRole('table', { name: 'Head-to-head games' }).locator('tbody tr');
  await expect(games).toHaveCount(10);
  await expect(games.first()).toContainText('Week 13 · 2024');
  await expect(games.last()).toContainText('Week 4 · 2024');
  await page.getByRole('link', { name: 'Show all 13 games' }).click();
  await expect(page).toHaveURL(`/rivalries/?a=${a}&b=${b}&season=2024&scope=regular&limit=all`);
  await expect(games).toHaveCount(13);
  await page.reload();
  await expect(games).toHaveCount(13);
  await page.getByRole('link', { name: 'Week 1 · 2024', exact: true }).click();
  await expect(page).toHaveURL(/\/seasons\/2024\/matchups\//);
  await page.goBack();
  await expect(games).toHaveCount(13);
  await page.goto('/managers/person-960000000000000003/?tab=rivalries&season=2024');
  const nemeses = page.getByRole('region', { name: 'Nemeses', exact: true });
  await expect(nemeses.getByRole('link')).toHaveCount(2);
  await expect(nemeses).toContainText('Rivalry manager 04');
  await expect(nemeses).toContainText('Rivalry manager 05');
  await page.goto(`/managers/${a}/?tab=rivalries&season=2024`);
  await expect(page.getByRole('region', { name: /^Nemes/ })).toHaveCount(0);
});

test('rivalry views retain compact labeled rows, keyboard controls and image fallbacks at phone widths and 200% reflow', async ({ page, browser }) => {
  await page.route('https://sleepercdn.com/avatars/**', route => route.fulfill({ status: 404, body: '' }));
  const pair = '/rivalries/?a=person-960000000000000001&b=person-960000000000000002&season=2024&scope=regular';
  const pages = [pair, '/managers/person-960000000000000003/?tab=rivalries&season=2024', '/franchises/franchise-7/?tab=rivalries&scope=combined'];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [index, path] of pages.entries()) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}px`).toBe(true);
      await page.screenshot({ path: `.impeccable/review/ticket-16-controlled-${index}-${width}.png`, fullPage: true });
    }
  }
  await page.goto(pair);
  await expect(page.locator('.rivalry-person img')).toBeHidden();
  await expect(page.locator('.rivalry-person .team-image').first()).toContainText('RM');
  await page.getByLabel('First manager').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Second manager')).toBeFocused();
  await page.getByRole('button', { name: 'Compare managers' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Head-to-head summary')).toBeVisible();
  // 1280 physical pixels at 200% browser zoom gives a 640 CSS-pixel layout.
  const zoomContext = await browser.newContext({ viewport: { width: 640, height: 500 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const zoomPage = await zoomContext.newPage();
  await zoomPage.goto(new URL(pair, page.url()).href);
  expect(await zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(zoomPage.getByLabel('Second manager')).toBeVisible();
  await zoomPage.screenshot({ path: '.impeccable/review/ticket-16-controlled-200-percent.png', fullPage: true });
  await zoomContext.close();
  await page.goto('/rivalries/?a=person-800000000000000001&b=person-800000000000000002&season=2019');
  await expect(page.getByLabel('Head-to-head summary')).toContainText('0–0–1');
  await expect(page.getByLabel('Head-to-head summary')).toContainText('Last meeting tied');
  await expect(page.getByText(/How it’s measured|Last updated|Sample stats|Source JSON/)).toHaveCount(0);
});
