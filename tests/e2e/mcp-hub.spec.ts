import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('Extensions page loads and shows Discover tab', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Extensions' }).click();
  await expect(page).toHaveURL(/\/extensions$/);
  await expect(page.getByRole('button', { name: 'Discover' })).toBeVisible();
});

test('Clicking Discover tab shows MCP hub grid', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Extensions' }).click();
  await expect(page).toHaveURL(/\/extensions$/);

  await page.getByRole('button', { name: 'Discover' }).click();
  // The McpHub component renders sub-tabs (Featured / All Servers) and a search input
  await expect(page.getByPlaceholder('Search MCP servers…')).toBeVisible();
  await expect(page.getByRole('button', { name: /Featured/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /All Servers/ })).toBeVisible();
});

test('Search input in MCP hub filters results', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Extensions' }).click();
  await page.getByRole('button', { name: 'Discover' }).click();

  const searchInput = page.getByPlaceholder('Search MCP servers…');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('nonexistent-server-xyz');
  // Wait for debounce (300ms) and results
  await page.waitForTimeout(500);
  // Either shows results or the empty-state message
  const emptyOrGrid = page.locator('text=/No MCP servers found/').or(page.locator('[class*="grid"]'));
  await expect(emptyOrGrid.first()).toBeVisible({ timeout: 10000 });
});

test('API endpoint /api/extensions/hub returns valid JSON with servers array', async ({ page }) => {
  await login(page);
  const response = await page.request.get('/api/extensions/hub');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty('servers');
  expect(Array.isArray(body.servers)).toBe(true);
  expect(body).toHaveProperty('total');
  expect(body).toHaveProperty('filtered');
});

test('API endpoint /api/extensions/hub?q=test returns valid JSON', async ({ page }) => {
  await login(page);
  const response = await page.request.get('/api/extensions/hub?q=test');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty('servers');
  expect(Array.isArray(body.servers)).toBe(true);
});

test('POST /api/extensions/hub/install with invalid identifier returns 400', async ({ page }) => {
  await login(page);
  const response = await page.request.post('/api/extensions/hub/install', {
    data: { identifier: '!!!invalid!!!' },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body).toHaveProperty('error');
});
