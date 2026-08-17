import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { ExposureForm } from './exposure-form'

export default async function NewExposurePage(props: PageProps<'/incidents/[id]/exposures/new'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params

  const incident = await prisma.incident.findFirst({ where: { id, departmentId: user.departmentId } })
  if (!incident) notFound()

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Add exposure</h1>
      <ExposureForm incidentId={incident.id} />
    </main>
  )
}
