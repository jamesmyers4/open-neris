import { describe, expect, it } from 'vitest'
import { incidentMutualAidTabSchema, AID_NONE } from '@/lib/validation/incident-mutual-aid.schema'

describe('incidentMutualAidTabSchema', () => {
  it('accepts an empty payload', () => {
    expect(incidentMutualAidTabSchema.safeParse({}).success).toBe(true)
  })

  it('defaults array fields to empty', () => {
    const result = incidentMutualAidTabSchema.safeParse({})
    expect(result.success && result.data.aidDepartmentNames).toEqual([])
    expect(result.success && result.data.aidNonFdTypes).toEqual([])
  })

  it('accepts a real aid direction with type and department names', () => {
    const result = incidentMutualAidTabSchema.safeParse({
      aidDirection: 'GIVEN',
      aidType: 'SUPPORT_AID',
      aidDepartmentNames: ['Neighboring FD'],
      aidNonFdTypes: ['LAW_ENFORCEMENT']
    })
    expect(result.success).toBe(true)
  })

  it('accepts the NONE sentinel with nothing else set', () => {
    expect(incidentMutualAidTabSchema.safeParse({ aidDirection: AID_NONE }).success).toBe(true)
  })

  it('rejects an unrecognized aidDirection value', () => {
    expect(incidentMutualAidTabSchema.safeParse({ aidDirection: 'SIDEWAYS' }).success).toBe(false)
  })

  it('rejects an unrecognized aidType value', () => {
    expect(incidentMutualAidTabSchema.safeParse({ aidType: 'FREE_PIZZA' }).success).toBe(false)
  })

  it('rejects an unrecognized aidNonFdTypes value', () => {
    expect(incidentMutualAidTabSchema.safeParse({ aidNonFdTypes: ['FREE_PIZZA'] }).success).toBe(false)
  })

  it('rejects an empty string in aidDepartmentNames', () => {
    expect(incidentMutualAidTabSchema.safeParse({ aidDepartmentNames: [''] }).success).toBe(false)
  })

  describe('NONE mutual exclusivity', () => {
    it('rejects aidType set alongside NONE', () => {
      const result = incidentMutualAidTabSchema.safeParse({ aidDirection: AID_NONE, aidType: 'SUPPORT_AID' })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'aidType')).toBe(true)
    })

    it('rejects aidDepartmentNames set alongside NONE', () => {
      const result = incidentMutualAidTabSchema.safeParse({ aidDirection: AID_NONE, aidDepartmentNames: ['Neighboring FD'] })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'aidDepartmentNames')).toBe(true)
    })

    it('rejects aidNonFdTypes set alongside NONE', () => {
      const result = incidentMutualAidTabSchema.safeParse({ aidDirection: AID_NONE, aidNonFdTypes: ['LAW_ENFORCEMENT'] })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'aidNonFdTypes')).toBe(true)
    })
  })
})
