'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentPeopleDisplacementTabSchema, incidentDisplacementSchema } from '@/lib/validation/incident-people-displacement.schema'

export type PeopleFormState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function updatePeople(incidentId: string, _prevState: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to update this incident.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    incidentPeoplePresent: formData.get('incidentPeoplePresent') ? formData.get('incidentPeoplePresent') === 'true' : undefined,
    incidentRescueAnimal: formData.get('incidentRescueAnimal') ? Number(formData.get('incidentRescueAnimal')) : undefined
  }

  const parsed = incidentPeopleDisplacementTabSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.incident.update({
    where: { id: incidentId },
    data: {
      incidentPeoplePresent: parsed.data.incidentPeoplePresent ?? null,
      incidentRescueAnimal: parsed.data.incidentRescueAnimal ?? null
    }
  })

  revalidatePath(`/incidents/${incidentId}/people-displacement`)
  return { message: 'Saved.' }
}

export type AddDisplacementState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function addDisplacement(incidentId: string, _prevState: AddDisplacementState, formData: FormData): Promise<AddDisplacementState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to add a displaced person.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = { causes: formData.getAll('causes') }

  const parsed = incidentDisplacementSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.incidentDisplacement.create({
    data: { incidentId, causes: parsed.data.causes }
  })

  revalidatePath(`/incidents/${incidentId}/people-displacement`)
  return { message: 'Displaced person added.' }
}
