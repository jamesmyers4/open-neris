'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentHazsitSchema, incidentHazardChemicalSchema } from '@/lib/validation/incident-hazsit.schema'

export type HazsitFormState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function upsertHazsit(incidentId: string, _prevState: HazsitFormState, formData: FormData): Promise<HazsitFormState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to update this incident.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    hazsitDisposition: formData.get('hazsitDisposition') || undefined,
    hazsitEvacuated: formData.get('hazsitEvacuated') ? Number(formData.get('hazsitEvacuated')) : undefined
  }

  const parsed = incidentHazsitSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = parsed.data

  await prisma.incidentHazsit.upsert({
    where: { incidentId },
    create: { incidentId, hazsitDisposition: data.hazsitDisposition, hazsitEvacuated: data.hazsitEvacuated },
    update: { hazsitDisposition: data.hazsitDisposition, hazsitEvacuated: data.hazsitEvacuated }
  })

  redirect(`/incidents/${incidentId}/hazsit?saved=1`)
}

export type CreateChemicalState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function createHazardChemical(incidentId: string, _prevState: CreateChemicalState, formData: FormData): Promise<CreateChemicalState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to add a chemical.' }

  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, departmentId: user.departmentId },
    include: { hazsit: true }
  })
  if (!incident) return { message: 'Incident not found.' }
  if (!incident.hazsit) return { message: 'Save the hazardous situation details above before adding a chemical.' }

  const raw = {
    dotClass: formData.get('dotClass') || undefined,
    chemicalName: formData.get('chemicalName') || undefined,
    releaseOccurred: formData.get('releaseOccurred') === 'true',
    amountEst: formData.get('amountEst') ? Number(formData.get('amountEst')) : undefined,
    amountEstUnits: formData.get('amountEstUnits') || undefined,
    physicalState: formData.get('physicalState') || undefined,
    releaseInto: formData.get('releaseInto') || undefined,
    releaseCause: formData.get('releaseCause') || undefined
  }

  const parsed = incidentHazardChemicalSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = parsed.data

  await prisma.incidentHazardChemical.create({
    data: {
      hazsitId: incident.hazsit.id,
      dotClass: data.dotClass,
      chemicalName: data.chemicalName,
      releaseOccurred: data.releaseOccurred,
      amountEst: data.amountEst,
      amountEstUnits: data.amountEstUnits,
      physicalState: data.physicalState,
      releaseInto: data.releaseInto,
      releaseCause: data.releaseCause
    }
  })

  redirect(`/incidents/${incidentId}/hazsit`)
}
