import { test, expect } from '@playwright/test';

test('redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/chat');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('user can sign in, create a chat, send a message, and receive a streamed reply', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('changeme');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByRole('heading', { name: 'Pan workspace' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New chat', exact: true })).toBeVisible();

  await page.getByPlaceholder('Message Pan…').fill('Help me plan the Pan workspace');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'brief.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Pan workspace product brief'),
  });
  await expect(page.getByText('brief.txt').first()).toBeVisible();
  await page.getByRole('button', { name: 'Voice input' }).click();
  await expect(page.getByPlaceholder('Message Pan…')).toHaveValue(/Voice input captured/);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'Approve' }).click();

  await expect(page.locator('p').filter({ hasText: 'Help me plan the Pan workspace Voice input captured from mock microphone control.' }).last()).toBeVisible();
  await expect(page.getByText('brief.txt').first()).toBeVisible();
  await expect(page.locator('p:visible').filter({ hasText: /Mock mode is active/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'web_search' }).first()).toBeVisible();
  await expect(page.getByText(/Approval needed/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Artifact · text\/markdown/i }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Open workspace details' }).click();
  await expect(page.getByRole('button', { name: 'Context', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activity', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tools', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Output', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Session', exact: true })).toBeVisible();
});

test('user can search, rename, fork, archive, and update chat settings', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('changeme');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/chat$/);

  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await page.getByPlaceholder('Message Pan…').fill('Sprint 3 searchable session');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/Sprint 3 searchable session/).first()).toBeVisible();

  await page.getByPlaceholder('Search sessions…').fill('searchable');
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: 'Manage' }).click();
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByLabel('Rename session input').fill('Renamed Sprint 3 session');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.reload();

  await page.getByRole('button', { name: 'Manage' }).click();
  await page.getByRole('button', { name: 'Fork' }).click();
  await expect(page.getByRole('button', { name: /Renamed Sprint 3 session \(fork\)/i }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Settings model switcher').selectOption('claude-opus-4.6 · copilot');
  await page.getByLabel('Policy preset').selectOption('builder');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByText('builder').first()).toBeVisible();

  await page.getByRole('button', { name: 'Manage' }).click();
  await page.getByRole('button', { name: 'Archive' }).click();
  await page.getByRole('button', { name: 'Archive' }).last().click();
  await expect(page.getByText('Archived').first()).toBeVisible();
});
