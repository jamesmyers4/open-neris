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
    include: ['**/*.test.ts'],
    exclude: ['**/*.db.test.ts', '**/node_modules/**', '**/.next/**', 'vendor/**'],
    // Phase 0 ships zero real test files; later phases add them. Without this,
    // an empty suite makes `vitest run` (and CI) exit non-zero.
    passWithNoTests: true
  }
})
