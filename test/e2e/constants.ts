// Fixed, non-default port so the E2E dev server never collides with a
// developer's own `npm run dev` on 3000. Shared between playwright.config.ts
// (for `use.baseURL`) and global-setup.ts (for the spawned `next dev`),
// so it's a single source of truth rather than two copies of the same port.
export const E2E_PORT = 3100
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`
