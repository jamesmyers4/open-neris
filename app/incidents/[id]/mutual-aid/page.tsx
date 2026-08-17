import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { MutualAidForm } from './mutual-aid-form'

export default async function MutualAidTabPage(props: PageProps<'/incidents/[id]/mutual-aid'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <MutualAidForm
      incidentId={incident.id}
      initial={{
        aidDirection: incident.aidDirection,
        aidType: incident.aidType,
        aidDepartmentNames: incident.aidDepartmentNames,
        aidNonFdTypes: incident.aidNonFdTypes
      }}
    />
  )
}
