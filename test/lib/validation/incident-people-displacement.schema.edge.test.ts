import { describe, expect, it } from 'vitest'
import { incidentPeopleDisplacementTabSchema, incidentDisplacementSchema } from '@/lib/validation/incident-people-displacement.schema'

// Phase 5: edge/negative/boundary, beyond Phase 1's core-case coverage.
describe('incidentPeopleDisplacementTabSchema — boundary', () => {
  it('rejects an incidentRescueAnimal of NaN', () => {
    expect(incidentPeopleDisplacementTabSchema.safeParse({ incidentRescueAnimal: NaN }).success).toBe(false)
  })

  it('accepts a very large incidentRescueAnimal (no max enforced — documents current behavior)', () => {
    expect(incidentPeopleDisplacementTabSchema.safeParse({ incidentRescueAnimal: 1_000_000 }).success).toBe(true)
  })
})

describe('incidentDisplacementSchema — boundary', () => {
  it('accepts duplicate causes not deduplicated (documents current behavior)', () => {
    const result = incidentDisplacementSchema.safeParse({ causes: ['FIRE', 'FIRE'] })
    expect(result.success).toBe(true)
    expect(result.success && result.data.causes).toEqual(['FIRE', 'FIRE'])
  })

  it('rejects a causes array containing one invalid value among valid ones', () => {
    expect(incidentDisplacementSchema.safeParse({ causes: ['FIRE', 'NOT_A_REAL_CAUSE'] }).success).toBe(false)
  })
})
