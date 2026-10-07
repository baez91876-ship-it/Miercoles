const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:4173/',
    browserName: 'chromium',
    channel: process.env.TEST_BROWSER_CHANNEL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: process.env.TEST_BASE_URL ? undefined : {
    command: 'node tests/server.cjs',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
  },
});
