import { z } from 'zod'
import { TypeMedicalPatientCare, TypeMedicalPatientStatus, TypeMedicalTransport } from '../neris/generated/enums'

export const incidentMedicalSchema = z.object({
  patientCareReport: z.string().max(255).optional(),
  patientEvaluationCare: z.enum(TypeMedicalPatientCare),
  patientImprovedStatus: z.enum(TypeMedicalPatientStatus).optional(),
  medicalDisposition: z.enum(TypeMedicalTransport).optional()
})

export type IncidentMedicalInput = z.infer<typeof incidentMedicalSchema>
