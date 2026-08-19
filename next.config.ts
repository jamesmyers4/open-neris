import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolates the Playwright E2E dev server's build output (and Next's own
  // single-instance dev lock) from a developer's regular `npm run dev` in the
  // same working directory — otherwise Next refuses to start a second dev
  // server against the same .next dir even on a different port. Only set by
  // test/e2e/global-setup.ts; untouched for normal dev/build.
  distDir: process.env.NEXT_E2E_DIST_DIR || undefined,
};

export default nextConfig;
