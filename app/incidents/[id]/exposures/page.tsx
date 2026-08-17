import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'

export default async function ExposuresListPage(props: PageProps<'/incidents/[id]/exposures'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <section className="space-y-3 text-sm">
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
  )
}
