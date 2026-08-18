import { vi } from 'vitest'
import type { User } from '@prisma/client'
import { getCurrentAppUser } from '@/lib/auth/current-user'

// Callers must `vi.mock('@/lib/auth/current-user')` themselves before importing
// this helper's functions — vi.mock is hoisted per-file, so it can't be done here.

export function buildFakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user_test_1',
    departmentId: 'dept_test_1',
    clerkId: 'clerk_test_1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'MEMBER',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  }
}

export function mockSignedInAs(overrides: Partial<User> = {}): User {
  const fakeUser = buildFakeUser(overrides)
  vi.mocked(getCurrentAppUser).mockResolvedValue(fakeUser)
  return fakeUser
}

export function mockSignedOut(): void {
  vi.mocked(getCurrentAppUser).mockResolvedValue(null)
}
