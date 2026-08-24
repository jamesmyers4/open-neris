'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { getSubmitCompleteness } from '@/lib/incidents/get-submit-completeness'
import { canReview, canApprove } from '@/lib/incidents/review-permissions'

export async function submitIncident(incidentId: string): Promise<void> {
  const user = await getCurrentAppUser()
  if (!user) return

  const incident = await getIncidentDetail(incidentId, user.departmentId)
  if (!incident) return
  if (incident.reviewStatus !== 'OPEN') return

  const completeness = getSubmitCompleteness(incident)
  if (!completeness.complete) return

  const submitted = await prisma.$transaction(async tx => {
    const { count } = await tx.incident.updateMany({
      where: { id: incidentId, reviewStatus: 'OPEN' },
      data: { reviewStatus: 'SUBMITTED' }
    })
    if (count === 0) return false

    await tx.reviewEvent.create({
      data: { incidentId, actorId: user.id, fromStatus: 'OPEN', toStatus: 'SUBMITTED' }
    })
    return true
  })

  if (submitted) revalidatePath(`/incidents/${incidentId}`)
}

export async function markReviewed(incidentId: string): Promise<void> {
  const user = await getCurrentAppUser()
  if (!user) return
  if (!canReview(user.role)) return

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return
  if (incident.reviewStatus !== 'SUBMITTED') return

  const reviewed = await prisma.$transaction(async tx => {
    const { count } = await tx.incident.updateMany({
      where: { id: incidentId, reviewStatus: 'SUBMITTED' },
      data: { reviewStatus: 'REVIEWED', reviewedById: user.id }
    })
    if (count === 0) return false

    await tx.reviewEvent.create({
      data: { incidentId, actorId: user.id, fromStatus: 'SUBMITTED', toStatus: 'REVIEWED' }
    })
    return true
  })

  if (reviewed) {
    revalidatePath(`/incidents/${incidentId}`)
    revalidatePath('/incidents/review')
  }
}

export async function approveIncident(incidentId: string): Promise<void> {
  const user = await getCurrentAppUser()
  if (!user) return
  if (!canApprove(user.role)) return

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return
  if (incident.reviewStatus !== 'REVIEWED') return

  const approved = await prisma.$transaction(async tx => {
    const { count } = await tx.incident.updateMany({
      where: { id: incidentId, reviewStatus: 'REVIEWED' },
      data: { reviewStatus: 'APPROVED', approvedById: user.id }
    })
    if (count === 0) return false

    await tx.reviewEvent.create({
      data: { incidentId, actorId: user.id, fromStatus: 'REVIEWED', toStatus: 'APPROVED' }
    })
    return true
  })

  if (approved) {
    revalidatePath(`/incidents/${incidentId}`)
    revalidatePath('/incidents/review')
  }
}
