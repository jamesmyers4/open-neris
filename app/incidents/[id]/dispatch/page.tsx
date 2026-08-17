import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'

export default async function DispatchTabPage(props: PageProps<'/incidents/[id]/dispatch'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <section className="space-y-1 text-sm">
      <h2 className="font-semibold">Dispatch</h2>
      <p>Call received at dispatch center: {incident.dispatchTimeCallArrival?.toLocaleString() ?? '—'}</p>
      <p>Call answered: {incident.dispatchTimeCallAnswer?.toLocaleString() ?? '—'}</p>
      <p>Call created: {incident.dispatchTimeCallCreate?.toLocaleString() ?? '—'}</p>
      <p>Incident clear: {incident.timeIncidentClear?.toLocaleString() ?? '—'}</p>
      <p>
        Automatic alarm:{' '}
        {incident.dispatchAutomaticAlarm === null ? 'Unknown' : incident.dispatchAutomaticAlarm ? 'Yes' : 'No'}
      </p>
      <p>Determinate code: {incident.dispatchDeterminateCode ?? '—'}</p>
      <p>Incident code: {incident.dispatchIncidentCode ?? '—'}</p>
      <p>Final disposition: {incident.dispatchFinalDisposition ?? '—'}</p>
      {incident.dispatchComments.length > 0 && (
        <div>
          <p className="font-medium">Comments</p>
          <ul className="list-disc pl-5">
            {incident.dispatchComments.map(c => (
              <li key={c.id}>
                {c.timestamp.toLocaleString()}: {c.comment}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
