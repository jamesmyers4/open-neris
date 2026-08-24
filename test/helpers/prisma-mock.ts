import { vi, type Mock } from 'vitest'

// Hand-rolled, not a deep-mock library: covers exactly the prisma.* calls
// the 9 actions.ts files under test actually make, so a spy assertion on
// e.g. mockPrisma.incident.update reads directly against real action code.
export type MockPrismaClient = {
  department: { findUniqueOrThrow: Mock; findMany: Mock; update: Mock }
  user: { findUnique: Mock; findFirst: Mock; create: Mock; update: Mock }
  incident: { findFirst: Mock; update: Mock; updateMany: Mock; create: Mock }
  incidentActionTaken: { findFirst: Mock; create: Mock; delete: Mock }
  incidentDispatchComment: { create: Mock }
  incidentExposure: { create: Mock }
  incidentLocation: { upsert: Mock }
  incidentDisplacement: { create: Mock }
  incidentUnitResponse: { create: Mock }
  station: { findFirst: Mock; create: Mock; update: Mock; delete: Mock }
  unit: { findFirst: Mock; findMany: Mock; create: Mock; update: Mock; delete: Mock }
  reviewEvent: { create: Mock }
  $transaction: Mock
}

export function createPrismaMock(): MockPrismaClient {
  const mock = {
    department: { findUniqueOrThrow: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    incident: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    incidentActionTaken: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
    incidentDispatchComment: { create: vi.fn() },
    incidentExposure: { create: vi.fn() },
    incidentLocation: { upsert: vi.fn() },
    incidentDisplacement: { create: vi.fn() },
    incidentUnitResponse: { create: vi.fn() },
    station: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    unit: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reviewEvent: { create: vi.fn() }
  } as MockPrismaClient

  // Supports both $transaction call shapes used in this codebase: the batch
  // array form (submitIncident) and the interactive callback form
  // (createIncident) — the callback is invoked with this same mock as `tx`,
  // so tx.incident.create routes through the same spy as a direct call.
  mock.$transaction = vi.fn(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg)
    if (typeof arg === 'function') return (arg as (tx: MockPrismaClient) => unknown)(mock)
    throw new Error('Unsupported $transaction argument shape in prisma mock')
  })

  return mock
}
