import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { HazsitForm } from './hazsit-form'
import { ChemicalForm } from './chemical-form'

export default async function HazsitPage(props: PageProps<'/incidents/[id]/hazsit'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const searchParams = await props.searchParams
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  const chemicals = incident.hazsit?.chemicals ?? []

  return (
    <div className="space-y-8">
      <section className="space-y-3 text-sm">
        <h2 className="font-semibold">Hazardous situation</h2>
        <HazsitForm
          incidentId={incident.id}
          justSaved={searchParams.saved === '1'}
          initial={{
            hazsitDisposition: incident.hazsit?.hazsitDisposition ?? '',
            hazsitEvacuated: incident.hazsit?.hazsitEvacuated ?? ''
          }}
        />
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-6 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Chemicals</h2>
          {chemicals.length > 0 && (
            <Link href={`/incidents/${incident.id}/hazsit/new`} className="text-xs text-slate-600 underline">
              Add chemical
            </Link>
          )}
        </div>

        {!incident.hazsit ? (
          <p className="text-slate-500">Save the hazardous situation details above before adding a chemical.</p>
        ) : chemicals.length === 0 ? (
          <ChemicalForm incidentId={incident.id} />
        ) : (
          <ul className="list-disc pl-5">
            {chemicals.map(chemical => (
              <li key={chemical.id}>
                {[chemical.chemicalName, chemical.dotClass, chemical.releaseOccurred ? 'released' : null].filter(Boolean).join(' / ')}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
