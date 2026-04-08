import { defineConfig } from '@playwright/test';

const port = 3100;

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      HERMES_MOCK_MODE: 'true',
    },
  },
});
