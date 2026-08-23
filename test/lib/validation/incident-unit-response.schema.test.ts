import { describe, expect, it } from 'vitest'
import { incidentUnitResponseSchema, incidentUnitResponseRequiredSchema } from '@/lib/validation/incident-unit-response.schema'

describe('incidentUnitResponseSchema', () => {
  it('accepts a minimal valid record', () => {
    expect(incidentUnitResponseSchema.safeParse({ unitIdLinked: 'ENGINE_1' }).success).toBe(true)
  })

  it('rejects a missing unitIdLinked', () => {
    expect(incidentUnitResponseSchema.safeParse({}).success).toBe(false)
  })
})

describe('incidentUnitResponseRequiredSchema (dispatch_unit_response is neris_core_app=TRUE, unconditional)', () => {
  it('rejects an empty unitResponses array', () => {
    const result = incidentUnitResponseRequiredSchema.safeParse({ unitResponses: [] })
    expect(result.success).toBe(false)
  })

  it('accepts at least one valid unit response row', () => {
    const result = incidentUnitResponseRequiredSchema.safeParse({ unitResponses: [{ unitIdLinked: 'ENGINE_1' }] })
    expect(result.success).toBe(true)
  })

  it('validates each row against the same rules as incidentUnitResponseSchema', () => {
    const result = incidentUnitResponseRequiredSchema.safeParse({ unitResponses: [{}] })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'unitResponses.0.unitIdLinked')).toBe(true)
  })
})
