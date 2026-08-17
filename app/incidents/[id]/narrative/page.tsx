import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'

export default async function NarrativeTabPage(props: PageProps<'/incidents/[id]/narrative'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <section className="space-y-1 text-sm">
      <h2 className="font-semibold">Narrative</h2>
      <p>Impediment: {incident.narrativeImpediment ?? '—'}</p>
      <p>Outcome: {incident.narrativeOutcome ?? '—'}</p>
    </section>
  )
}
