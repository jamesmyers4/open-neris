import type { PrismaClient } from '@prisma/client'

// District access is oversight-only (FUTURE.md's default, confirmed
// FUTURE-PLAN.md Session 10) — scoped to exactly one department, never
// descendant departments, unlike the Organization/Users admin screens.
export async function getReviewQueue(prisma: PrismaClient, departmentId: string) {
  return prisma.incident.findMany({
    where: { departmentId, reviewStatus: { in: ['SUBMITTED', 'REVIEWED'] } },
    include: { types: { where: { isPrimary: true }, take: 1 } },
    orderBy: { createdAt: 'asc' }
  })
}
