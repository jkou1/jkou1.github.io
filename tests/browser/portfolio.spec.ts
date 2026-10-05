import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/now-playing', route => route.fulfill({ json: { status: 'playing', title: 'Test song', artist: 'Test artist', durationMs: 240000, progressMs: 64000, fetchedAt: Date.now(), url: 'https://open.spotify.com/track/test' } }));
});

test('keyboard navigation, history, modal, filters, and direct board links', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A work in progress/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Test song' })).toBeVisible();
  await page.keyboard.press('d');
  await expect(page).toHaveURL(/\/board\/$/);
  await expect(page.getByRole('heading', { name: /The board/ })).toBeVisible();
  const pin = page.getByRole('button', { name: 'Enlarge A study in orbit' });
  await pin.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('a');
  await expect(page).toHaveURL(/\/board\/$/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(pin).toBeFocused();
  await page.getByRole('button', { name: 'Spaces', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Enlarge/ })).toHaveCount(2);
  await page.locator('main').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { name: /A work in progress/ })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: /The board/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /The board/ })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: /A work in progress/ })).toBeVisible();
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
