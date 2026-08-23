import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser } from '@/test/helpers/db-fixtures'
import { resolveDepartmentSignup } from '@/lib/onboarding/resolve-department-signup'

// Session 7 (FUTURE-PLAN.md): self-serve signup's three real branches, run
// against real Postgres — this is where the CLAIMED branch's row-lock-based
// race guard (SELECT ... FOR UPDATE inside a transaction, same "atomic
// check-and-act inside $transaction" style as submitIncident's optimistic
// locking) actually gets to prove itself against genuine concurrent
// transactions, which a mocked-Prisma test cannot do.
describe('resolveDepartmentSignup (Testcontainers Postgres)', () => {
  let db: TestDatabase

  beforeAll(async () => {
    db = await startTestDatabase()
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  it('CREATED: a brand-new department name creates both the Department and its first Admin User', async () => {
    const signer = { clerkId: 'clerk_create_1', name: 'New Admin', email: 'new-admin@example.com' }

    const result = await resolveDepartmentSignup(
      db.prisma,
      { departmentName: 'Brand New FD', city: 'Anytown', state: 'NY' },
      signer
    )

    expect(result.outcome).toBe('CREATED')
    if (result.outcome !== 'CREATED') throw new Error('unreachable')

    const department = await db.prisma.department.findUniqueOrThrow({ where: { id: result.departmentId } })
    expect(department).toMatchObject({ name: 'Brand New FD', city: 'Anytown', state: 'NY' })

    const user = await db.prisma.user.findUniqueOrThrow({ where: { id: result.userId } })
    expect(user).toMatchObject({ departmentId: result.departmentId, clerkId: signer.clerkId, role: 'ADMIN' })
  })

  it('CONTACT_ADMIN: a department that already has an Admin routes to that admin\'s contact info instead of creating a User', async () => {
    const department = await createTestDepartment(db.prisma, { name: 'Existing FD', city: 'Somewhere', state: 'CA' })
    const admin = await createTestUser(db.prisma, department.id, { role: 'ADMIN', name: 'Existing Admin', email: 'existing@example.com' })
    const signer = { clerkId: 'clerk_contact_1', name: 'Hopeful Signer', email: 'hopeful@example.com' }

    const result = await resolveDepartmentSignup(
      db.prisma,
      { departmentName: 'Existing FD', city: 'Somewhere', state: 'CA' },
      signer
    )

    expect(result).toEqual({ outcome: 'CONTACT_ADMIN', admin: { name: admin.name, email: admin.email } })
    expect(await db.prisma.user.findUnique({ where: { clerkId: signer.clerkId } })).toBeNull()
  })

  it('CLAIMED: a matching department with zero Admins lets the signer claim Admin ownership', async () => {
    const department = await createTestDepartment(db.prisma, { name: 'Orphaned FD', city: 'Ghost Town', state: 'TX' })
    await createTestUser(db.prisma, department.id, { role: 'MEMBER' })
    const signer = { clerkId: 'clerk_claim_1', name: 'Claiming Admin', email: 'claimer@example.com' }

    const result = await resolveDepartmentSignup(
      db.prisma,
      { departmentName: 'Orphaned FD', city: 'Ghost Town', state: 'TX' },
      signer
    )

    expect(result).toEqual({ outcome: 'CLAIMED', departmentId: department.id, userId: expect.any(String) })

    const claimant = await db.prisma.user.findUniqueOrThrow({ where: { clerkId: signer.clerkId } })
    expect(claimant).toMatchObject({ departmentId: department.id, role: 'ADMIN' })
  })

  it('race: two signers claiming the same orphaned department simultaneously produce exactly one CLAIMED and one CONTACT_ADMIN pointed at the winner', async () => {
    const department = await createTestDepartment(db.prisma, { name: 'Contested FD', city: 'Rival City', state: 'OH' })
    const signerA = { clerkId: 'clerk_race_a', name: 'Signer A', email: 'a@example.com' }
    const signerB = { clerkId: 'clerk_race_b', name: 'Signer B', email: 'b@example.com' }
    const departmentInput = { departmentName: 'Contested FD', city: 'Rival City', state: 'OH' }

    const [resultA, resultB] = await Promise.all([
      resolveDepartmentSignup(db.prisma, departmentInput, signerA),
      resolveDepartmentSignup(db.prisma, departmentInput, signerB)
    ])

    const outcomes = [resultA.outcome, resultB.outcome].sort()
    expect(outcomes).toEqual(['CLAIMED', 'CONTACT_ADMIN'])

    const winner = resultA.outcome === 'CLAIMED' ? resultA : resultB
    const loser = resultA.outcome === 'CONTACT_ADMIN' ? resultA : resultB
    if (winner.outcome !== 'CLAIMED' || loser.outcome !== 'CONTACT_ADMIN') throw new Error('unreachable')

    const winningSigner = winner.userId === (await db.prisma.user.findUniqueOrThrow({ where: { clerkId: signerA.clerkId } })).id
      ? signerA
      : signerB
    expect(loser.admin.email).toBe(winningSigner.email)

    expect(await db.prisma.user.count({ where: { departmentId: department.id, role: 'ADMIN' } })).toBe(1)
  })
})
