import type { PrismaClient } from '@prisma/client'

export async function isSoloDepartment(prisma: PrismaClient, departmentId: string): Promise<boolean> {
  const count = await prisma.user.count({ where: { departmentId, status: 'ACTIVE' } })
  return count <= 1
}
