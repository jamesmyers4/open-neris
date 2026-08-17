import { redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { incidentTypeOptions } from '@/lib/neris/lookups'
import { IncidentForm } from './incident-form'

export default async function NewIncidentPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold">New incident</h1>
      <IncidentForm incidentTypeOptions={incidentTypeOptions} />
    </main>
  )
}
