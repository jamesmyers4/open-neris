import { describe, expect, it } from 'vitest'
import { incidentDispatchSchema, dispatchCommentSchema } from '@/lib/validation/incident-dispatch.schema'

// Phase 5: edge/negative/boundary, beyond Phase 1's core-case coverage.
describe('incidentDispatchSchema — boundary', () => {
  it('accepts a dispatchDeterminateCode of exactly 8 characters', () => {
    expect(incidentDispatchSchema.safeParse({ dispatchDeterminateCode: '12345678' }).success).toBe(true)
  })

  it('rejects a dispatchDeterminateCode of exactly 9 characters', () => {
    expect(incidentDispatchSchema.safeParse({ dispatchDeterminateCode: '123456789' }).success).toBe(false)
  })

  it('accepts a whitespace-only dispatchFinalDisposition (no trim enforced)', () => {
    expect(incidentDispatchSchema.safeParse({ dispatchFinalDisposition: '   ' }).success).toBe(true)
  })

  it('rejects a dispatchIncidentCode over 255 characters', () => {
    expect(incidentDispatchSchema.safeParse({ dispatchIncidentCode: 'a'.repeat(256) }).success).toBe(false)
  })

  it('accepts a dispatchIncidentCode of exactly 255 characters', () => {
    expect(incidentDispatchSchema.safeParse({ dispatchIncidentCode: 'a'.repeat(255) }).success).toBe(true)
  })

  it('coerces an epoch-milliseconds number for a timestamp field', () => {
    const result = incidentDispatchSchema.safeParse({ dispatchTimeCallArrival: 1_800_000_000_000 })
    expect(result.success).toBe(true)
  })

  it('rejects a garbage string for a timestamp field', () => {
    expect(incidentDispatchSchema.safeParse({ dispatchTimeCallArrival: 'not-a-real-timestamp' }).success).toBe(false)
  })
})

describe('dispatchCommentSchema — boundary', () => {
  it('accepts a whitespace-only comment (min(1) does not trim)', () => {
    expect(dispatchCommentSchema.safeParse({ comment: '   ', timestamp: '2026-01-01T00:00:00Z' }).success).toBe(true)
  })

  it('accepts a comment of exactly 100,000 characters', () => {
    const result = dispatchCommentSchema.safeParse({ comment: 'a'.repeat(100_000), timestamp: '2026-01-01T00:00:00Z' })
    expect(result.success).toBe(true)
  })

  it('rejects a non-string comment (e.g. a number)', () => {
    expect(dispatchCommentSchema.safeParse({ comment: 12345, timestamp: '2026-01-01T00:00:00Z' }).success).toBe(false)
  })
})
