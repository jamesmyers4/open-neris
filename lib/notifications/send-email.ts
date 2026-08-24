import { Resend } from 'resend'
import type { NotificationType } from '@prisma/client'
import { getAppBaseUrl } from '@/lib/app-url'

const SUBJECTS: Record<NotificationType, string> = {
  SUBMITTED_NEEDS_REVIEW: 'An incident needs your review',
  REVIEWED_NEEDS_APPROVAL: 'An incident needs your approval',
  KICKED_BACK: 'An incident was sent back to you'
}

export async function sendNotificationEmail(
  to: string,
  type: NotificationType,
  incidentId: string,
  incidentInternalId: string
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.NOTIFICATIONS_FROM_EMAIL ?? 'notifications@example.com'
  const url = `${getAppBaseUrl()}/incidents/${incidentId}`

  await resend.emails.send({
    from,
    to,
    subject: SUBJECTS[type],
    text: `Incident ${incidentInternalId}: ${SUBJECTS[type]}.\n\nView it: ${url}`
  })
}
