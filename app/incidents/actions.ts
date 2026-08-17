'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { createIncidentSchema } from '@/lib/validation/incident-create.schema'
import { generateInternalId } from '@/lib/incidents/generate-internal-id'

export type CreateIncidentState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function createIncident(_prevState: CreateIncidentState, formData: FormData): Promise<CreateIncidentState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to create an incident.' }

  let types: unknown = []
  try {
    types = JSON.parse(String(formData.get('typesJson') ?? '[]'))
  } catch {
    return { message: 'Invalid incident type selection.' }
  }

  const raw = {
    types,
    specialModifiers: formData.getAll('specialModifiers'),
    alarmTime: formData.get('alarmTime')
  }

  const parsed = createIncidentSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = parsed.data

  const department = await prisma.department.findUniqueOrThrow({ where: { id: user.departmentId } })

  const incidentId = await prisma.$transaction(async tx => {
    const internalId = await generateInternalId(tx, user.departmentId, department.internalIdMode, department.internalIdTemplate, data.alarmTime)

    const incident = await tx.incident.create({
      data: {
        departmentId: user.departmentId,
        createdById: user.id,
        internalId,
        incidentDate: data.alarmTime,
        alarmTime: data.alarmTime,
        specialModifiers: data.specialModifiers,
        types: {
          create: data.types.map((t, i) => ({
            value1: t.value1,
            value2: t.value2,
            value3: t.value3,
            isPrimary: t.isPrimary,
            sortOrder: i
          }))
        }
      }
    })

    return incident.id
  })

  redirect(`/incidents/${incidentId}`)
}
