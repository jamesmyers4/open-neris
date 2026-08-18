import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaClient, Prisma } from '@prisma/client'
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
// and returns a PrismaClient pointed at it. Call stopTestDatabase() when done
// (typically in an afterAll). Not safe to call concurrently across files —
// vitest.db.config.ts disables file parallelism for this reason.
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

// Asserts a promise rejects specifically with Postgres' unique-violation code
// (Prisma P2002) — narrower than a generic rejects.toThrow(), so a failure
// for an unrelated reason (e.g. a missing required field) doesn't false-pass.
export async function expectUniqueConstraintViolation(promise: Promise<unknown>): Promise<void> {
  try {
    await promise
    expect.unreachable('expected a unique constraint violation, but the write succeeded')
  } catch (error) {
    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
    expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2002')
  }
}
