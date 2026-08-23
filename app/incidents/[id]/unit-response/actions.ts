'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentUnitResponseSchema } from '@/lib/validation/incident-unit-response.schema'
import { quickAddUnitSchema } from '@/lib/validation/unit-quick-add.schema'

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

  const unit = await prisma.unit.findFirst({ where: { id: data.unitIdLinked, station: { departmentId: user.departmentId } } })
  if (!unit) {
    return { errors: { unitIdLinked: ['Select a valid unit.'] }, message: 'Fix the errors below and try again.' }
  }

  await prisma.incidentUnitResponse.create({ data: { incidentId, ...data } })

  redirect(`/incidents/${incidentId}/unit-response`)
}

export type QuickAddUnitState = {
  errors?: Record<string, string[] | undefined>
  message?: string
  unit?: { id: string; designation: string }
}

export async function quickAddUnit(
  incidentId: string,
  _prevState: QuickAddUnitState,
  formData: FormData
): Promise<QuickAddUnitState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to add a unit.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    designation: formData.get('designation') || undefined,
    capabilityType: formData.get('capabilityType') || undefined
  }

  const parsed = quickAddUnitSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  let station = await prisma.station.findFirst({ where: { departmentId: user.departmentId } })
  if (!station) {
    station = await prisma.station.create({ data: { departmentId: user.departmentId, label: 'Default Station' } })
  }

  const unit = await prisma.unit.create({
    data: { stationId: station.id, designation: parsed.data.designation, capabilityType: parsed.data.capabilityType }
  })

  revalidatePath(`/incidents/${incidentId}/unit-response`)
  revalidatePath(`/incidents/${incidentId}/unit-response/new`)

  return { unit: { id: unit.id, designation: unit.designation } }
}
