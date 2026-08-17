import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'

export default async function ActionsTakenTabPage(props: PageProps<'/incidents/[id]/actions-taken'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <section className="space-y-1 text-sm">
      <h2 className="font-semibold">Actions taken / no action</h2>
      {incident.incidentNoActionReason ? (
        <p>No-action reason: {incident.incidentNoActionReason}</p>
      ) : incident.actionsTaken.length > 0 ? (
        <ul className="list-disc pl-5">
          {incident.actionsTaken.map(a => (
            <li key={a.id}>{[a.value1, a.value2].filter(Boolean).join(' / ')}</li>
          ))}
        </ul>
      ) : (
        <p>—</p>
      )}
    </section>
  )
}
