'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentUnitResponseSchema } from '@/lib/validation/incident-unit-response.schema'

export type CreateUnitResponseState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function createUnitResponse(
  incidentId: string,
  _prevState: CreateUnitResponseState,
  formData: FormData
): Promise<CreateUnitResponseState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to add a unit.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    unitIdLinked: formData.get('unitIdLinked') || undefined,
    unitIdReported: formData.get('unitIdReported') || undefined,
    unitStaffingReported: formData.get('unitStaffingReported') ? Number(formData.get('unitStaffingReported')) : undefined,
    unableToDispatch: formData.get('unableToDispatch') ? formData.get('unableToDispatch') === 'true' : undefined,
    responseMode: formData.get('responseMode') || undefined,
    timeDispatch: formData.get('timeDispatch') || undefined,
    timeEnrouteToScene: formData.get('timeEnrouteToScene') || undefined,
    timeOnScene: formData.get('timeOnScene') || undefined,
    timeCanceledEnroute: formData.get('timeCanceledEnroute') || undefined,
    timeStaging: formData.get('timeStaging') || undefined,
    timeUnitClear: formData.get('timeUnitClear') || undefined,
    transportMode: formData.get('transportMode') || undefined
  }

  const parsed = incidentUnitResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = parsed.data

  await prisma.incidentUnitResponse.create({ data: { incidentId, ...data } })

  redirect(`/incidents/${incidentId}/unit-response`)
}
