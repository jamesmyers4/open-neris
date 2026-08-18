'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentMedicalSchema } from '@/lib/validation/incident-medical.schema'

export type CreateMedicalState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function createMedical(incidentId: string, _prevState: CreateMedicalState, formData: FormData): Promise<CreateMedicalState> {
  const user = await getCurrentAppUser()
  if (!user) return { message: 'You must be signed in to add a patient.' }

  const incident = await prisma.incident.findFirst({ where: { id: incidentId, departmentId: user.departmentId } })
  if (!incident) return { message: 'Incident not found.' }

  const raw = {
    patientCareReport: formData.get('patientCareReport') || undefined,
    patientEvaluationCare: formData.get('patientEvaluationCare') || undefined,
    patientImprovedStatus: formData.get('patientImprovedStatus') || undefined,
    medicalDisposition: formData.get('medicalDisposition') || undefined
  }

  const parsed = incidentMedicalSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const data = parsed.data

  await prisma.incidentMedical.create({
    data: {
      incidentId,
      patientCareReport: data.patientCareReport,
      patientEvaluationCare: data.patientEvaluationCare,
      patientImprovedStatus: data.patientImprovedStatus,
      medicalDisposition: data.medicalDisposition
    }
  })

  redirect(`/incidents/${incidentId}/medical`)
}
