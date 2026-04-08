import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('Plugins page loads at /plugins', async ({ page }) => {
  await login(page);
  await page.goto('/plugins');
  await expect(page).toHaveURL(/\/plugins$/);
  await expect(page.getByRole('heading', { name: 'Plugins' })).toBeVisible();
});

test('Plugins page shows empty state or plugin list', async ({ page }) => {
  await login(page);
  await page.goto('/plugins');
  // Either "No plugins installed" empty state or a plugin card grid
  const emptyState = page.getByText('No plugins installed');
  const pluginGrid = page.locator('[class*="grid"]').first();
  await expect(emptyState.or(pluginGrid)).toBeVisible({ timeout: 10000 });
});

test('API endpoint /api/plugins returns valid JSON with plugins array', async ({ page }) => {
  await login(page);
  const response = await page.request.get('/api/plugins');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty('plugins');
  expect(Array.isArray(body.plugins)).toBe(true);
});

test('POST /api/plugins/install with invalid identifier returns 400', async ({ page }) => {
  await login(page);
  const response = await page.request.post('/api/plugins/install', {
    data: { identifier: '!!!invalid!!!' },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body).toHaveProperty('error');
});

test('GET /api/plugins/nonexistent returns 404', async ({ page }) => {
  await login(page);
  const response = await page.request.get('/api/plugins/nonexistent');
  expect(response.status()).toBe(404);
  const body = await response.json();
  expect(body).toHaveProperty('error');
});

test('Sidebar has Plugins navigation item', async ({ page }) => {
  await login(page);
  // The sidebar renders with aria-label "Plugins" on the link
  const pluginsLink = page.getByRole('link', { name: 'Plugins' });
  await expect(pluginsLink).toBeVisible();
  await pluginsLink.click();
  await expect(page).toHaveURL(/\/plugins$/);
});
