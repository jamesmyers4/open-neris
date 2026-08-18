import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { MedicalForm } from './medical-form'

export default async function MedicalListPage(props: PageProps<'/incidents/[id]/medical'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  if (incident.medicals.length === 0) {
    return (
      <section className="space-y-3 text-sm">
        <h2 className="font-semibold">Medical</h2>
        <MedicalForm incidentId={incident.id} />
      </section>
    )
  }

  return (
    <section className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Medical</h2>
        <Link href={`/incidents/${incident.id}/medical/new`} className="text-xs text-slate-600 underline">
          Add patient
        </Link>
      </div>
      <ul className="list-disc pl-5">
        {incident.medicals.map(medical => (
          <li key={medical.id}>
            {[medical.patientEvaluationCare, medical.patientImprovedStatus, medical.medicalDisposition].filter(Boolean).join(' / ')}
          </li>
        ))}
      </ul>
    </section>
  )
}
