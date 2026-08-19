import { expect } from 'vitest'
import { Prisma } from '@prisma/client'

export { startTestDatabase, stopTestDatabase, type TestDatabase } from './testcontainers-db'

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
