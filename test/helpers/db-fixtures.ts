import { randomUUID } from 'node:crypto'
import type { Department, Incident, PrismaClient, Station, Unit, User } from '@prisma/client'

// Row builders for DB-backed tests (Phase 2+). Distinct from fixtures.ts's
// buildIncidentDetail(), which is a plain in-memory object for Phase 1's
// pure-function tests — these actually insert through a live PrismaClient.

export async function createTestDepartment(prisma: PrismaClient, overrides: Partial<Department> = {}): Promise<Department> {
  return prisma.department.create({
    data: {
      name: 'Test Department',
      ...overrides
    }
  })
}

export async function createTestUser(prisma: PrismaClient, departmentId: string, overrides: Partial<User> = {}): Promise<User> {
  return prisma.user.create({
    data: {
      departmentId,
      clerkId: `clerk_${randomUUID()}`,
      name: 'Test User',
      email: 'test@example.com',
      ...overrides
    }
  })
}

export async function createTestStation(prisma: PrismaClient, departmentId: string, overrides: Partial<Station> = {}): Promise<Station> {
  return prisma.station.create({
    data: {
      departmentId,
      label: 'Test Station',
      ...overrides
    }
  })
}

export async function createTestUnit(prisma: PrismaClient, stationId: string, overrides: Partial<Unit> = {}): Promise<Unit> {
  return prisma.unit.create({
    data: {
      stationId,
      designation: `TEST-${randomUUID()}`,
      ...overrides
    }
  })
}

export async function createTestIncident(
  prisma: PrismaClient,
  departmentId: string,
  createdById: string,
  overrides: Partial<Incident> = {}
): Promise<Incident> {
  const now = new Date('2026-01-01T00:00:00Z')
  return prisma.incident.create({
    data: {
      departmentId,
      createdById,
      internalId: `TEST-${randomUUID()}`,
      incidentDate: now,
      alarmTime: now,
      ...overrides
    }
  })
}
