import type { PrismaClient } from '@prisma/client'

export type SignupResolution =
  | { outcome: 'CREATED'; departmentId: string; userId: string }
  | { outcome: 'CLAIMED'; departmentId: string; userId: string }
  | { outcome: 'CONTACT_ADMIN'; admin: { name: string; email: string } }

export type SignupDepartmentInput = { departmentName: string; city: string; state: string }
export type Signer = { clerkId: string; name: string; email: string }

async function claimOrphanedDepartment(prisma: PrismaClient, departmentId: string, signer: Signer): Promise<SignupResolution> {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Department" WHERE id = ${departmentId} FOR UPDATE`

    const stillOrphaned = await tx.user.findFirst({ where: { departmentId, role: 'ADMIN' }, orderBy: { createdAt: 'asc' } })
    if (stillOrphaned) {
      return { outcome: 'CONTACT_ADMIN', admin: { name: stillOrphaned.name, email: stillOrphaned.email } }
    }

    const user = await tx.user.create({
      data: { departmentId, clerkId: signer.clerkId, name: signer.name, email: signer.email, role: 'ADMIN' }
    })
    return { outcome: 'CLAIMED', departmentId, userId: user.id }
  })
}

export async function resolveDepartmentSignup(
  prisma: PrismaClient,
  input: SignupDepartmentInput,
  signer: Signer
): Promise<SignupResolution> {
  const department = await prisma.department.findFirst({
    where: { name: input.departmentName, city: input.city, state: input.state }
  })

  if (!department) {
    return prisma.$transaction(async tx => {
      const newDepartment = await tx.department.create({
        data: { name: input.departmentName, city: input.city, state: input.state }
      })
      const user = await tx.user.create({
        data: { departmentId: newDepartment.id, clerkId: signer.clerkId, name: signer.name, email: signer.email, role: 'ADMIN' }
      })
      return { outcome: 'CREATED', departmentId: newDepartment.id, userId: user.id }
    })
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { departmentId: department.id, role: 'ADMIN' },
    orderBy: { createdAt: 'asc' }
  })

  if (existingAdmin) {
    return { outcome: 'CONTACT_ADMIN', admin: { name: existingAdmin.name, email: existingAdmin.email } }
  }

  return claimOrphanedDepartment(prisma, department.id, signer)
}
