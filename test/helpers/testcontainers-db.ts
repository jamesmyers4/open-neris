import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Invoke the Prisma CLI's JS entrypoint directly via `node`, rather than
// shelling out to the `npx`/`prisma` executable shim — avoids Windows-specific
// .cmd-wrapper spawning issues (EINVAL without shell:true) without needing
// shell:true (and its unescaped-argument concatenation) at all.
const prismaCli = path.resolve(process.cwd(), 'node_modules/prisma/build/cli.js')

export type TestDatabase = {
  container: StartedPostgreSqlContainer
  prisma: PrismaClient
}

// Spins up a throwaway Postgres container, migrates it to the current schema,
// and returns a PrismaClient pointed at it. Call stopTestDatabase() when done.
// Deliberately has no vitest dependency — shared by vitest's test/helpers/db.ts
// (which layers vitest-specific assertions on top) and Playwright's
// test/e2e/global-setup.ts, neither of which should pull in the other's runner.
export async function startTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start()
  const connectionString = container.getConnectionUri()

  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    env: { ...process.env, DIRECT_URL: connectionString, DATABASE_URL: connectionString },
    stdio: 'inherit'
  })

  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  return { container, prisma }
}

export async function stopTestDatabase({ container, prisma }: TestDatabase): Promise<void> {
  await prisma.$disconnect()
  await container.stop()
}
