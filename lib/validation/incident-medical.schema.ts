import { z } from 'zod'
import { TypeMedicalPatientCare, TypeMedicalPatientStatus, TypeMedicalTransport } from '../neris/generated/enums'

export const incidentMedicalSchema = z.object({
  patientCareReport: z.string().max(255).optional(),
  patientEvaluationCare: z.enum(TypeMedicalPatientCare),
  patientImprovedStatus: z.enum(TypeMedicalPatientStatus).optional(),
  medicalDisposition: z.enum(TypeMedicalTransport).optional()
})

export const incidentMedicalRequiredSchema = z.object({
  hasPatientRecord: z.boolean().refine(v => v === true, { message: 'at least one patient record is required' })
})

export type IncidentMedicalInput = z.infer<typeof incidentMedicalSchema>
