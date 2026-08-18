import { describe, expect, it } from 'vitest'
import { createIncidentSchema } from '@/lib/validation/incident-create.schema'

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    types: [{ value1: 'FIRE', isPrimary: true }],
    alarmTime: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

describe('createIncidentSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(createIncidentSchema.safeParse(validPayload()).success).toBe(true)
  })

  it('defaults specialModifiers to an empty array', () => {
    const result = createIncidentSchema.safeParse(validPayload())
    expect(result.success && result.data.specialModifiers).toEqual([])
  })

  it('accepts a valid specialModifiers value', () => {
    const result = createIncidentSchema.safeParse(validPayload({ specialModifiers: ['MCI'] }))
    expect(result.success).toBe(true)
  })

  it('rejects an unrecognized specialModifiers enum value', () => {
    const result = createIncidentSchema.safeParse(validPayload({ specialModifiers: ['NOT_A_MODIFIER'] }))
    expect(result.success).toBe(false)
  })

  it('rejects a missing alarmTime', () => {
    expect(createIncidentSchema.safeParse(validPayload({ alarmTime: undefined })).success).toBe(false)
  })

  it('rejects an empty types array', () => {
    expect(createIncidentSchema.safeParse(validPayload({ types: [] })).success).toBe(false)
  })

  it('rejects more than 3 type rows', () => {
    const types = [
      { value1: 'FIRE', isPrimary: true },
      { value1: 'MEDICAL', isPrimary: false },
      { value1: 'HAZSIT', isPrimary: false },
      { value1: 'RESCUE', isPrimary: false }
    ]
    expect(createIncidentSchema.safeParse(validPayload({ types })).success).toBe(false)
  })

  it('rejects zero primary types', () => {
    const types = [{ value1: 'FIRE', isPrimary: false }]
    expect(createIncidentSchema.safeParse(validPayload({ types })).success).toBe(false)
  })

  it('rejects more than one primary type', () => {
    const types = [
      { value1: 'FIRE', isPrimary: true },
      { value1: 'MEDICAL', isPrimary: true }
    ]
    expect(createIncidentSchema.safeParse(validPayload({ types })).success).toBe(false)
  })

  it('accepts 1-3 rows with exactly one primary', () => {
    const types = [
      { value1: 'FIRE', isPrimary: false },
      { value1: 'MEDICAL', isPrimary: true },
      { value1: 'HAZSIT', isPrimary: false }
    ]
    expect(createIncidentSchema.safeParse(validPayload({ types })).success).toBe(true)
  })
})
