'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentRescueFfSchema, incidentRescueNonFfSchema } from '@/lib/validation/incident-rescue.schema'

export type CreateRescueState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function createRescueFf(incidentId: string, _prevState: CreateRescueState, formData: FormData): Promise<CreateRescueState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to add a casualty.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    birthMonthYear: formData.get('birthMonthYear') || undefined,
    gender: formData.get('gender') || undefined,
    race: formData.get('race') || undefined,
    casualtyRank: formData.get('casualtyRank') || undefined,
    casualtyService: formData.get('casualtyService') ? Number(formData.get('casualtyService')) : undefined,
    rescueType: formData.get('rescueType') || undefined,
    primaryMode: formData.get('primaryMode') || undefined,
    actions: formData.getAll('actions'),
    impedimentTypes: formData.getAll('impedimentTypes'),
    mayday: formData.get('mayday') === 'true',
    maydayRelativeTime: formData.get('maydayRelativeTime') || undefined,
    ritActivated: formData.get('ritActivated') ? formData.get('ritActivated') === 'true' : undefined,
    roomType: formData.get('roomType') || undefined,
    elevationType: formData.get('elevationType') || undefined,
    gasIsolation: formData.get('gasIsolation') ? formData.get('gasIsolation') === 'true' : undefined,
    removalPathType: formData.get('removalPathType') || undefined,
    fireRelativeTime: formData.get('fireRelativeTime') || undefined,
    casualtyType: formData.get('casualtyType') || undefined,
    casualtyClassification: formData.get('casualtyClassification') || undefined,
    linkedUnitId: formData.get('linkedUnitId') || undefined,
    reportedUnitId: formData.get('reportedUnitId') || undefined,
    dutyType: formData.get('dutyType') || undefined,
    casualtyCause: formData.get('casualtyCause') || undefined,
    casualtyAction: formData.get('casualtyAction') || undefined,
    casualtyPpe: formData.getAll('casualtyPpe'),
    incidentCommand: formData.get('incidentCommand') ? formData.get('incidentCommand') === 'true' : undefined,
    casualtyTimeline: formData.get('casualtyTimeline') || undefined
  }

  const parsed = incidentRescueFfSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = parsed.data

  await prisma.incidentRescueFf.create({ data: { incidentId, ...data } })

  redirect(`/incidents/${incidentId}/rescues`)
}

export async function createRescueNonFf(incidentId: string, _prevState: CreateRescueState, formData: FormData): Promise<CreateRescueState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to add a casualty.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    birthMonthYear: formData.get('birthMonthYear') || undefined,
    gender: formData.get('gender') || undefined,
    race: formData.get('race') || undefined,
    rescueType: formData.get('rescueType') || undefined,
    presenceKnown: formData.get('presenceKnown') || undefined,
    primaryMode: formData.get('primaryMode') || undefined,
    actions: formData.getAll('actions'),
    impedimentTypes: formData.getAll('impedimentTypes'),
    roomType: formData.get('roomType') || undefined,
    elevationType: formData.get('elevationType') || undefined,
    gasIsolation: formData.get('gasIsolation') ? formData.get('gasIsolation') === 'true' : undefined,
    removalPathType: formData.get('removalPathType') || undefined,
    fireRelativeTime: formData.get('fireRelativeTime') || undefined,
    casualtyType: formData.get('casualtyType') || undefined,
    casualtyCause: formData.get('casualtyCause') || undefined
  }

  const parsed = incidentRescueNonFfSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = parsed.data

  await prisma.incidentRescueNonFf.create({ data: { incidentId, ...data } })

  redirect(`/incidents/${incidentId}/rescues`)
}
