import { expect, test } from '@playwright/test';

test('user can add, configure, test, and toggle an MCP extension', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('changeme');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/chat$/);

  await page.getByRole('link', { name: 'Extensions' }).click();
  await expect(page).toHaveURL(/\/extensions$/);

  await page.getByRole('button', { name: 'Add MCP server' }).click();
  await page.getByPlaceholder('Server name').fill('Docs MCP');
  await page.getByPlaceholder('URL (optional if command is provided)').fill('https://docs.example/mcp');
  await page.getByRole('button', { name: 'Add server' }).click();

  await expect(page).toHaveURL(/\/extensions\/docs-mcp$/);
  await expect(page.getByRole('heading', { name: 'docs-mcp' })).toBeVisible();

  await page.getByRole('button', { name: 'Test connection' }).click();
  await expect(page.getByText(/^healthy$/).first()).toBeVisible();
  await expect(page.getByText(/auth connected/i).first()).toBeVisible();

  await page.getByRole('button', { name: 'configuration' }).click();
  await page.getByLabel('Extension command').fill('npx docs-mcp');
  await page.getByLabel('Extension command').blur();
  await expect(page.getByLabel('Extension command')).toHaveValue('npx docs-mcp');

  await page.getByRole('button', { name: 'capabilities' }).click();
  const firstToggle = page.locator('input[type="checkbox"]').first();
  const initial = await firstToggle.isChecked();
  await firstToggle.click();
  await expect(firstToggle).toHaveJSProperty('checked', !initial);

  const firstScope = page.locator('select').last();
  await firstScope.selectOption('session');

  await page.getByRole('link', { name: 'Extensions' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Tools' }).click();
  await expect(page.getByText('docs-mcp')).toBeVisible();
});
