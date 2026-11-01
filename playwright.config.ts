import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'npm run dev',
    port: 1420,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:1420',
    viewport: { width: 375, height: 812 },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
