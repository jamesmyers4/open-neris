import { describe, expect, it } from 'vitest'
import {
  incidentRescueFfSchema,
  incidentRescueNonFfSchema,
  incidentRescueFfRequiredSchema,
  incidentRescueNonFfRequiredSchema
} from '@/lib/validation/incident-rescue.schema'

function validFf(overrides: Record<string, unknown> = {}) {
  return {
    rescueType: 'NO_RESCUE_NEEDED',
    mayday: false,
    linkedUnitId: 'ENGINE_1',
    casualtyType: 'UNINJURED',
    ...overrides
  }
}

function validNonFf(overrides: Record<string, unknown> = {}) {
  return {
    rescueType: 'NO_RESCUE_NEEDED',
    casualtyType: 'UNINJURED',
    ...overrides
  }
}

describe('incidentRescueFfSchema', () => {
  it('accepts a minimal valid record', () => {
    expect(incidentRescueFfSchema.safeParse(validFf()).success).toBe(true)
  })

  it('rejects a missing rescueType', () => {
    expect(incidentRescueFfSchema.safeParse(validFf({ rescueType: undefined })).success).toBe(false)
  })

  it('rejects a missing mayday', () => {
    expect(incidentRescueFfSchema.safeParse(validFf({ mayday: undefined })).success).toBe(false)
  })

  it('rejects a missing linkedUnitId', () => {
    expect(incidentRescueFfSchema.safeParse(validFf({ linkedUnitId: undefined })).success).toBe(false)
  })

  it('rejects a missing casualtyType (ff_casualty_type is neris_core=TRUE, unconditional)', () => {
    expect(incidentRescueFfSchema.safeParse(validFf({ casualtyType: undefined })).success).toBe(false)
  })

  it('accepts casualtyType of UNINJURED (the always-answerable default)', () => {
    expect(incidentRescueFfSchema.safeParse(validFf({ casualtyType: 'UNINJURED' })).success).toBe(true)
  })
})

describe('incidentRescueNonFfSchema', () => {
  it('accepts a minimal valid record', () => {
    expect(incidentRescueNonFfSchema.safeParse(validNonFf()).success).toBe(true)
  })

  it('rejects a missing rescueType (nonff_rescue_type is neris_core=TRUE, unconditional)', () => {
    expect(incidentRescueNonFfSchema.safeParse(validNonFf({ rescueType: undefined })).success).toBe(false)
  })

  it('rejects a missing casualtyType (nonff_casualty_casualty_type is neris_core=TRUE, unconditional)', () => {
    expect(incidentRescueNonFfSchema.safeParse(validNonFf({ casualtyType: undefined })).success).toBe(false)
  })
})

describe('incidentRescueFfRequiredSchema', () => {
  it('accepts an empty rescuesFf array (no cardinality requirement — most incidents have zero rescues)', () => {
    expect(incidentRescueFfRequiredSchema.safeParse({ rescuesFf: [] }).success).toBe(true)
  })

  it('validates each row against the same rules as incidentRescueFfSchema', () => {
    const result = incidentRescueFfRequiredSchema.safeParse({ rescuesFf: [validFf({ casualtyType: undefined })] })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'rescuesFf.0.casualtyType')).toBe(true)
  })
})

describe('incidentRescueNonFfRequiredSchema', () => {
  it('accepts an empty rescuesNonFf array (no cardinality requirement)', () => {
    expect(incidentRescueNonFfRequiredSchema.safeParse({ rescuesNonFf: [] }).success).toBe(true)
  })

  it('validates each row against the same rules as incidentRescueNonFfSchema', () => {
    const result = incidentRescueNonFfRequiredSchema.safeParse({ rescuesNonFf: [validNonFf({ rescueType: undefined })] })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'rescuesNonFf.0.rescueType')).toBe(true)
  })
})
