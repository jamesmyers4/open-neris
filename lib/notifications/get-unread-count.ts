import type { PrismaClient } from '@prisma/client'

export async function getUnreadNotificationCount(prisma: PrismaClient, userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } })
}
