import type { UserRole } from '@prisma/client'

export function canReview(role: UserRole): boolean {
  return role === 'OFFICER' || role === 'CHIEF' || role === 'ADMIN'
}

export function canApprove(role: UserRole): boolean {
  return role === 'CHIEF' || role === 'ADMIN'
}
