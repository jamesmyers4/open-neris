import type { PrismaClient, NotificationType } from '@prisma/client'
import { isSoloDepartment } from './is-solo-department'
import { sendNotificationEmail } from './send-email'
import { canReview, canApprove } from '@/lib/incidents/review-permissions'

type IncidentRef = { id: string; internalId: string; departmentId: string }

// Every exported function here is a best-effort side effect on top of an
// already-succeeded status transition — a notification failure (DB or
// email) must never make the calling action's promise reject, since the
// actual requested workflow action (submit/review/kickback) already
// completed by the time this runs.
async function notifyUserIds(prisma: PrismaClient, incident: IncidentRef, recipientIds: string[], type: NotificationType): Promise<void> {
  if (recipientIds.length === 0) return
  if (await isSoloDepartment(prisma, incident.departmentId)) return

  await prisma.notification.createMany({
    data: recipientIds.map(userId => ({ userId, incidentId: incident.id, type }))
  })

  const recipients = await prisma.user.findMany({ where: { id: { in: recipientIds } } })
  await Promise.all(
    recipients.map(r =>
      sendNotificationEmail(r.email, type, incident.id, incident.internalId).catch(error => {
        console.error(`Failed to send ${type} notification email to ${r.email}:`, error)
      })
    )
  )
}

export async function notifySubmittedNeedsReview(prisma: PrismaClient, incident: IncidentRef, actorId: string): Promise<void> {
  try {
    const candidates = await prisma.user.findMany({
      where: { departmentId: incident.departmentId, status: 'ACTIVE', id: { not: actorId } }
    })
    const recipientIds = candidates.filter(u => canReview(u.role)).map(u => u.id)
    await notifyUserIds(prisma, incident, recipientIds, 'SUBMITTED_NEEDS_REVIEW')
  } catch (error) {
    console.error('notifySubmittedNeedsReview failed:', error)
  }
}

export async function notifyReviewedNeedsApproval(prisma: PrismaClient, incident: IncidentRef, actorId: string): Promise<void> {
  try {
    const candidates = await prisma.user.findMany({
      where: { departmentId: incident.departmentId, status: 'ACTIVE', id: { not: actorId } }
    })
    const recipientIds = candidates.filter(u => canApprove(u.role)).map(u => u.id)
    await notifyUserIds(prisma, incident, recipientIds, 'REVIEWED_NEEDS_APPROVAL')
  } catch (error) {
    console.error('notifyReviewedNeedsApproval failed:', error)
  }
}

export async function notifyKickedBack(prisma: PrismaClient, incident: IncidentRef, submitterId: string, actorId: string): Promise<void> {
  try {
    const recipientIds = submitterId === actorId ? [] : [submitterId]
    await notifyUserIds(prisma, incident, recipientIds, 'KICKED_BACK')
  } catch (error) {
    console.error('notifyKickedBack failed:', error)
  }
}
