import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { DispatchForm } from './dispatch-form'

export default async function DispatchTabPage(props: PageProps<'/incidents/[id]/dispatch'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <div className="space-y-6">
      <DispatchForm
        incidentId={incident.id}
        initial={{
          dispatchTimeCallArrival: incident.dispatchTimeCallArrival?.toISOString() ?? null,
          dispatchTimeCallAnswer: incident.dispatchTimeCallAnswer?.toISOString() ?? null,
          dispatchTimeCallCreate: incident.dispatchTimeCallCreate?.toISOString() ?? null,
          timeIncidentClear: incident.timeIncidentClear?.toISOString() ?? null,
          dispatchAutomaticAlarm: incident.dispatchAutomaticAlarm,
          dispatchDeterminateCode: incident.dispatchDeterminateCode,
          dispatchIncidentCode: incident.dispatchIncidentCode,
          dispatchFinalDisposition: incident.dispatchFinalDisposition
        }}
      />

      {incident.dispatchComments.length > 0 && (
        <section className="space-y-1 border-t border-slate-200 pt-6 text-sm">
          <h2 className="font-semibold">Comments</h2>
          <ul className="list-disc pl-5">
            {[...incident.dispatchComments]
              .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
              .map(c => (
                <li key={c.id}>
                  {c.timestamp.toLocaleString()}: {c.comment}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  )
}
