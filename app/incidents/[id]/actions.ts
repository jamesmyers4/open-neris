'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { getSubmitCompleteness } from '@/lib/incidents/get-submit-completeness'
import { canReview, canApprove } from '@/lib/incidents/review-permissions'
import { notifySubmittedNeedsReview, notifyReviewedNeedsApproval, notifyKickedBack } from '@/lib/notifications/notify'

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

  if (submitted) {
    revalidatePath(`/incidents/${incidentId}`)
    await notifySubmittedNeedsReview(prisma, incident, user.id)
  }
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
    await notifyReviewedNeedsApproval(prisma, incident, user.id)
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

const kickbackSchema = z.object({ note: z.string().min(1) })

export type KickbackState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function kickbackIncident(incidentId: string, _prevState: KickbackState, formData: FormData): Promise<KickbackState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in.' }
  if (!canReview(user.role)) return { message: 'You do not have permission to kick back this incident.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const fromStatus = incident.reviewStatus
  if (fromStatus !== 'REVIEWED' && fromStatus !== 'APPROVED') {
    return { message: 'This incident cannot be kicked back from its current status.' }
  }

  const parsed = kickbackSchema.safeParse({ note: formData.get('note') || undefined })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'A note is required to kick back this incident.' }
  }

  const kicked = await prisma.$transaction(async tx => {
    const { count } = await tx.incident.updateMany({
      where: { id: incidentId, reviewStatus: fromStatus },
      data: { reviewStatus: 'OPEN' }
    })
    if (count === 0) return false

    await tx.reviewEvent.create({
      data: { incidentId, actorId: user.id, fromStatus, toStatus: 'OPEN', note: parsed.data.note }
    })
    return true
  })

  if (!kicked) return { message: 'This incident was already changed by someone else — refresh and try again.' }

  revalidatePath(`/incidents/${incidentId}`)
  revalidatePath('/incidents/review')
  await notifyKickedBack(prisma, incident, incident.createdById, user.id)
  return { message: 'Incident kicked back to Open.' }
}
