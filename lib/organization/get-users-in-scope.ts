import type { PrismaClient } from '@prisma/client'
import { getDescendantDepartmentIds } from './get-descendant-department-ids'

export async function getUsersInScope(prisma: PrismaClient, adminDepartmentId: string) {
  const departmentIds = await getDescendantDepartmentIds(prisma, adminDepartmentId)

  const [departments, users] = await Promise.all([
    prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.user.findMany({
      where: { departmentId: { in: departmentIds } },
      orderBy: { createdAt: 'asc' }
    })
  ])

  return { departments, users }
}
