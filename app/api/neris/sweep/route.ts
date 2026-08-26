import { prisma } from '@/lib/prisma'
import { getStuckApprovedIncidentIds } from '@/lib/neris/get-stuck-approved-incidents'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { attemptNerisSubmission } from '@/lib/neris/submit-incident-to-neris'

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stuck = await getStuckApprovedIncidentIds(prisma)
  const results: { incidentId: string; outcome: string }[] = []

  for (const { id, departmentId } of stuck) {
    const [department, incident] = await Promise.all([
      prisma.department.findUniqueOrThrow({ where: { id: departmentId } }),
      getIncidentDetail(id, departmentId)
    ])
    if (!incident) continue
    const outcome = await attemptNerisSubmission(prisma, incident, department, 'SCHEDULED_SWEEP', null)
    results.push({ incidentId: id, outcome })
  }

  return Response.json({ swept: results.length, results })
}
