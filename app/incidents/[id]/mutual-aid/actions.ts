'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentMutualAidTabSchema } from '@/lib/validation/incident-mutual-aid.schema'

export type MutualAidFormState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function updateMutualAid(incidentId: string, _prevState: MutualAidFormState, formData: FormData): Promise<MutualAidFormState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to update this incident.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const departmentNamesRaw = String(formData.get('aidDepartmentNames') ?? '')

  const raw = {
    aidDirection: formData.get('aidDirection') || undefined,
    aidType: formData.get('aidType') || undefined,
    aidDepartmentNames: departmentNamesRaw
      .split('\n')
      .map(name => name.trim())
      .filter(Boolean),
    aidNonFdTypes: formData.getAll('aidNonFdTypes')
  }

  const parsed = incidentMutualAidTabSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.incident.update({
    where: { id: incidentId },
    data: {
      aidDirection: parsed.data.aidDirection ?? null,
      aidType: parsed.data.aidType ?? null,
      aidDepartmentNames: parsed.data.aidDepartmentNames,
      aidNonFdTypes: parsed.data.aidNonFdTypes
    }
  })

  revalidatePath(`/incidents/${incidentId}/mutual-aid`)
  return { message: 'Saved.' }
}
