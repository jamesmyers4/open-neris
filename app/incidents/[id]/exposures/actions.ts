'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentExposureSchema } from '@/lib/validation/incident-exposure.schema'

export type CreateExposureState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function createExposure(incidentId: string, _prevState: CreateExposureState, formData: FormData): Promise<CreateExposureState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to add an exposure.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    exposureType: formData.get('exposureType'),
    exposureItem: formData.get('exposureItem') || undefined,
    exposureDamage: formData.get('exposureDamage') || undefined,
    exposurePeoplePresent: formData.get('exposurePeoplePresent') ? formData.get('exposurePeoplePresent') === 'true' : undefined,
    exposureDisplacedNumber: formData.get('exposureDisplacedNumber') ? Number(formData.get('exposureDisplacedNumber')) : undefined,
    exposureDisplacedCauses: formData.getAll('exposureDisplacedCauses')
  }

  const parsed = incidentExposureSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = parsed.data

  await prisma.incidentExposure.create({
    data: {
      incidentId,
      exposureType: data.exposureType,
      exposureItem: data.exposureItem,
      exposureDamage: data.exposureDamage,
      exposurePeoplePresent: data.exposurePeoplePresent,
      exposureDisplacedNumber: data.exposureDisplacedNumber,
      exposureDisplacedCauses: data.exposureDisplacedCauses
    }
  })

  redirect(`/incidents/${incidentId}/exposures`)
}
