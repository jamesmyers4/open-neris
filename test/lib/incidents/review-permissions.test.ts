import { describe, expect, it } from 'vitest'
import { canReview, canApprove } from '@/lib/incidents/review-permissions'
import { UserRole } from '@prisma/client'

describe('canReview', () => {
  it('allows OFFICER, CHIEF, and ADMIN', () => {
    expect(canReview(UserRole.OFFICER)).toBe(true)
    expect(canReview(UserRole.CHIEF)).toBe(true)
    expect(canReview(UserRole.ADMIN)).toBe(true)
  })

  it('rejects MEMBER', () => {
    expect(canReview(UserRole.MEMBER)).toBe(false)
  })
})

describe('canApprove', () => {
  it('allows CHIEF and ADMIN', () => {
    expect(canApprove(UserRole.CHIEF)).toBe(true)
    expect(canApprove(UserRole.ADMIN)).toBe(true)
  })

  it('rejects OFFICER and MEMBER', () => {
    expect(canApprove(UserRole.OFFICER)).toBe(false)
    expect(canApprove(UserRole.MEMBER)).toBe(false)
  })
})
