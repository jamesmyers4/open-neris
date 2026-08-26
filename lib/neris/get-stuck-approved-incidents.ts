import type { PrismaClient } from '@prisma/client'

// An incident normally leaves APPROVED immediately (moved to SENT or ERROR by
// attemptNerisSubmission, called synchronously from approveIncident). Stuck
// here means the process crashed or timed out between the Approved
// transition committing and the submission attempt completing.
export async function getStuckApprovedIncidentIds(prisma: PrismaClient): Promise<{ id: string; departmentId: string }[]> {
  return prisma.incident.findMany({
    where: { reviewStatus: 'APPROVED' },
    select: { id: true, departmentId: true },
    orderBy: { createdAt: 'asc' }
  })
}
