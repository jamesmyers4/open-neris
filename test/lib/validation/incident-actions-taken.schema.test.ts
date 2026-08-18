import { describe, expect, it } from 'vitest'
import {
  incidentActionTakenEntrySchema,
  incidentActionsTakenSchema,
  incidentNoActionReasonSchema,
  incidentActionsTakenRequiredSchema
} from '@/lib/validation/incident-actions-taken.schema'
import { actionTacticOptions } from '@/lib/neris/lookups'

const withPair = actionTacticOptions.find(o => o.value2)!
const withoutPair = actionTacticOptions.find(o => !o.value2)!
const mismatchedValue2 = actionTacticOptions.find(o => o.value2 && o.value1 !== withPair.value1)!.value2

describe('incidentActionTakenEntrySchema', () => {
  it('accepts a valid value1-only entry', () => {
    expect(incidentActionTakenEntrySchema.safeParse({ value1: withoutPair.value1 }).success).toBe(true)
  })

  it('accepts a valid value1/value2 pair', () => {
    expect(incidentActionTakenEntrySchema.safeParse({ value1: withPair.value1, value2: withPair.value2 }).success).toBe(true)
  })

  it('rejects an unrecognized value1', () => {
    expect(incidentActionTakenEntrySchema.safeParse({ value1: 'NOT_A_REAL_ACTION' }).success).toBe(false)
  })

  it('rejects a value2 that does not belong to the given value1', () => {
    const result = incidentActionTakenEntrySchema.safeParse({ value1: withPair.value1, value2: mismatchedValue2 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'value2')).toBe(true)
  })
})

describe('incidentActionsTakenSchema', () => {
  it('accepts an empty payload', () => {
    expect(incidentActionsTakenSchema.safeParse({}).success).toBe(true)
  })

  it('accepts actionsTaken entries with no incidentNoActionReason', () => {
    const result = incidentActionsTakenSchema.safeParse({ actionsTaken: [{ value1: withoutPair.value1 }] })
    expect(result.success).toBe(true)
  })

  it('accepts incidentNoActionReason with an empty actionsTaken array', () => {
    const result = incidentActionsTakenSchema.safeParse({ incidentNoActionReason: 'CANCELLED' })
    expect(result.success).toBe(true)
  })

  it('rejects an unrecognized incidentNoActionReason', () => {
    expect(incidentActionsTakenSchema.safeParse({ incidentNoActionReason: 'BECAUSE_I_SAID_SO' }).success).toBe(false)
  })

  it('rejects actionsTaken and incidentNoActionReason set together (mutual exclusivity)', () => {
    const result = incidentActionsTakenSchema.safeParse({
      actionsTaken: [{ value1: withoutPair.value1 }],
      incidentNoActionReason: 'CANCELLED'
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'incidentNoActionReason')).toBe(true)
  })
})

describe('incidentNoActionReasonSchema', () => {
  it('accepts a valid reason', () => {
    expect(incidentNoActionReasonSchema.safeParse({ incidentNoActionReason: 'STAGED_STANDBY' }).success).toBe(true)
  })

  it('accepts an empty payload', () => {
    expect(incidentNoActionReasonSchema.safeParse({}).success).toBe(true)
  })

  it('rejects an unrecognized reason', () => {
    expect(incidentNoActionReasonSchema.safeParse({ incidentNoActionReason: 'VIBES' }).success).toBe(false)
  })
})

describe('incidentActionsTakenRequiredSchema', () => {
  it('accepts hasActionsTaken=true with a null reason', () => {
    const result = incidentActionsTakenRequiredSchema.safeParse({ hasActionsTaken: true, incidentNoActionReason: null })
    expect(result.success).toBe(true)
  })

  it('accepts hasActionsTaken=false with a non-null reason', () => {
    const result = incidentActionsTakenRequiredSchema.safeParse({ hasActionsTaken: false, incidentNoActionReason: 'CANCELLED' })
    expect(result.success).toBe(true)
  })

  it('rejects hasActionsTaken=false with a null reason (neither side satisfied)', () => {
    const result = incidentActionsTakenRequiredSchema.safeParse({ hasActionsTaken: false, incidentNoActionReason: null })
    expect(result.success).toBe(false)
  })

  it('does not re-enforce mutual exclusivity when both are set (deferred to the tab schema)', () => {
    const result = incidentActionsTakenRequiredSchema.safeParse({ hasActionsTaken: true, incidentNoActionReason: 'CANCELLED' })
    expect(result.success).toBe(true)
  })
})
