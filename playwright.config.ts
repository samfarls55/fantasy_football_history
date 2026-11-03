import { defineConfig } from '@playwright/test';
import { env } from 'node:process';

export default defineConfig({
  testDir: './tests',
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
    reuseExistingServer: true,
  },
});
