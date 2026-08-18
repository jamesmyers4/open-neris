'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { getSubmitCompleteness } from '@/lib/incidents/get-submit-completeness'

export async function submitIncident(incidentId: string): Promise<void> {
  const user = await getCurrentAppUser()
  if (!user) return

  const incident = await getIncidentDetail(incidentId, user.departmentId)
  if (!incident) return
  if (incident.reviewStatus !== 'OPEN') return

  const completeness = getSubmitCompleteness(incident)
  if (!completeness.complete) return

  await prisma.$transaction([
    prisma.incident.update({ where: { id: incidentId }, data: { reviewStatus: 'SUBMITTED' } }),
    prisma.reviewEvent.create({
      data: { incidentId, actorId: user.id, fromStatus: 'OPEN', toStatus: 'SUBMITTED' }
    })
  ])

  revalidatePath(`/incidents/${incidentId}`)
}
