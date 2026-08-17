'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentNarrativeTabSchema } from '@/lib/validation/incident-narrative.schema'

export type NarrativeFormState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function updateNarrative(incidentId: string, _prevState: NarrativeFormState, formData: FormData): Promise<NarrativeFormState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to update this incident.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    narrativeImpediment: formData.get('narrativeImpediment') || undefined,
    narrativeOutcome: formData.get('narrativeOutcome') || undefined
  }

  const parsed = incidentNarrativeTabSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.incident.update({
    where: { id: incidentId },
    data: {
      narrativeImpediment: parsed.data.narrativeImpediment ?? null,
      narrativeOutcome: parsed.data.narrativeOutcome ?? null
    }
  })

  revalidatePath(`/incidents/${incidentId}/narrative`)
  return { message: 'Saved.' }
}
