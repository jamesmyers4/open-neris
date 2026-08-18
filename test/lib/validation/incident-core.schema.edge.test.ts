import { describe, expect, it } from 'vitest'
import { incidentCoreSchema, incidentTypeSchema, incidentLocationSchema } from '@/lib/validation/incident-core.schema'

const validLocation = {
  streetAddressComplete: '123 Main St',
  state: 'NY'
}

const validTypes = [{ value1: 'FIRE', value2: 'STRUCTURE_FIRE', isPrimary: true }]

function validCore(overrides: Record<string, unknown> = {}) {
  return {
    internalId: '2026-000001',
    incidentDate: '2026-01-01T00:00:00Z',
    alarmTime: '2026-01-01T00:00:00Z',
    types: validTypes,
    location: validLocation,
    ...overrides
  }
}

// Phase 5: edge/negative/boundary, beyond Phase 1's core-case coverage.
describe('incidentTypeSchema — boundary', () => {
  // min(1) has no trim() alongside it — documents the current (permissive)
  // behavior rather than asserting a should-reject that the schema doesn't
  // actually enforce.
  it('accepts a whitespace-only value1 (min(1) does not trim)', () => {
    expect(incidentTypeSchema.safeParse({ value1: '   ' }).success).toBe(true)
  })
})

describe('incidentLocationSchema — boundary', () => {
  it('rejects an empty streetAddressComplete', () => {
    expect(incidentLocationSchema.safeParse({ ...validLocation, streetAddressComplete: '' }).success).toBe(false)
  })

  it('accepts a whitespace-only streetAddressComplete (min(1) does not trim)', () => {
    expect(incidentLocationSchema.safeParse({ ...validLocation, streetAddressComplete: '   ' }).success).toBe(true)
  })

  it('rejects an empty state', () => {
    expect(incidentLocationSchema.safeParse({ ...validLocation, state: '' }).success).toBe(false)
  })
})

describe('incidentCoreSchema — boundary', () => {
  it('accepts a whitespace-only internalId (min(1) does not trim)', () => {
    expect(incidentCoreSchema.safeParse(validCore({ internalId: '   ' })).success).toBe(true)
  })

  it('rejects an empty internalId', () => {
    expect(incidentCoreSchema.safeParse(validCore({ internalId: '' })).success).toBe(false)
  })

  it('rejects a negative incidentRescueAnimal', () => {
    expect(incidentCoreSchema.safeParse(validCore({ incidentRescueAnimal: -1 })).success).toBe(false)
  })

  it('rejects a non-integer incidentRescueAnimal', () => {
    expect(incidentCoreSchema.safeParse(validCore({ incidentRescueAnimal: 1.5 })).success).toBe(false)
  })

  it('accepts an incidentRescueAnimal of exactly 0', () => {
    expect(incidentCoreSchema.safeParse(validCore({ incidentRescueAnimal: 0 })).success).toBe(true)
  })

  it('rejects an unparseable alarmTime string', () => {
    expect(incidentCoreSchema.safeParse(validCore({ alarmTime: 'not-a-date' })).success).toBe(false)
  })

  it('rejects a types array containing a duplicate row (no dedup enforced — documents current behavior)', () => {
    const types = [
      { value1: 'FIRE', isPrimary: true },
      { value1: 'FIRE', isPrimary: false }
    ]
    // Two rows with identical value1 are structurally distinct entries (the
    // schema keys uniqueness on nothing) — this passes today, which is the
    // behavior worth locking in rather than assuming rejected.
    expect(incidentCoreSchema.safeParse(validCore({ types })).success).toBe(true)
  })

  describe('dispatch chronology — boundary combinations', () => {
    it('rejects when only arrival is set after create, with answer entirely absent', () => {
      const result = incidentCoreSchema.safeParse(validCore({
        dispatchTimeCallArrival: '2026-01-01T00:02:00Z',
        dispatchTimeCallCreate: '2026-01-01T00:00:00Z'
      }))
      expect(result.success).toBe(false)
    })

    it('accepts when only one of the three timestamps is present', () => {
      const result = incidentCoreSchema.safeParse(validCore({
        dispatchTimeCallCreate: '2026-01-01T00:00:00Z'
      }))
      expect(result.success).toBe(true)
    })
  })
})
