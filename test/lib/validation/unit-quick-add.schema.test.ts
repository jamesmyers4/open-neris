import { describe, expect, it } from 'vitest'
import { quickAddUnitSchema } from '@/lib/validation/unit-quick-add.schema'

describe('quickAddUnitSchema', () => {
  it('accepts a designation with no capabilityType', () => {
    expect(quickAddUnitSchema.safeParse({ designation: 'ENGINE 7' }).success).toBe(true)
  })

  it('accepts a real type_unit.csv capability value', () => {
    expect(quickAddUnitSchema.safeParse({ designation: 'ENGINE 7', capabilityType: 'ENGINE_STRUCT' }).success).toBe(true)
  })

  it('rejects a missing designation', () => {
    expect(quickAddUnitSchema.safeParse({}).success).toBe(false)
  })

  it('rejects a capabilityType not in the NERIS value set', () => {
    const result = quickAddUnitSchema.safeParse({ designation: 'ENGINE 7', capabilityType: 'NOT_A_REAL_VALUE' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'capabilityType')).toBe(true)
  })
})
