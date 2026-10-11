import { defineConfig, devices } from '@playwright/test';

// Optional end-to-end config. Playwright is not installed by default; when it
// is, this runs the offline lesson loop against the built app.
export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
