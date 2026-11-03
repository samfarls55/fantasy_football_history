import { defineConfig } from '@playwright/test';
import { env } from 'node:process';
import { resolve } from 'node:path';

// Every browser run owns a separate controlled archive, including server reads.
env.MUSEUM_STORE_PATH = resolve(`.impeccable/review/browser-history-${process.pid}.json`);

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/setup-history.ts',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: env.MUSEUM_BASE_URL ?? 'http://127.0.0.1:4321',
    channel: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? undefined : 'chrome',
    launchOptions: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  },
  webServer: env.MUSEUM_BASE_URL ? undefined : {
    command: 'npm run dev -- --ignore-lock --port 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: false,
  },
});
