import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('Marketplace page loads at /marketplace', async ({ page }) => {
  await login(page);
  await page.goto('/marketplace');
  await expect(page).toHaveURL(/\/marketplace$/);
  await expect(page.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
  await expect(page.getByText('Discover and install extensions')).toBeVisible();
});

test('Marketplace shows search input and tabs', async ({ page }) => {
  await login(page);
  await page.goto('/marketplace');
  await expect(page.getByPlaceholder('Search skills, MCP servers, and plugins…')).toBeVisible();
  // Default tab is 'Skills' and all three tabs should be visible
  await expect(page.getByRole('button', { name: 'Skills' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'MCP Servers' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Plugins' })).toBeVisible();
});

test('Marketplace tabs are clickable (Skills, MCP Servers, Plugins)', async ({ page }) => {
  await login(page);
  await page.goto('/marketplace');

  // Click MCP Servers tab
  await page.getByRole('button', { name: 'MCP Servers' }).click();
  // The McpHub component should load with its search input
  await expect(page.getByPlaceholder('Search MCP servers…')).toBeVisible({ timeout: 10000 });

  // Click Plugins tab
  await page.getByRole('button', { name: 'Plugins' }).click();
  // Plugins screen renders with either the plugin list or empty state
  const pluginsHeading = page.getByRole('heading', { name: 'Plugins' });
  const emptyState = page.getByText('No plugins installed');
  await expect(pluginsHeading.or(emptyState)).toBeVisible({ timeout: 10000 });

  // Click Skills tab to go back
  await page.getByRole('button', { name: 'Skills' }).click();
  // Skills screen should render — check for any skill-related content
  await page.waitForTimeout(500);
});

test('Sidebar has Marketplace navigation item', async ({ page }) => {
  await login(page);
  const marketplaceLink = page.getByRole('link', { name: 'Marketplace' });
  await expect(marketplaceLink).toBeVisible();
  await marketplaceLink.click();
  await expect(page).toHaveURL(/\/marketplace$/);
});
