import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { getSubmitCompleteness } from '@/lib/incidents/get-submit-completeness'
import { submitIncident } from './actions'

const MISSING_FIELD_LABELS: Record<string, string> = {
  dispatchTimeCallArrival: 'Dispatch: call received at dispatch center',
  dispatchTimeCallAnswer: 'Dispatch: call answered',
  dispatchTimeCallCreate: 'Dispatch: call created',
  streetAddressComplete: 'Location: street address',
  state: 'Location: state',
  narrativeImpediment: 'Narrative: impediment',
  narrativeOutcome: 'Narrative: outcome',
  incidentActionsTaken: 'Actions Taken: an action taken or a no-action reason'
}

export default async function IncidentOverviewPage(props: PageProps<'/incidents/[id]'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  const completeness = getSubmitCompleteness(incident)

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

      <section className="space-y-3 border-t border-slate-200 pt-6 text-sm">
        <h2 className="font-semibold">Submit</h2>
        {incident.reviewStatus !== 'OPEN' ? (
          <p>This incident has already been submitted (status: {incident.reviewStatus}).</p>
        ) : completeness.complete ? (
          <form action={submitIncident.bind(null, incident.id)}>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
              Submit for review
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <p>Complete these before this incident can be submitted:</p>
            <ul className="list-disc rounded bg-amber-50 p-3 pl-6 text-amber-900">
              {completeness.missing.map((m, i) => (
                <li key={i}>{MISSING_FIELD_LABELS[m.path] ?? `${m.module}: ${m.path}`}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
