import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getDepartmentUnits } from '@/lib/organization/get-department-units'
import { UnitResponseForm } from '../unit-response-form'

export default async function NewUnitResponsePage(props: PageProps<'/incidents/[id]/unit-response/new'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params

  const incident = await prisma.incident.findFirst({ where: { id, departmentId: user.departmentId } })
  if (!incident) notFound()

  const units = await getDepartmentUnits(user.departmentId)

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Add unit</h1>
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
    </main>
  )
}
