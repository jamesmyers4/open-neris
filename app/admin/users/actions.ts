'use server'

import { revalidatePath } from 'next/cache'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/require-admin'
import { inviteSchema } from '@/lib/validation/invite.schema'
import { getDescendantDepartmentIds } from '@/lib/organization/get-descendant-department-ids'

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
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/sign-up`
    })
  } catch {
    return {
      message: 'The pending account was created, but the Clerk invite email failed to send. Ask them to sign up normally with the same email, or try inviting again.'
    }
  }

  revalidatePath('/admin/users')
  return { message: 'Invite sent.' }
}
