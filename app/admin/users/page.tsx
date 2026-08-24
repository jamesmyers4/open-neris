import { redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'
import { getDescendantDepartmentIds } from '@/lib/organization/get-descendant-department-ids'
import { InviteForm } from './invite-form'

export default async function AdminUsersPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'ADMIN') redirect('/incidents')

  const departmentIds = await getDescendantDepartmentIds(prisma, user.departmentId)
  const departments = await prisma.department.findMany({
    where: { id: { in: departmentIds } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Users</h1>
      <InviteForm departments={departments} ownDepartmentId={user.departmentId} />
    </main>
  )
}
