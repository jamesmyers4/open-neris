import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { FireForm } from './fire-form'

export default async function FireTabPage(props: PageProps<'/incidents/[id]/fire'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const searchParams = await props.searchParams
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <FireForm
      incidentId={incident.id}
      justSaved={searchParams.saved === '1'}
      initial={{
        fireSuppressionAppliance: incident.fire?.fireSuppressionAppliance ?? [],
        fireWaterSupply: incident.fire?.fireWaterSupply ?? '',
        fireInvestigationNeed: incident.fire?.fireInvestigationNeed ?? '',
        fireInvestigationType: incident.fire?.fireInvestigationType ?? [],
        structureArrivalConditions: incident.fire?.structureArrivalConditions ?? '',
        structureProgressionConditions: incident.fire?.structureProgressionConditions ?? null,
        structureDamage: incident.fire?.structureDamage ?? '',
        structureFloorOfOrigin: incident.fire?.structureFloorOfOrigin ?? '',
        structureRoomOfOrigin: incident.fire?.structureRoomOfOrigin ?? '',
        structureFireCause: incident.fire?.structureFireCause ?? '',
        outsideFireCause: incident.fire?.outsideFireCause ?? '',
        outsideFireAcresBurned: incident.fire?.outsideFireAcresBurned ?? ''
      }}
    />
  )
}
