import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/now-playing', route => route.fulfill({ json: { status: 'playing', title: 'Test song', artist: 'Test artist', durationMs: 240000, progressMs: 64000, fetchedAt: Date.now(), url: 'https://open.spotify.com/track/test' } }));
  // Simulate Pinterest's delayed bootstrap and replacement of the embed anchor.
  await page.route('https://assets.pinterest.com/js/pinit.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    setTimeout(() => {
      window.PinUtils = { build(host) {
        const anchor = host.querySelector('[data-pin-do="embedBoard"]');
        if (!anchor) return;
        const preview = document.createElement('div');
        preview.dataset.testid = 'pinterest-preview';
        preview.dataset.boardUrl = anchor.href;
        preview.textContent = 'Pinterest board preview';
        preview.style.height = '600px';
        anchor.replaceWith(preview);
      } };
    }, 100);
  ` }));
});

test('keyboard navigation, history, Pinterest embed, and direct board links', async ({ page }) => {
  let scriptRequests = 0;
  page.on('request', request => { if (request.url() === 'https://assets.pinterest.com/js/pinit.js') scriptRequests++; });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Style is the difference/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Test song' })).toBeVisible();
  expect(scriptRequests).toBe(0);
  await page.keyboard.press('d');
  await expect(page).toHaveURL(/\/board\/$/);
  await expect(page.getByRole('heading', { name: /The board/ })).toBeVisible();
  const boardUrl = 'https://www.pinterest.com/DJDAIMY0/retro-futuristic-fashion/';
  await expect(page.getByTestId('pinterest-preview')).toHaveAttribute('data-board-url', boardUrl);
  await expect(page.getByRole('link', { name: 'Open board on Pinterest' })).toHaveAttribute('href', boardUrl);
  await expect(page.getByRole('button', { name: /^Enlarge/ })).toHaveCount(0);
  await page.locator('main').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { name: /Style is the difference/ })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: /The board/ })).toBeVisible();
  await expect(page.getByTestId('pinterest-preview')).toHaveCount(1);
  expect(scriptRequests).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: /The board/ })).toBeVisible();
  await expect(page.getByTestId('pinterest-preview')).toBeVisible();
});

test('Pinterest script failure keeps the direct board link usable', async ({ page }) => {
  await page.route('https://assets.pinterest.com/js/pinit.js', route => route.abort());
  await page.goto('/board/');
  await expect(page.getByRole('status')).toContainText('The Pinterest preview is unavailable.');
  await expect(page.getByRole('link', { name: 'Open board on Pinterest' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'view the board on Pinterest', exact: false })).toHaveAttribute('href', 'https://www.pinterest.com/DJDAIMY0/retro-futuristic-fashion/');
  await page.getByRole('button', { name: 'Previous page: Home' }).click();
  await expect(page.getByRole('heading', { name: /Style is the difference/ })).toBeVisible();
});

test('WASD respects typing, modifiers, and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => { const input = document.createElement('input'); input.id = 'test-input'; document.body.append(input); input.focus(); });
  await page.keyboard.type('wasd');
  await expect(page.locator('#test-input')).toHaveValue('wasd');
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await page.locator('main').focus();
  await page.keyboard.press('Shift+D');
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await page.keyboard.press('s');
  await expect(page.getByRole('heading', { name: /The board/ })).toBeVisible();
  await page.keyboard.press('w');
  await expect(page.getByRole('heading', { name: /Style is the difference/ })).toBeVisible();
});

test('responsive layout and player collapse', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Test song' })).toBeVisible();
  const before = await page.locator('.time-labels').textContent();
  await expect.poll(() => page.locator('.time-labels').textContent()).not.toBe(before);
  await page.getByRole('button', { name: 'Minimize listening window' }).click();
  await expect(page.getByRole('heading', { name: 'Test song' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Expand listening window' }).click();
  await expect(page.getByRole('heading', { name: 'Test song' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto('/board/');
  await expect(page.getByTestId('pinterest-preview')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Spotify failures and idle states are honest', async ({ page }) => {
  await page.route('**/api/now-playing', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.goto('/');
  await expect(page.getByText('Listening status is unavailable.')).toBeVisible();
  await expect(page.locator('.equalizer')).not.toHaveClass(/is-playing/);
  await page.route('**/api/now-playing', route => route.fulfill({ json: { status: 'idle', fetchedAt: Date.now() } }));
  await page.reload();
  await expect(page.getByText('Nothing playing right now.')).toBeVisible();
});

test('local API returns JSON and rejects writes', async ({ request }) => {
  const response = await request.get('/api/now-playing');
  expect(response.headers()['content-type']).toContain('application/json');
  const body = await response.text();
  expect(body).not.toContain('SPOTIFY_CLIENT_SECRET');
  expect(body).not.toContain('access_token');
  expect((await request.post('/api/now-playing')).status()).toBe(405);
});
