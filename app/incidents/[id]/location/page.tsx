import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'

export default async function LocationTabPage(props: PageProps<'/incidents/[id]/location'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <section className="space-y-1 text-sm">
      <h2 className="font-semibold">Location</h2>
      {incident.location ? (
        <>
          <p>{incident.location.streetAddressComplete}</p>
          <p>
            {[incident.location.city, incident.location.county, incident.location.state, incident.location.postalCode]
              .filter(Boolean)
              .join(', ')}
          </p>
          <p>Place: {incident.location.place ?? '—'}</p>
        </>
      ) : (
        <p>—</p>
      )}
    </section>
  )
}
