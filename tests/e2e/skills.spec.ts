import { expect, test } from '@playwright/test';

test('user can inspect a skill, edit a local skill, and load it into the current session', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('changeme');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/chat$/);

  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await page.getByPlaceholder('Message Pan…').fill('Create an active session for skills');
  await page.getByRole('button', { name: 'Send' }).click();
  const approveButton = page.getByRole('button', { name: 'Approve' });
  if (await approveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await approveButton.click();
  }
  await expect(page.getByText(/Create an active session for skills/).first()).toBeVisible();

  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page).toHaveURL(/\/skills$/);
  await expect(page.getByText(/Loaded in current session/i)).toBeVisible();
  await page.getByRole('link', { name: /skill-authoring/i }).click();
  await expect(page).toHaveURL(/\/skills\/skill-authoring$/);

  await page.getByRole('button', { name: 'Enable' }).click();
  await expect(page.getByText('Enabled')).toBeVisible();

  const editor = page.locator('textarea');
  await editor.fill('# Skill Authoring\n\nUpdated from Playwright.');
  await page.getByRole('button', { name: 'Save skill' }).click();
  await expect(editor).toHaveValue(/Updated from Playwright/);

  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await page.getByRole('link', { name: /hermes-agent/i }).first().click();
  await expect(page.getByText(/Tool expectations/i)).toBeVisible();
  await page.getByRole('button', { name: 'Load into current session' }).click();
  await expect(page.getByText(/Current chat session available/)).toBeVisible();

  await page.getByRole('link', { name: 'Chat' }).click();
  await expect(page.getByText(/Loaded skills: hermes-agent/).first()).toBeVisible();
});
