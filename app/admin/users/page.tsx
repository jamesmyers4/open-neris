import { redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'
import { getUsersInScope } from '@/lib/organization/get-users-in-scope'
import { InviteForm } from './invite-form'
import { UsersList } from './users-list'

export default async function AdminUsersPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'ADMIN') redirect('/incidents')

  const { departments, users } = await getUsersInScope(prisma, user.departmentId)
  const departmentNameById = new Map(departments.map(d => [d.id, d.name]))

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Users</h1>
      <UsersList
        currentUserId={user.id}
        showDepartmentColumn={departments.length > 1}
        users={users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          departmentName: departmentNameById.get(u.departmentId) ?? ''
        }))}
      />
      <InviteForm departments={departments} ownDepartmentId={user.departmentId} />
    </main>
  )
}
