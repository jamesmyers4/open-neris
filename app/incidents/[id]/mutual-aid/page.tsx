import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'

export default async function MutualAidTabPage(props: PageProps<'/incidents/[id]/mutual-aid'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <section className="space-y-1 text-sm">
      <h2 className="font-semibold">Mutual aid</h2>
      <p>Direction: {incident.aidDirection ?? '—'}</p>
      <p>Type: {incident.aidType ?? '—'}</p>
      <p>Departments: {incident.aidDepartmentNames.length > 0 ? incident.aidDepartmentNames.join(', ') : '—'}</p>
      <p>Non-FD types: {incident.aidNonFdTypes.length > 0 ? incident.aidNonFdTypes.join(', ') : '—'}</p>
    </section>
  )
}
