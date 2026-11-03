import { defineConfig } from '@playwright/test';
import { env } from 'node:process';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: env.MUSEUM_BASE_URL ?? 'http://127.0.0.1:4321',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  },
  webServer: env.MUSEUM_BASE_URL ? undefined : {
    command: 'npm run dev -- --port 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: true,
  },
});
