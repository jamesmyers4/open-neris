import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'

export default async function IncidentOverviewPage(props: PageProps<'/incidents/[id]'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <div className="space-y-6">
      <section className="space-y-1 text-sm">
        <h2 className="font-semibold">Incident</h2>
        <p>Date: {incident.incidentDate.toLocaleDateString()}</p>
        <p>Alarm time: {incident.alarmTime.toLocaleString()}</p>
        <p>Created by: {incident.createdBy.name}</p>
      </section>

      <section className="space-y-1 text-sm">
        <h2 className="font-semibold">Incident types</h2>
        {incident.types.length === 0 ? (
          <p>—</p>
        ) : (
          <ul className="list-disc pl-5">
            {incident.types.map(t => (
              <li key={t.id}>
                {[t.value1, t.value2, t.value3].filter(Boolean).join(' / ')}
                {t.isPrimary && <span className="ml-2 text-xs text-slate-500">(primary)</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-1 text-sm">
        <h2 className="font-semibold">Special modifiers</h2>
        <p>{incident.specialModifiers.length > 0 ? incident.specialModifiers.join(', ') : '—'}</p>
      </section>
    </div>
  )
}
