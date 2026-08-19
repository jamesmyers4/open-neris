import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { RescueFfForm } from '../rescue-ff-form'

export default async function NewRescueFfPage(props: PageProps<'/incidents/[id]/rescues/new-ff'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params

  const incident = await prisma.incident.findFirst({ where: { id, departmentId: user.departmentId } })
  if (!incident) notFound()

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Add firefighter casualty</h1>
      <RescueFfForm incidentId={incident.id} />
    </main>
  )
}
