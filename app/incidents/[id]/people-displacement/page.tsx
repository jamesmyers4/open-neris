import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'

export default async function PeopleDisplacementTabPage(props: PageProps<'/incidents/[id]/people-displacement'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <section className="space-y-1 text-sm">
      <h2 className="font-semibold">People & displacement</h2>
      <p>
        People present: {incident.incidentPeoplePresent === null ? 'Unknown' : incident.incidentPeoplePresent ? 'Yes' : 'No'}
      </p>
      <p>Animals rescued: {incident.incidentRescueAnimal ?? '—'}</p>
      {incident.displacements.length === 0 ? (
        <p>Displaced persons: —</p>
      ) : (
        <div>
          <p className="font-medium">Displaced persons ({incident.displacements.length})</p>
          <ul className="list-disc pl-5">
            {incident.displacements.map(d => (
              <li key={d.id}>{d.causes.join(', ') || '—'}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
