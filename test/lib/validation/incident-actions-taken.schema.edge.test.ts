import { describe, expect, it } from 'vitest'
import { incidentActionTakenEntrySchema, incidentActionsTakenSchema } from '@/lib/validation/incident-actions-taken.schema'
import { actionTacticOptions } from '@/lib/neris/lookups'

const withoutPair = actionTacticOptions.find(o => !o.value2)!

// Phase 5: edge/negative/boundary, beyond Phase 1's core-case coverage.
describe('incidentActionTakenEntrySchema — boundary', () => {
  it('rejects an empty-string value1', () => {
    expect(incidentActionTakenEntrySchema.safeParse({ value1: '' }).success).toBe(false)
  })

  it('accepts an explicitly empty-string value2 as equivalent to no value2 (falsy short-circuits the pair check)', () => {
    const result = incidentActionTakenEntrySchema.safeParse({ value1: withoutPair.value1, value2: '' })
    expect(result.success).toBe(true)
  })
})

describe('incidentActionsTakenSchema — boundary', () => {
  it('accepts a large number of actionsTaken entries (no max enforced — documents current behavior)', () => {
    const actionsTaken = Array.from({ length: 25 }, () => ({ value1: withoutPair.value1 }))
    expect(incidentActionsTakenSchema.safeParse({ actionsTaken }).success).toBe(true)
  })

  it('rejects an actionsTaken array containing one invalid entry among valid ones', () => {
    const actionsTaken = [{ value1: withoutPair.value1 }, { value1: 'NOT_A_REAL_ACTION' }]
    expect(incidentActionsTakenSchema.safeParse({ actionsTaken }).success).toBe(false)
  })

  it('treats an empty-string incidentNoActionReason as absent (optional enum does not accept "")', () => {
    const result = incidentActionsTakenSchema.safeParse({ incidentNoActionReason: '' })
    expect(result.success).toBe(false)
  })
})
