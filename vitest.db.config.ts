import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  },
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.db.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', 'vendor/**'],
    // DB tests spin up a real Postgres container and run journeys through it —
    // slower and not safe to parallelize against a single shared container.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    passWithNoTests: true
  }
})
