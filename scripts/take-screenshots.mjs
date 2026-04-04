/* eslint-env node */
/* global process, console */

import { chromium } from '@playwright/test';
import path from 'node:path';

const base = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:3001';
const outDir = '/opt/projects/hermesagentwebui/docs/assets/screenshots';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });

await page.goto(`${base}/login`);
await page.screenshot({ path: path.join(outDir, 'login.png'), fullPage: true });

await page.locator('input[name="username"]').fill(process.env.HERMES_WORKSPACE_USERNAME || 'admin');
await page.locator('input[name="password"]').fill(process.env.HERMES_WORKSPACE_PASSWORD || 'changeme');
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForURL(/\/chat$/);
await page.screenshot({ path: path.join(outDir, 'chat-empty.png'), fullPage: true });

await page.getByPlaceholder('Message Hermes…').fill('Create a polished README screenshot');
await page.getByRole('button', { name: 'Send' }).click();
const approveButton = page.getByRole('button', { name: 'Approve' });
if (await approveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
  await approveButton.click();
}
await page.getByText(/Hermes mock mode is active|Create a polished README screenshot/).first().waitFor({ state: 'visible', timeout: 20000 });
await page.screenshot({ path: path.join(outDir, 'chat-runtime.png'), fullPage: true });

await page.goto(`${base}/settings/health`);
await page.screenshot({ path: path.join(outDir, 'runtime-health.png'), fullPage: true });

await page.goto(`${base}/settings/runs`);
await page.screenshot({ path: path.join(outDir, 'runs-explorer.png'), fullPage: true });

await browser.close();
console.log('Screenshots captured');
