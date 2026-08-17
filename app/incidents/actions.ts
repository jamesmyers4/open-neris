'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentCoreSchema } from '@/lib/validation/incident-core.schema'

export type CreateIncidentState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

function splitList(value: FormDataEntryValue | null): string[] {
  if (!value) return []
  return String(value).split(',').map(s => s.trim()).filter(Boolean)
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
    internalId: formData.get('internalId'),
    incidentDate: formData.get('incidentDate'),
    alarmTime: formData.get('alarmTime'),
    types,
    location: {
      streetAddressComplete: formData.get('streetAddressComplete'),
      city: formData.get('city') || undefined,
      county: formData.get('county') || undefined,
      state: formData.get('state'),
      postalCode: formData.get('postalCode') || undefined,
      country: formData.get('country') || 'US',
      place: formData.get('place') || undefined
    },
    incidentPeoplePresent: formData.get('incidentPeoplePresent') ? formData.get('incidentPeoplePresent') === 'true' : undefined,
    incidentRescueAnimal: formData.get('incidentRescueAnimal') ? Number(formData.get('incidentRescueAnimal')) : undefined,
    incidentNoActionReason: formData.get('incidentNoActionReason') || undefined,
    aidDirection: formData.get('aidDirection') || undefined,
    aidType: formData.get('aidType') || undefined,
    aidDepartmentNames: splitList(formData.get('aidDepartmentNames')),
    aidNonFdTypes: splitList(formData.get('aidNonFdTypes')),
    narrativeImpediment: formData.get('narrativeImpediment') || undefined,
    narrativeOutcome: formData.get('narrativeOutcome') || undefined,
    dispatchTimeCallCreate: formData.get('dispatchTimeCallCreate') || undefined,
    dispatchTimeCallAnswer: formData.get('dispatchTimeCallAnswer') || undefined,
    dispatchTimeCallArrival: formData.get('dispatchTimeCallArrival') || undefined
  }

  const parsed = incidentCoreSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = parsed.data
  let incidentId: string

  try {
    const incident = await prisma.incident.create({
      data: {
        departmentId: user.departmentId,
        createdById: user.id,
        internalId: data.internalId,
        incidentDate: data.incidentDate,
        alarmTime: data.alarmTime,
        incidentPeoplePresent: data.incidentPeoplePresent,
        incidentRescueAnimal: data.incidentRescueAnimal,
        incidentNoActionReason: data.incidentNoActionReason,
        aidDirection: data.aidDirection,
        aidType: data.aidType,
        aidDepartmentNames: data.aidDepartmentNames,
        aidNonFdTypes: data.aidNonFdTypes,
        narrativeImpediment: data.narrativeImpediment,
        narrativeOutcome: data.narrativeOutcome,
        dispatchTimeCallCreate: data.dispatchTimeCallCreate,
        dispatchTimeCallAnswer: data.dispatchTimeCallAnswer,
        dispatchTimeCallArrival: data.dispatchTimeCallArrival,
        types: {
          create: data.types.map((t, i) => ({
            value1: t.value1,
            value2: t.value2,
            value3: t.value3,
            isPrimary: t.isPrimary,
            sortOrder: i
          }))
        },
        location: {
          create: {
            streetAddressComplete: data.location.streetAddressComplete,
            city: data.location.city,
            county: data.location.county,
            state: data.location.state,
            postalCode: data.location.postalCode,
            country: data.location.country,
            place: data.location.place
          }
        }
      }
    })
    incidentId = incident.id
  } catch (err) {
    if (err instanceof Object && 'code' in err && err.code === 'P2002') {
      return { message: `Internal ID "${data.internalId}" is already used by another incident in your department.` }
    }
    throw err
  }

  redirect(`/incidents/${incidentId}`)
}
