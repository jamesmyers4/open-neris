import { cache } from 'react'
import { prisma } from '../prisma'

export const getIncidentDetail = cache(async (id: string, departmentId: string) => {
  return prisma.incident.findFirst({
    where: { id, departmentId },
    include: {
      types: { orderBy: { sortOrder: 'asc' } },
      actionsTaken: { orderBy: { sortOrder: 'asc' } },
      dispatchComments: true,
      location: true,
      exposures: true,
      fire: true,
      medicals: true,
      hazsit: { include: { chemicals: true } },
      displacements: true,
      createdBy: true
    }
  })
})

export type IncidentDetail = NonNullable<Awaited<ReturnType<typeof getIncidentDetail>>>
