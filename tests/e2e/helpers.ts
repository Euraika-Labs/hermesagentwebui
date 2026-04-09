import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Login helper that waits for React hydration before submitting.
 * In standalone builds, hydration can take a moment — clicking the
 * submit button before the onSubmit handler is attached causes a
 * plain GET form submission instead of the JS fetch POST.
 */
export async function login(page: Page, username = 'admin', password = 'changeme') {
  await page.goto('/login');
  await page.locator('form[data-hydrated]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/chat$/, { timeout: 10000 });
}
