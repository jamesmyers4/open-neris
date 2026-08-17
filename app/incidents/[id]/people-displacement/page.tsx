import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { PeopleForm, DisplacementForm } from './people-displacement-form'

export default async function PeopleDisplacementTabPage(props: PageProps<'/incidents/[id]/people-displacement'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <div className="space-y-6">
      <PeopleForm
        incidentId={incident.id}
        initial={{
          incidentPeoplePresent: incident.incidentPeoplePresent,
          incidentRescueAnimal: incident.incidentRescueAnimal
        }}
      />

      <section className="space-y-3 border-t border-slate-200 pt-6 text-sm">
        <h2 className="font-semibold">Displaced persons ({incident.displacements.length})</h2>
        {incident.displacements.length === 0 ? (
          <p>—</p>
        ) : (
          <ul className="list-disc pl-5">
            {incident.displacements.map(d => (
              <li key={d.id}>{d.causes.join(', ') || '—'}</li>
            ))}
          </ul>
        )}
      </section>

      <DisplacementForm incidentId={incident.id} />
    </div>
  )
}
