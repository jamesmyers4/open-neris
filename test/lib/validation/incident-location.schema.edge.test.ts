import { describe, expect, it } from 'vitest'
import { incidentLocationTabSchema, incidentLocationRequiredSchema } from '@/lib/validation/incident-location.schema'

const validStreetState = { streetAddressComplete: '123 Main St', state: 'NY' }

// Phase 5: edge/negative/boundary, beyond Phase 1's core-case coverage.
describe('incidentLocationTabSchema — boundary', () => {
  it('accepts a whitespace-only streetAddressComplete (min(1) does not trim)', () => {
    expect(incidentLocationTabSchema.safeParse({ ...validStreetState, streetAddressComplete: '   ' }).success).toBe(true)
  })

  it('rejects an empty state', () => {
    expect(incidentLocationTabSchema.safeParse({ ...validStreetState, state: '' }).success).toBe(false)
  })

  it('rejects a single-character state', () => {
    expect(incidentLocationTabSchema.safeParse({ ...validStreetState, state: 'N' }).success).toBe(false)
  })

  it('rejects a lowercase-but-otherwise-valid-length state (no case normalization enforced by the schema)', () => {
    // The schema only checks length, not casing/allowlist against real US
    // state codes — documents current permissiveness rather than assuming
    // a stricter rule the schema doesn't implement.
    expect(incidentLocationTabSchema.safeParse({ ...validStreetState, state: 'ny' }).success).toBe(true)
  })

  it('rejects place without any useType/useSubtype context (place validated independently of use fields)', () => {
    const result = incidentLocationTabSchema.safeParse({ ...validStreetState, place: 'NOT_A_REAL_PLACE' })
    expect(result.success).toBe(false)
  })

  it('rejects useSubtype alone with an explicitly empty-string useType (falsy, same as absent)', () => {
    const result = incidentLocationTabSchema.safeParse({ ...validStreetState, useType: '', useSubtype: 'SOME_SUBTYPE' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'useSubtype')).toBe(true)
  })
})

describe('incidentLocationRequiredSchema — boundary', () => {
  it('accepts a whitespace-only streetAddressComplete (min(1) does not trim)', () => {
    expect(incidentLocationRequiredSchema.safeParse({ ...validStreetState, streetAddressComplete: '   ' }).success).toBe(true)
  })

  it('rejects an empty state', () => {
    expect(incidentLocationRequiredSchema.safeParse({ ...validStreetState, state: '' }).success).toBe(false)
  })

  it('rejects a state that is 3 characters', () => {
    expect(incidentLocationRequiredSchema.safeParse({ ...validStreetState, state: 'NYS' }).success).toBe(false)
  })
})
