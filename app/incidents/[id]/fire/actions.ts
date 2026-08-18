'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentFireSchema } from '@/lib/validation/incident-fire.schema'

export type FireFormState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function upsertFire(incidentId: string, _prevState: FireFormState, formData: FormData): Promise<FireFormState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to update this incident.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    fireSuppressionAppliance: formData.getAll('fireSuppressionAppliance'),
    fireWaterSupply: formData.get('fireWaterSupply') || undefined,
    fireInvestigationNeed: formData.get('fireInvestigationNeed') || undefined,
    fireInvestigationType: formData.getAll('fireInvestigationType'),
    structureArrivalConditions: formData.get('structureArrivalConditions') || undefined,
    structureProgressionConditions: formData.get('structureProgressionConditions')
      ? formData.get('structureProgressionConditions') === 'true'
      : undefined,
    structureDamage: formData.get('structureDamage') || undefined,
    structureFloorOfOrigin: formData.get('structureFloorOfOrigin') ? Number(formData.get('structureFloorOfOrigin')) : undefined,
    structureRoomOfOrigin: formData.get('structureRoomOfOrigin') || undefined,
    structureFireCause: formData.get('structureFireCause') || undefined,
    outsideFireCause: formData.get('outsideFireCause') || undefined,
    outsideFireAcresBurned: formData.get('outsideFireAcresBurned') ? Number(formData.get('outsideFireAcresBurned')) : undefined
  }

  const parsed = incidentFireSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = parsed.data

  await prisma.incidentFire.upsert({
    where: { incidentId },
    create: {
      incidentId,
      fireSuppressionAppliance: data.fireSuppressionAppliance,
      fireWaterSupply: data.fireWaterSupply ?? null,
      fireInvestigationNeed: data.fireInvestigationNeed,
      fireInvestigationType: data.fireInvestigationType,
      structureArrivalConditions: data.structureArrivalConditions ?? null,
      structureProgressionConditions: data.structureProgressionConditions,
      structureDamage: data.structureDamage ?? null,
      structureFloorOfOrigin: data.structureFloorOfOrigin,
      structureRoomOfOrigin: data.structureRoomOfOrigin ?? null,
      structureFireCause: data.structureFireCause ?? null,
      outsideFireCause: data.outsideFireCause ?? null,
      outsideFireAcresBurned: data.outsideFireAcresBurned
    },
    update: {
      fireSuppressionAppliance: data.fireSuppressionAppliance,
      fireWaterSupply: data.fireWaterSupply ?? null,
      fireInvestigationNeed: data.fireInvestigationNeed,
      fireInvestigationType: data.fireInvestigationType,
      structureArrivalConditions: data.structureArrivalConditions ?? null,
      structureProgressionConditions: data.structureProgressionConditions,
      structureDamage: data.structureDamage ?? null,
      structureFloorOfOrigin: data.structureFloorOfOrigin,
      structureRoomOfOrigin: data.structureRoomOfOrigin ?? null,
      structureFireCause: data.structureFireCause ?? null,
      outsideFireCause: data.outsideFireCause ?? null,
      outsideFireAcresBurned: data.outsideFireAcresBurned
    }
  })

  revalidatePath(`/incidents/${incidentId}/fire`)
  redirect(`/incidents/${incidentId}/fire?saved=1`)
}
