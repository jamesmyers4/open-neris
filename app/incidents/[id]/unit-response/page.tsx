import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { getDepartmentUnits } from '@/lib/organization/get-department-units'
import { UnitResponseForm } from './unit-response-form'

export default async function UnitResponseListPage(props: PageProps<'/incidents/[id]/unit-response'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  if (incident.unitResponses.length === 0) {
    const units = await getDepartmentUnits(user.departmentId)
    return (
      <section className="space-y-3 text-sm">
        <h2 className="font-semibold">Responding units</h2>
        <p className="text-xs text-red-600">* At least one responding unit is required to submit this incident.</p>
        <UnitResponseForm
          incidentId={incident.id}
          units={units.map(u => ({ id: u.id, designation: u.designation, stationLabel: u.station.label }))}
          carryOver={{
            alarmTime: incident.alarmTime.toISOString(),
            dispatchTimeCallArrival: incident.dispatchTimeCallArrival?.toISOString() ?? null,
            dispatchTimeCallAnswer: incident.dispatchTimeCallAnswer?.toISOString() ?? null,
            dispatchTimeCallCreate: incident.dispatchTimeCallCreate?.toISOString() ?? null,
            timeIncidentClear: incident.timeIncidentClear?.toISOString() ?? null
          }}
        />
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
        {incident.unitResponses.map(unitResponse => (
          <li key={unitResponse.id}>{[unitResponse.unit.designation, unitResponse.responseMode].filter(Boolean).join(' / ')}</li>
        ))}
      </ul>
    </section>
  )
}
