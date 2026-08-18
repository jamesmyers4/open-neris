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

describe('incidentTypeSchema', () => {
  it('accepts a minimal valid type row', () => {
    expect(incidentTypeSchema.safeParse({ value1: 'FIRE' }).success).toBe(true)
  })

  it('rejects an empty value1', () => {
    expect(incidentTypeSchema.safeParse({ value1: '' }).success).toBe(false)
  })

  it('defaults isPrimary to false when omitted', () => {
    const result = incidentTypeSchema.safeParse({ value1: 'FIRE' })
    expect(result.success && result.data.isPrimary).toBe(false)
  })
})

describe('incidentLocationSchema', () => {
  it('accepts a minimal valid location', () => {
    expect(incidentLocationSchema.safeParse(validLocation).success).toBe(true)
  })

  it('rejects a state that is not 2 characters', () => {
    expect(incidentLocationSchema.safeParse({ ...validLocation, state: 'NYC' }).success).toBe(false)
  })

  it('defaults country to US', () => {
    const result = incidentLocationSchema.safeParse(validLocation)
    expect(result.success && result.data.country).toBe('US')
  })
})

describe('incidentCoreSchema', () => {
  it('accepts a fully valid payload', () => {
    expect(incidentCoreSchema.safeParse(validCore()).success).toBe(true)
  })

  it('rejects a missing internalId', () => {
    expect(incidentCoreSchema.safeParse(validCore({ internalId: undefined })).success).toBe(false)
  })

  it('rejects an empty types array', () => {
    expect(incidentCoreSchema.safeParse(validCore({ types: [] })).success).toBe(false)
  })

  it('rejects more than 3 type rows', () => {
    const types = [
      { value1: 'FIRE', isPrimary: true },
      { value1: 'MEDICAL', isPrimary: false },
      { value1: 'HAZSIT', isPrimary: false },
      { value1: 'RESCUE', isPrimary: false }
    ]
    expect(incidentCoreSchema.safeParse(validCore({ types })).success).toBe(false)
  })

  it('rejects zero primary types', () => {
    const types = [{ value1: 'FIRE', isPrimary: false }]
    expect(incidentCoreSchema.safeParse(validCore({ types })).success).toBe(false)
  })

  it('rejects more than one primary type', () => {
    const types = [
      { value1: 'FIRE', isPrimary: true },
      { value1: 'MEDICAL', isPrimary: true }
    ]
    expect(incidentCoreSchema.safeParse(validCore({ types })).success).toBe(false)
  })

  it('accepts exactly one primary among multiple types', () => {
    const types = [
      { value1: 'FIRE', isPrimary: true },
      { value1: 'MEDICAL', isPrimary: false }
    ]
    expect(incidentCoreSchema.safeParse(validCore({ types })).success).toBe(true)
  })

  it('rejects an invalid nested location', () => {
    expect(incidentCoreSchema.safeParse(validCore({ location: { ...validLocation, state: 'X' } })).success).toBe(false)
  })

  it('rejects an unrecognized incidentNoActionReason enum value', () => {
    expect(incidentCoreSchema.safeParse(validCore({ incidentNoActionReason: 'NOT_A_REAL_REASON' })).success).toBe(false)
  })

  it('rejects an unrecognized aidDirection enum value', () => {
    expect(incidentCoreSchema.safeParse(validCore({ aidDirection: 'SIDEWAYS' })).success).toBe(false)
  })

  describe('dispatch chronology (arrival <= answered <= create)', () => {
    it('accepts a correctly ordered full chronology', () => {
      const result = incidentCoreSchema.safeParse(validCore({
        dispatchTimeCallArrival: '2026-01-01T00:00:00Z',
        dispatchTimeCallAnswer: '2026-01-01T00:01:00Z',
        dispatchTimeCallCreate: '2026-01-01T00:02:00Z'
      }))
      expect(result.success).toBe(true)
    })

    it('accepts all three timestamps equal', () => {
      const t = '2026-01-01T00:00:00Z'
      const result = incidentCoreSchema.safeParse(validCore({
        dispatchTimeCallArrival: t,
        dispatchTimeCallAnswer: t,
        dispatchTimeCallCreate: t
      }))
      expect(result.success).toBe(true)
    })

    it('accepts a partial chronology (only two of three fields)', () => {
      const result = incidentCoreSchema.safeParse(validCore({
        dispatchTimeCallArrival: '2026-01-01T00:00:00Z',
        dispatchTimeCallCreate: '2026-01-01T00:02:00Z'
      }))
      expect(result.success).toBe(true)
    })

    it('rejects arrival after create', () => {
      const result = incidentCoreSchema.safeParse(validCore({
        dispatchTimeCallArrival: '2026-01-01T00:02:00Z',
        dispatchTimeCallCreate: '2026-01-01T00:00:00Z'
      }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.join('.') === 'dispatchTimeCallCreate')).toBe(true)
      }
    })

    it('rejects arrival after answered', () => {
      const result = incidentCoreSchema.safeParse(validCore({
        dispatchTimeCallArrival: '2026-01-01T00:02:00Z',
        dispatchTimeCallAnswer: '2026-01-01T00:00:00Z'
      }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.join('.') === 'dispatchTimeCallAnswer')).toBe(true)
      }
    })

    it('rejects answered after create', () => {
      const result = incidentCoreSchema.safeParse(validCore({
        dispatchTimeCallAnswer: '2026-01-01T00:02:00Z',
        dispatchTimeCallCreate: '2026-01-01T00:00:00Z'
      }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.join('.') === 'dispatchTimeCallCreate')).toBe(true)
      }
    })
  })
})
