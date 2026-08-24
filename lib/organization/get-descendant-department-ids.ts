import type { PrismaClient } from '@prisma/client'

export async function getDescendantDepartmentIds(prisma: PrismaClient, departmentId: string): Promise<string[]> {
  const ids = new Set([departmentId])
  let frontier = [departmentId]

  while (frontier.length > 0) {
    const children = await prisma.department.findMany({
      where: { parentDepartmentId: { in: frontier } },
      select: { id: true }
    })
    const newIds = children.map(c => c.id).filter(id => !ids.has(id))
    newIds.forEach(id => ids.add(id))
    frontier = newIds
  }

  return [...ids]
}
