'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { clerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/require-admin'
import { inviteSchema } from '@/lib/validation/invite.schema'
import { getDescendantDepartmentIds } from '@/lib/organization/get-descendant-department-ids'
import { getAppBaseUrl } from '@/lib/app-url'

async function findUserInScope(adminDepartmentId: string, userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return null

  const allowedDepartmentIds = await getDescendantDepartmentIds(prisma, adminDepartmentId)
  if (!allowedDepartmentIds.includes(target.departmentId)) return null

  return target
}

export type CreateInviteState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function createInvite(_prevState: CreateInviteState, formData: FormData): Promise<CreateInviteState> {
  const admin = await requireAdmin()
  if ('error' in admin) return { message: admin.error }

  const raw = {
    email: formData.get('email') || undefined,
    role: formData.get('role') || undefined,
    departmentId: formData.get('departmentId') || admin.user.departmentId
  }

  const parsed = inviteSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const allowedDepartmentIds = await getDescendantDepartmentIds(prisma, admin.user.departmentId)
  if (!allowedDepartmentIds.includes(parsed.data.departmentId)) {
    return { message: 'You can only invite into your own department or one under your district.' }
  }

  const existing = await prisma.user.findFirst({ where: { email: parsed.data.email, departmentId: parsed.data.departmentId } })
  if (existing) {
    return { message: 'A user with that email already exists in this department.' }
  }

  await prisma.user.create({
    data: {
      departmentId: parsed.data.departmentId,
      email: parsed.data.email,
      name: parsed.data.email,
      role: parsed.data.role,
      status: 'PENDING',
      clerkId: null
    }
  })

  try {
    const client = await clerkClient()
    await client.invitations.createInvitation({
      emailAddress: parsed.data.email,
      redirectUrl: `${getAppBaseUrl()}/sign-up`
    })
  } catch {
    return {
      message: 'The pending account was created, but the Clerk invite email failed to send. Ask them to sign up normally with the same email, or try inviting again.'
    }
  }

  revalidatePath('/admin/users')
  return { message: 'Invite sent.' }
}

export type UpdateUserRoleState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function updateUserRole(userId: string, _prevState: UpdateUserRoleState, formData: FormData): Promise<UpdateUserRoleState> {
  const admin = await requireAdmin()
  if ('error' in admin) return { message: admin.error }

  const target = await findUserInScope(admin.user.departmentId, userId)
  if (!target) return { message: 'User not found.' }

  const parsed = z.object({ role: z.enum(UserRole) }).safeParse({ role: formData.get('role') || undefined })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.user.update({ where: { id: userId }, data: { role: parsed.data.role } })

  revalidatePath('/admin/users')
  return { message: 'Role updated.' }
}

export type DeactivateUserState = {
  message?: string
}

export async function deactivateUser(_prevState: DeactivateUserState, formData: FormData): Promise<DeactivateUserState> {
  const admin = await requireAdmin()
  if ('error' in admin) return { message: admin.error }

  const userId = formData.get('userId')
  if (typeof userId !== 'string') return { message: 'User not found.' }

  const target = await findUserInScope(admin.user.departmentId, userId)
  if (!target) return { message: 'User not found.' }

  await prisma.user.update({ where: { id: userId }, data: { status: 'DEACTIVATED' } })

  revalidatePath('/admin/users')
  return { message: 'User deactivated.' }
}
