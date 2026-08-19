import 'dotenv/config'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { clerkSetup } from '@clerk/testing/playwright'
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '../helpers/testcontainers-db'
import { E2E_BASE_URL, E2E_PORT } from './constants'

const REQUIRED_ENV = [
  'E2E_CLERK_USER_EMAIL',
  'E2E_CLERK_USER_PASSWORD',
  'E2E_CLERK_USER_ID',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY'
] as const

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      // Any response (including a redirect to /sign-in) means the server is up.
      if (res.status < 500) return
    } catch {
      // Not accepting connections yet — keep polling.
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting ${timeoutMs}ms for the E2E dev server at ${url}`)
}

// taskkill /t kills the whole process tree by parent-child PID relationship,
// which next dev's Turbopack child process needs on Windows — a plain
// ChildProcess.kill() only signals the immediate `next` process and leaves
// Turbopack running. See test/helpers/testcontainers-db.ts's neighboring
// Windows-specific note on the Prisma CLI for the same class of issue.
function killServerTree(server: ChildProcess): void {
  if (process.platform === 'win32' && server.pid) {
    spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'])
  } else {
    server.kill('SIGTERM')
  }
}

// Playwright's own `webServer` config option starts before globalSetup runs
// (confirmed against the installed playwright package's task ordering), which
// is too late here — the server needs DATABASE_URL pointed at a container
// that doesn't exist yet. So this file owns the whole lifecycle itself: spin
// up a throwaway Postgres, seed a department + a User row matching the real
// Clerk test user (see TESTING.md's "E2E suite" section for how that user is
// created), fetch a Clerk testing token, then spawn `next dev` against the
// container. The returned function is Playwright's documented teardown hook.
export default async function globalSetup(): Promise<() => Promise<void>> {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(`Missing ${key} — see TESTING.md's "E2E suite" section for setup steps.`)
    }
  }

  const db: TestDatabase = await startTestDatabase()

  const department = await db.prisma.department.create({ data: { name: 'E2E Test Department' } })
  await db.prisma.user.create({
    data: {
      departmentId: department.id,
      clerkId: process.env.E2E_CLERK_USER_ID!,
      name: 'E2E Test User',
      email: process.env.E2E_CLERK_USER_EMAIL!,
      role: 'MEMBER'
    }
  })

  await clerkSetup({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!
  })

  const nextBin = path.resolve(process.cwd(), 'node_modules/next/dist/bin/next')
  const server = spawn(process.execPath, [nextBin, 'dev', '-p', String(E2E_PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: db.container.getConnectionUri(), NEXT_E2E_DIST_DIR: '.next-e2e' },
    stdio: 'inherit'
  })

  await waitForServer(E2E_BASE_URL, 120_000)

  return async () => {
    killServerTree(server)
    await stopTestDatabase(db)
  }
}
