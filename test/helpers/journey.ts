import { vi } from 'vitest'
import { redirect } from 'next/navigation'
import type { PrismaClient } from '@prisma/client'
import { createTestDepartment, createTestUser, createTestStation, createTestUnit } from './db-fixtures'
import { mockSignedInAs } from './auth'

// Shared by every DB-backed test file (Phase 2/4/5) that drives real server
// actions end to end through a Testcontainers Postgres instance — extracted
// during Phase 6's self-review after the same two helpers turned up
// independently, near-identically, in incident-journey.db.test.ts and
// concurrent-writes.db.test.ts. Deliberately takes `prisma`/the action
// function as parameters rather than importing them itself: each caller's
// own beforeAll still does the DATABASE_URL-then-dynamic-import dance
// (see TESTING.md's Phase 4 section) before these are ever called, and this
// module must stay side-effect-free so it's safe to import statically.

// A responding-unit FK is required on every IncidentUnitResponse row as of
// Session 4's Organization schema — every DB-backed journey test needs a real
// Unit to link against now that unitIdLinked is a genuine foreign key rather
// than freeform text, so seed one here alongside the department/user rather
// than in each call site individually.
export async function setupCallerContext(prisma: PrismaClient) {
  const department = await createTestDepartment(prisma)
  const user = await createTestUser(prisma, department.id)
  const station = await createTestStation(prisma, department.id)
  const unit = await createTestUnit(prisma, station.id)
  mockSignedInAs({ id: user.id, departmentId: department.id, clerkId: user.clerkId, name: user.name, email: user.email, role: user.role })
  return { department, user, unit }
}

type CreateIncidentAction = (prevState: Record<string, unknown>, formData: FormData) => Promise<unknown>

export async function createAndGetIncidentId(createIncident: CreateIncidentAction, formData: FormData): Promise<string> {
  vi.mocked(redirect).mockClear()
  await createIncident({}, formData)
  const path = vi.mocked(redirect).mock.calls.at(-1)?.[0] as string | undefined
  if (!path) throw new Error('createIncident did not redirect — creation likely failed')
  return path.split('/').pop()!
}

export function typesFormData(value1: string, value2?: string) {
  const fd = new FormData()
  fd.set('typesJson', JSON.stringify([{ value1, value2, isPrimary: true }]))
  fd.set('alarmTime', '2026-02-01T12:00:00Z')
  return fd
}
