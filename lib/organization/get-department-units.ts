import { prisma } from '../prisma'

export async function getDepartmentUnits(departmentId: string) {
  return prisma.unit.findMany({
    where: { station: { departmentId } },
    include: { station: true },
    orderBy: { designation: 'asc' }
  })
}

export type DepartmentUnit = Awaited<ReturnType<typeof getDepartmentUnits>>[number]
