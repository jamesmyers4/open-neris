'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentActionTakenEntrySchema, incidentNoActionReasonSchema } from '@/lib/validation/incident-actions-taken.schema'

export type NoActionFormState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function setNoActionReason(incidentId: string, _prevState: NoActionFormState, formData: FormData): Promise<NoActionFormState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to update this incident.' }

  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, departmentId: user.departmentId },
    include: { actionsTaken: true }
  })
  if (!incident) return { message: 'Incident not found.' }

  if (incident.actionsTaken.length > 0) {
    return { message: 'Remove all actions taken entries before selecting a no-action reason.' }
  }

  const raw = { incidentNoActionReason: formData.get('incidentNoActionReason') || undefined }

  const parsed = incidentNoActionReasonSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.incident.update({
    where: { id: incidentId },
    data: { incidentNoActionReason: parsed.data.incidentNoActionReason ?? null }
  })

  revalidatePath(`/incidents/${incidentId}/actions-taken`)
  return { message: 'Saved.' }
}

export type AddActionTakenState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function addActionTaken(incidentId: string, _prevState: AddActionTakenState, formData: FormData): Promise<AddActionTakenState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to add an action taken.' }

  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, departmentId: user.departmentId },
    include: { actionsTaken: true }
  })
  if (!incident) return { message: 'Incident not found.' }

  if (incident.incidentNoActionReason) {
    return { message: 'Clear the no-action reason before adding actions taken.' }
  }

  const raw = {
    value1: formData.get('value1'),
    value2: formData.get('value2') || undefined
  }

  const parsed = incidentActionTakenEntrySchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.incidentActionTaken.create({
    data: {
      incidentId,
      value1: parsed.data.value1,
      value2: parsed.data.value2,
      sortOrder: incident.actionsTaken.length
    }
  })

  revalidatePath(`/incidents/${incidentId}/actions-taken`)
  return { message: 'Action added.' }
}

export async function removeActionTaken(incidentId: string, actionTakenId: string): Promise<void> {
  const user = await getCurrentAppUser()
  if (!user) return

  const entry = await prisma.incidentActionTaken.findFirst({
    where: { id: actionTakenId, incidentId, incident: { departmentId: user.departmentId } }
  })
  if (!entry) return

  await prisma.incidentActionTaken.delete({ where: { id: actionTakenId } })
  revalidatePath(`/incidents/${incidentId}/actions-taken`)
}
