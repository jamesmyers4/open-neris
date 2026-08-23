import { describe, expect, it } from 'vitest'
import {
  incidentDispatchSchema,
  incidentDispatchRequiredSchema,
  dispatchCommentSchema
} from '@/lib/validation/incident-dispatch.schema'

describe('incidentDispatchSchema', () => {
  it('accepts an empty payload (all fields optional)', () => {
    expect(incidentDispatchSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a fully populated, correctly ordered payload', () => {
    const result = incidentDispatchSchema.safeParse({
      dispatchTimeCallArrival: '2026-01-01T00:00:00Z',
      dispatchTimeCallAnswer: '2026-01-01T00:01:00Z',
      dispatchTimeCallCreate: '2026-01-01T00:02:00Z',
      timeIncidentClear: '2026-01-01T01:00:00Z',
      dispatchAutomaticAlarm: true,
      dispatchDeterminateCode: 'ABC',
      dispatchIncidentCode: 'CODE1',
      dispatchFinalDisposition: 'Handled on scene'
    })
    expect(result.success).toBe(true)
  })

  it('rejects a dispatchDeterminateCode over 8 characters', () => {
    expect(incidentDispatchSchema.safeParse({ dispatchDeterminateCode: 'WAYTOOLONGCODE' }).success).toBe(false)
  })

  describe('dispatch chronology (arrival <= answered <= create)', () => {
    it('accepts equal timestamps', () => {
      const t = '2026-01-01T00:00:00Z'
      const result = incidentDispatchSchema.safeParse({
        dispatchTimeCallArrival: t,
        dispatchTimeCallAnswer: t,
        dispatchTimeCallCreate: t
      })
      expect(result.success).toBe(true)
    })

    it('rejects arrival after answered', () => {
      const result = incidentDispatchSchema.safeParse({
        dispatchTimeCallArrival: '2026-01-01T00:02:00Z',
        dispatchTimeCallAnswer: '2026-01-01T00:00:00Z'
      })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'dispatchTimeCallAnswer')).toBe(true)
    })

    it('rejects answered after create', () => {
      const result = incidentDispatchSchema.safeParse({
        dispatchTimeCallAnswer: '2026-01-01T00:02:00Z',
        dispatchTimeCallCreate: '2026-01-01T00:00:00Z'
      })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'dispatchTimeCallCreate')).toBe(true)
    })

    it('rejects arrival after create', () => {
      const result = incidentDispatchSchema.safeParse({
        dispatchTimeCallArrival: '2026-01-01T00:02:00Z',
        dispatchTimeCallCreate: '2026-01-01T00:00:00Z'
      })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'dispatchTimeCallCreate')).toBe(true)
    })
  })
})

describe('incidentDispatchRequiredSchema', () => {
  it('accepts timeIncidentClear as a real Date instance', () => {
    const result = incidentDispatchRequiredSchema.safeParse({
      timeIncidentClear: new Date('2026-01-01T01:00:00Z')
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing timeIncidentClear', () => {
    const result = incidentDispatchRequiredSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects a null timeIncidentClear (no coercion, unlike the tab schema)', () => {
    const result = incidentDispatchRequiredSchema.safeParse({ timeIncidentClear: null })
    expect(result.success).toBe(false)
  })

  it('rejects an ISO string, since this schema does not coerce', () => {
    const result = incidentDispatchRequiredSchema.safeParse({ timeIncidentClear: '2026-01-01T01:00:00Z' })
    expect(result.success).toBe(false)
  })

  it('dispatchTimeCallArrival/Answer/Create are genuinely optional (neris_core_app=FALSE, CAD-populated fields, not app-required)', () => {
    const result = incidentDispatchRequiredSchema.safeParse({
      timeIncidentClear: new Date(),
      dispatchTimeCallArrival: undefined,
      dispatchTimeCallAnswer: undefined,
      dispatchTimeCallCreate: undefined
    })
    expect(result.success).toBe(true)
  })
})

describe('dispatchCommentSchema', () => {
  it('accepts a valid comment', () => {
    const result = dispatchCommentSchema.safeParse({ comment: 'Crew on scene', timestamp: '2026-01-01T00:00:00Z' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty comment', () => {
    expect(dispatchCommentSchema.safeParse({ comment: '', timestamp: '2026-01-01T00:00:00Z' }).success).toBe(false)
  })

  it('rejects a comment over 100,000 characters', () => {
    const result = dispatchCommentSchema.safeParse({ comment: 'a'.repeat(100_001), timestamp: '2026-01-01T00:00:00Z' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing timestamp', () => {
    expect(dispatchCommentSchema.safeParse({ comment: 'Crew on scene' }).success).toBe(false)
  })
})
