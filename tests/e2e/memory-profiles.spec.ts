import { expect, test } from '@playwright/test';

test('user can edit memory, inspect context, and view audit log', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('changeme');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/chat$/);

  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await page.getByPlaceholder('Message Pan…').fill('Context session for memory and profiles');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText(/Mock mode is active/).first()).toBeVisible();

  await page.getByRole('link', { name: 'Memory' }).click();
  await expect(page).toHaveURL(/\/memory$/);
  const memoryArea = page.locator('textarea').first();
  await memoryArea.fill('Updated user preference\nPrefers MCP visibility');
  await page.getByRole('button', { name: 'Save user memory' }).click();

  await page.getByRole('button', { name: 'Context inspector' }).click();
  await expect(page.getByText(/Context session for memory and profiles/).first()).toBeVisible();

  await page.getByRole('link', { name: 'Profiles' }).click();
  await expect(page).toHaveURL(/\/profiles$/);

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByLabel('Policy preset selector').selectOption('builder');
  await expect(page.getByText(/profile_policy_updated/).first()).toBeVisible();
});
