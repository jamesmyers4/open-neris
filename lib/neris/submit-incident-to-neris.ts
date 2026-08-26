import type { PrismaClient, Department, SubmissionTrigger } from '@prisma/client'
import type { IncidentDetail } from '@/lib/incidents/get-incident-detail'
import { buildIncidentPayload } from './build-incident-payload'
import { submitIncident as callNerisSubmit } from './api-client'

type SubmissionOutcome = 'SENT' | 'ERROR'

async function recordSubmission(
  prisma: PrismaClient,
  incident: IncidentDetail,
  trigger: SubmissionTrigger,
  actorId: string | null,
  requestPayload: object,
  responseStatus: number | null,
  responseBody: unknown,
  succeeded: boolean,
  nerisIncidentId: string | null
): Promise<SubmissionOutcome> {
  const outcome: SubmissionOutcome = succeeded ? 'SENT' : 'ERROR'
  const fromStatus = incident.reviewStatus

  await prisma.$transaction(async tx => {
    await tx.nerisSubmission.create({
      data: { incidentId: incident.id, trigger, requestPayload, responseStatus: responseStatus ?? undefined, responseBody: responseBody ?? undefined, succeeded }
    })

    const { count } = await tx.incident.updateMany({
      where: { id: incident.id, reviewStatus: fromStatus },
      data: { reviewStatus: outcome, nerisIncidentId: nerisIncidentId ?? undefined }
    })

    if (count > 0 && actorId) {
      await tx.reviewEvent.create({
        data: { incidentId: incident.id, actorId, fromStatus, toStatus: outcome }
      })
    }
  })

  return outcome
}

export async function attemptNerisSubmission(
  prisma: PrismaClient,
  incident: IncidentDetail,
  department: Department,
  trigger: SubmissionTrigger,
  actorId: string | null
): Promise<SubmissionOutcome> {
  const built = buildIncidentPayload(incident, department.nerisFdId)

  if (!built.ok) {
    return recordSubmission(prisma, incident, trigger, actorId, {}, null, { error: 'Could not build a NERIS submission payload', details: built.errors }, false, null)
  }

  if (!department.nerisVendorClientId || !department.nerisVendorSecretCipher) {
    return recordSubmission(prisma, incident, trigger, actorId, built.payload, null, { error: 'NERIS credentials are not configured for this department' }, false, null)
  }

  try {
    const result = await callNerisSubmit(department.nerisEnvironment, department.nerisVendorClientId, department.nerisVendorSecretCipher, department.nerisFdId as string, built.payload)
    const succeeded = result.status === 201
    const nerisIncidentId = succeeded && result.body && typeof (result.body as { neris_id?: unknown }).neris_id === 'string'
      ? (result.body as { neris_id: string }).neris_id
      : null

    return recordSubmission(prisma, incident, trigger, actorId, built.payload, result.status, result.body, succeeded, nerisIncidentId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error contacting NERIS'
    return recordSubmission(prisma, incident, trigger, actorId, built.payload, null, { error: message }, false, null)
  }
}
