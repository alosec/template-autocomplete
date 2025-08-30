import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: !process.env.HEADED, // Disable parallel execution in headed mode
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : (process.env.HEADED ? 1 : undefined), // Force single worker in headed mode
  reporter: process.env.HEADED ? 'list' : 'html', // Use list reporter in headed mode to avoid hanging
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 15000,
    // Enable headed mode with slowdown when HEADED environment variable is set
    headless: !process.env.HEADED,
    launchOptions: {
      slowMo: process.env.HEADED ? 1000 : 0, // Move slowMo to launchOptions
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          slowMo: process.env.HEADED ? 1000 : 0,
        },
      },
    },
    {
      name: 'firefox',  
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          slowMo: process.env.HEADED ? 1000 : 0,
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});