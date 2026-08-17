'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentLocationTabSchema } from '@/lib/validation/incident-location.schema'

export type LocationFormState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function updateLocation(incidentId: string, _prevState: LocationFormState, formData: FormData): Promise<LocationFormState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to update this incident.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    streetAddressComplete: formData.get('streetAddressComplete'),
    city: formData.get('city') || undefined,
    county: formData.get('county') || undefined,
    state: formData.get('state'),
    postalCode: formData.get('postalCode') || undefined,
    country: formData.get('country') || 'US',
    place: formData.get('place') || undefined,
    useType: formData.get('useType') || undefined,
    useSubtype: formData.get('useSubtype') || undefined,
    useVacancy: formData.get('useVacancy') || undefined
  }

  const parsed = incidentLocationTabSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = {
    streetAddressComplete: parsed.data.streetAddressComplete,
    city: parsed.data.city ?? null,
    county: parsed.data.county ?? null,
    state: parsed.data.state,
    postalCode: parsed.data.postalCode ?? null,
    country: parsed.data.country,
    place: parsed.data.place ?? null,
    useType: parsed.data.useType ?? null,
    useSubtype: parsed.data.useSubtype ?? null,
    useVacancy: parsed.data.useVacancy ?? null
  }

  await prisma.incidentLocation.upsert({
    where: { incidentId },
    create: { incidentId, ...data },
    update: data
  })

  revalidatePath(`/incidents/${incidentId}/location`)
  return { message: 'Saved.' }
}
