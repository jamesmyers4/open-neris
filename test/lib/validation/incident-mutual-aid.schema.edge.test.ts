import { describe, expect, it } from 'vitest'
import { incidentMutualAidTabSchema, AID_NONE } from '@/lib/validation/incident-mutual-aid.schema'

// Phase 5: edge/negative/boundary, beyond Phase 1's core-case coverage.
describe('incidentMutualAidTabSchema — boundary', () => {
  it('accepts a whitespace-only department name (min(1) does not trim)', () => {
    expect(incidentMutualAidTabSchema.safeParse({ aidDepartmentNames: ['   '] }).success).toBe(true)
  })

  it('rejects a mix of one valid and one empty-string department name', () => {
    const result = incidentMutualAidTabSchema.safeParse({ aidDepartmentNames: ['Neighboring FD', ''] })
    expect(result.success).toBe(false)
  })

  it('accepts a large number of department names (no max enforced — documents current behavior)', () => {
    const names = Array.from({ length: 50 }, (_, i) => `Department ${i}`)
    expect(incidentMutualAidTabSchema.safeParse({ aidDepartmentNames: names }).success).toBe(true)
  })

  it('rejects an empty-string aidDirection distinctly from the NONE sentinel', () => {
    // '' is not a member of TypeAidDirection nor equal to the AID_NONE
    // literal, so it fails the union outright rather than being coerced.
    const result = incidentMutualAidTabSchema.safeParse({ aidDirection: '' })
    expect(result.success).toBe(false)
  })

  it('treats AID_NONE case-sensitively (lowercase "none" is not the sentinel)', () => {
    const result = incidentMutualAidTabSchema.safeParse({ aidDirection: 'none' })
    expect(result.success).toBe(false)
  })

  it('rejects duplicate aidNonFdTypes entries not deduplicated (documents current behavior)', () => {
    const result = incidentMutualAidTabSchema.safeParse({ aidNonFdTypes: ['LAW_ENFORCEMENT', 'LAW_ENFORCEMENT'] })
    expect(result.success).toBe(true)
    expect(result.success && result.data.aidNonFdTypes).toEqual(['LAW_ENFORCEMENT', 'LAW_ENFORCEMENT'])
  })
})

describe('AID_NONE sentinel value', () => {
  it('is the literal string "NONE"', () => {
    expect(AID_NONE).toBe('NONE')
  })
})
