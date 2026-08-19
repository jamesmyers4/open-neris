import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { UnitResponseForm } from './unit-response-form'

export default async function UnitResponseListPage(props: PageProps<'/incidents/[id]/unit-response'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  if (incident.unitResponses.length === 0) {
    return (
      <section className="space-y-3 text-sm">
        <h2 className="font-semibold">Responding units</h2>
        <UnitResponseForm incidentId={incident.id} />
      </section>
    )
  }

  return (
    <section className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Responding units</h2>
        <Link href={`/incidents/${incident.id}/unit-response/new`} className="text-xs text-slate-600 underline">
          Add unit
        </Link>
      </div>
      <ul className="list-disc pl-5">
        {incident.unitResponses.map(unit => (
          <li key={unit.id}>{[unit.unitIdLinked, unit.responseMode].filter(Boolean).join(' / ')}</li>
        ))}
      </ul>
    </section>
  )
}
