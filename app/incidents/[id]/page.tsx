import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { getSubmitCompleteness } from '@/lib/incidents/get-submit-completeness'
import { canReview, canApprove } from '@/lib/incidents/review-permissions'
import { submitIncident, markReviewed, approveIncident } from './actions'
import { KickbackForm } from './kickback-form'

const MISSING_FIELD_LABELS: Record<string, string> = {
  timeIncidentClear: 'Dispatch: incident clear',
  streetAddressComplete: 'Location: street address',
  state: 'Location: state',
  narrativeImpediment: 'Narrative: impediment',
  narrativeOutcome: 'Narrative: outcome',
  incidentActionsTaken: 'Actions Taken: an action taken or a no-action reason',
  fireInvestigationNeed: 'Fire: investigation need',
  hasPatientRecord: 'Medical: at least one patient record',
  hazsitDisposition: 'HazSit: disposition',
  hazsitEvacuated: 'HazSit: people/businesses evacuated',
  unitResponses: 'Responding Units: at least one responding unit'
}

const MODULE_LABELS: Record<string, string> = {
  core: 'Core',
  fire: 'Fire',
  medical: 'Medical',
  hazsit: 'HazSit',
  exposures: 'Exposures',
  unitResponse: 'Responding Units',
  rescuesFf: 'Firefighter Rescues',
  rescuesNonFf: 'Civilian Rescues'
}

function formatMissingField(m: { module: string; path: string }): string {
  const known = MISSING_FIELD_LABELS[m.path]
  if (known) return known

  const moduleLabel = MODULE_LABELS[m.module] ?? m.module
  const rowMatch = m.path.match(/^\w+\.(\d+)\.(.+)$/)
  if (rowMatch) {
    const [, index, field] = rowMatch
    return `${moduleLabel}: record ${Number(index) + 1} — ${field}`
  }

  return `${moduleLabel}: ${m.path}`
}

export default async function IncidentOverviewPage(props: PageProps<'/incidents/[id]'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  const completeness = getSubmitCompleteness(incident)
  const lastEvent = incident.reviewEvents[0]
  const lastKickback = incident.reviewStatus === 'OPEN' && lastEvent?.toStatus === 'OPEN' && lastEvent.note ? lastEvent : null

  return (
    <div className="space-y-6">
      {lastKickback && (
        <section className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Kicked back by {lastKickback.actor.name}</p>
          <p className="mt-1 whitespace-pre-wrap">{lastKickback.note}</p>
        </section>
      )}

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
        {incident.reviewStatus === 'OPEN' && completeness.complete && (
          <form action={submitIncident.bind(null, incident.id)}>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
              Submit for review
            </button>
          </form>
        )}
        {incident.reviewStatus === 'OPEN' && !completeness.complete && (
          <div className="space-y-2">
            <p>Complete these before this incident can be submitted:</p>
            <ul className="list-disc rounded bg-amber-50 p-3 pl-6 text-amber-900">
              {completeness.missing.map((m, i) => (
                <li key={i}>{formatMissingField(m)}</li>
              ))}
            </ul>
          </div>
        )}
        {incident.reviewStatus === 'SUBMITTED' && (
          <div className="space-y-2">
            <p>status: {incident.reviewStatus}</p>
            {canReview(user.role) && (
              <form action={markReviewed.bind(null, incident.id)}>
                <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
                  Mark Reviewed
                </button>
              </form>
            )}
          </div>
        )}
        {incident.reviewStatus === 'REVIEWED' && (
          <div className="space-y-2">
            <p>status: {incident.reviewStatus}</p>
            {canApprove(user.role) && (
              <form action={approveIncident.bind(null, incident.id)}>
                <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
                  Approve
                </button>
              </form>
            )}
            {canReview(user.role) && <KickbackForm incidentId={incident.id} />}
          </div>
        )}
        {incident.reviewStatus === 'APPROVED' && (
          <div className="space-y-2">
            <p>status: {incident.reviewStatus}</p>
            {canReview(user.role) && <KickbackForm incidentId={incident.id} />}
          </div>
        )}
        {(incident.reviewStatus === 'SENT' ||
          incident.reviewStatus === 'CONFIRMED' ||
          incident.reviewStatus === 'ERROR') && <p>status: {incident.reviewStatus}</p>}
      </section>
    </div>
  )
}
