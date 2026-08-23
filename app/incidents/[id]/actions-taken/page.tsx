import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { actionTacticOptions } from '@/lib/neris/lookups'
import { NoActionForm, AddActionTakenForm } from './actions-taken-form'
import { removeActionTaken } from './actions'

export default async function ActionsTakenTabPage(props: PageProps<'/incidents/[id]/actions-taken'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  const hasActionsTaken = incident.actionsTaken.length > 0
  const hasNoActionReason = Boolean(incident.incidentNoActionReason)

  return (
    <div className="space-y-6">
      <NoActionForm
        incidentId={incident.id}
        initial={incident.incidentNoActionReason}
        blocked={hasActionsTaken}
        hasActionsTaken={hasActionsTaken}
      />

      <section className="space-y-3 border-t border-slate-200 pt-6 text-sm">
        <h2 className="font-semibold">Actions taken</h2>
        {incident.actionsTaken.length === 0 ? (
          <p>—</p>
        ) : (
          <ul className="space-y-1">
            {incident.actionsTaken.map(a => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-1">
                <span>{[a.value1, a.value2].filter(Boolean).join(' / ')}</span>
                <form action={removeActionTaken.bind(null, incident.id, a.id)}>
                  <button type="submit" className="text-xs text-red-700 underline">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddActionTakenForm incidentId={incident.id} actionTacticOptions={actionTacticOptions} blocked={hasNoActionReason} />
    </div>
  )
}
