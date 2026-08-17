import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { NarrativeForm } from './narrative-form'

export default async function NarrativeTabPage(props: PageProps<'/incidents/[id]/narrative'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <NarrativeForm
      incidentId={incident.id}
      initial={{
        narrativeImpediment: incident.narrativeImpediment,
        narrativeOutcome: incident.narrativeOutcome
      }}
    />
  )
}
