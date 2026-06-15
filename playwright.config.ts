import { defineConfig, devices } from '@playwright/test';
import { baseURL } from './e2e/data/test-data';

/**
 * EggFleet admin web E2E suite.
 *
 * Runs the full Phase 0-9 plan from docs/e2e-test-plan.md end-to-end through
 * the real admin UI (no API shortcuts — see e2e/README.md). Tests run
 * sequentially and depend on each other's state (e.g. Phase 4 needs the
 * deliveries/payments created by the Maestro mobile run), so workers=1 and
 * fullyParallel=false.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  outputDir: 'e2e/test-results',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /setup\/.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      testMatch: /tests\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],
});
