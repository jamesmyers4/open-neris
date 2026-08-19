import 'dotenv/config'
import { defineConfig } from '@playwright/test'
import { E2E_BASE_URL } from './test/e2e/constants'

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  // Single shared Testcontainers-backed DB and dev server (see global-setup.ts)
  // rather than one per worker — specs run serially against it, same
  // reasoning as vitest.db.config.ts's fileParallelism: false.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalSetup: './test/e2e/global-setup.ts',
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'retain-on-failure'
  }
})
