'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentDispatchSchema, dispatchCommentSchema } from '@/lib/validation/incident-dispatch.schema'

export type DispatchFormState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function updateDispatch(incidentId: string, _prevState: DispatchFormState, formData: FormData): Promise<DispatchFormState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to update this incident.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    dispatchTimeCallArrival: formData.get('dispatchTimeCallArrival') || undefined,
    dispatchTimeCallAnswer: formData.get('dispatchTimeCallAnswer') || undefined,
    dispatchTimeCallCreate: formData.get('dispatchTimeCallCreate') || undefined,
    timeIncidentClear: formData.get('timeIncidentClear') || undefined,
    dispatchAutomaticAlarm: formData.get('dispatchAutomaticAlarm') ? formData.get('dispatchAutomaticAlarm') === 'true' : undefined,
    dispatchDeterminateCode: formData.get('dispatchDeterminateCode') || undefined,
    dispatchIncidentCode: formData.get('dispatchIncidentCode') || undefined,
    dispatchFinalDisposition: formData.get('dispatchFinalDisposition') || undefined
  }

  const parsed = incidentDispatchSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.incident.update({ where: { id: incidentId }, data: parsed.data })

  revalidatePath(`/incidents/${incidentId}/dispatch`)
  return { message: 'Saved.' }
}

export type AddCommentState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function addDispatchComment(incidentId: string, _prevState: AddCommentState, formData: FormData): Promise<AddCommentState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to add a comment.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    comment: formData.get('comment'),
    timestamp: formData.get('timestamp')
  }

  const parsed = dispatchCommentSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.incidentDispatchComment.create({
    data: { incidentId, comment: parsed.data.comment, timestamp: parsed.data.timestamp }
  })

  revalidatePath(`/incidents/${incidentId}/dispatch`)
  return { message: 'Comment added.' }
}
