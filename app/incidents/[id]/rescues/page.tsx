import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { RescueFfForm } from './rescue-ff-form'
import { RescueNonFfForm } from './rescue-nonff-form'

export default async function RescuesPage(props: PageProps<'/incidents/[id]/rescues'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <div className="space-y-8">
      <section className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Firefighter casualties</h2>
          {incident.rescuesFf.length > 0 && (
            <Link href={`/incidents/${incident.id}/rescues/new-ff`} className="text-xs text-slate-600 underline">
              Add firefighter casualty
            </Link>
          )}
        </div>
        {incident.rescuesFf.length === 0 ? (
          <RescueFfForm incidentId={incident.id} />
        ) : (
          <ul className="list-disc pl-5">
            {incident.rescuesFf.map(rescue => (
              <li key={rescue.id}>{[rescue.rescueType, rescue.casualtyType, rescue.gender].filter(Boolean).join(' / ')}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-6 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Non-firefighter casualties</h2>
          {incident.rescuesNonFf.length > 0 && (
            <Link href={`/incidents/${incident.id}/rescues/new-nonff`} className="text-xs text-slate-600 underline">
              Add non-firefighter casualty
            </Link>
          )}
        </div>
        {incident.rescuesNonFf.length === 0 ? (
          <RescueNonFfForm incidentId={incident.id} />
        ) : (
          <ul className="list-disc pl-5">
            {incident.rescuesNonFf.map(rescue => (
              <li key={rescue.id}>{[rescue.rescueType, rescue.casualtyType, rescue.gender].filter(Boolean).join(' / ')}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
