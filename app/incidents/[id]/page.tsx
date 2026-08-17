import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'

export default async function IncidentDetailPage(props: PageProps<'/incidents/[id]'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params

  const incident = await prisma.incident.findFirst({
    where: { id, departmentId: user.departmentId },
    include: {
      types: { orderBy: { sortOrder: 'asc' } },
      location: true,
      exposures: true,
      createdBy: true
    }
  })

  if (!incident) notFound()

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/incidents" className="text-sm text-slate-600 underline">
        ← Back to incidents
      </Link>
      <div className="mt-4 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{incident.internalId}</h1>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">{incident.reviewStatus}</span>
      </div>

      <section className="mb-6 space-y-1 text-sm">
        <h2 className="font-semibold">Incident</h2>
        <p>Date: {incident.incidentDate.toLocaleDateString()}</p>
        <p>Alarm time: {incident.alarmTime.toLocaleString()}</p>
        <p>Created by: {incident.createdBy.name}</p>
      </section>

      <section className="mb-6 space-y-1 text-sm">
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

      <section className="mb-6 space-y-1 text-sm">
        <h2 className="font-semibold">Dispatch times</h2>
        <p>Call created: {incident.dispatchTimeCallCreate?.toLocaleString() ?? '—'}</p>
        <p>Call answered: {incident.dispatchTimeCallAnswer?.toLocaleString() ?? '—'}</p>
        <p>Call arrival: {incident.dispatchTimeCallArrival?.toLocaleString() ?? '—'}</p>
      </section>

      {incident.location && (
        <section className="mb-6 space-y-1 text-sm">
          <h2 className="font-semibold">Location</h2>
          <p>{incident.location.streetAddressComplete}</p>
          <p>
            {[incident.location.city, incident.location.county, incident.location.state, incident.location.postalCode].filter(Boolean).join(', ')}
          </p>
          <p>Place: {incident.location.place ?? '—'}</p>
        </section>
      )}

      <section className="mb-6 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Exposures</h2>
          <Link href={`/incidents/${incident.id}/exposures/new`} className="text-xs text-slate-600 underline">
            Add exposure
          </Link>
        </div>
        {incident.exposures.length === 0 ? (
          <p>—</p>
        ) : (
          <ul className="list-disc pl-5">
            {incident.exposures.map(exposure => (
              <li key={exposure.id}>
                {[exposure.exposureType, exposure.exposureItem, exposure.exposureDamage].filter(Boolean).join(' / ')}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 space-y-1 text-sm">
        <h2 className="font-semibold">People and displacement</h2>
        <p>
          People present: {incident.incidentPeoplePresent === null || incident.incidentPeoplePresent === undefined ? 'Unknown' : incident.incidentPeoplePresent ? 'Yes' : 'No'}
        </p>
        <p>Animals rescued: {incident.incidentRescueAnimal ?? '—'}</p>
        <p>No-action reason: {incident.incidentNoActionReason ?? '—'}</p>
      </section>

      <section className="mb-6 space-y-1 text-sm">
        <h2 className="font-semibold">Mutual aid</h2>
        <p>Direction: {incident.aidDirection ?? '—'}</p>
        <p>Type: {incident.aidType ?? '—'}</p>
        <p>Departments: {incident.aidDepartmentNames.length > 0 ? incident.aidDepartmentNames.join(', ') : '—'}</p>
        <p>Non-FD types: {incident.aidNonFdTypes.length > 0 ? incident.aidNonFdTypes.join(', ') : '—'}</p>
      </section>

      <section className="space-y-1 text-sm">
        <h2 className="font-semibold">Narrative</h2>
        <p>Impediment: {incident.narrativeImpediment ?? '—'}</p>
        <p>Outcome: {incident.narrativeOutcome ?? '—'}</p>
      </section>
    </main>
  )
}
