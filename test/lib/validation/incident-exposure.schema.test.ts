import { describe, expect, it } from 'vitest'
import { incidentExposureSchema } from '@/lib/validation/incident-exposure.schema'

function validExposure(overrides: Record<string, unknown> = {}) {
  return {
    exposureType: 'INTERNAL_EXPOSURE',
    exposureDamage: 'MINOR_DAMAGE',
    ...overrides
  }
}

describe('incidentExposureSchema', () => {
  it('accepts a minimal internal exposure without an exposureItem', () => {
    expect(incidentExposureSchema.safeParse(validExposure()).success).toBe(true)
  })

  it('rejects a missing exposureType', () => {
    expect(incidentExposureSchema.safeParse(validExposure({ exposureType: undefined })).success).toBe(false)
  })

  it('rejects a missing exposureDamage', () => {
    expect(incidentExposureSchema.safeParse(validExposure({ exposureDamage: undefined })).success).toBe(false)
  })

  it('rejects an unrecognized exposureType enum value', () => {
    expect(incidentExposureSchema.safeParse(validExposure({ exposureType: 'FROM_OUTER_SPACE' })).success).toBe(false)
  })

  it('rejects an unrecognized exposureDamage enum value', () => {
    expect(incidentExposureSchema.safeParse(validExposure({ exposureDamage: 'TOTALED' })).success).toBe(false)
  })

  it('rejects an unrecognized exposureDisplacedCauses value', () => {
    expect(incidentExposureSchema.safeParse(validExposure({ exposureDisplacedCauses: ['ALIENS'] })).success).toBe(false)
  })

  it('rejects a negative exposureDisplacedNumber', () => {
    expect(incidentExposureSchema.safeParse(validExposure({ exposureDisplacedNumber: -1 })).success).toBe(false)
  })

  it('rejects a non-integer exposureDisplacedNumber', () => {
    expect(incidentExposureSchema.safeParse(validExposure({ exposureDisplacedNumber: 2.5 })).success).toBe(false)
  })

  it('accepts an exposureDisplacedNumber of exactly 0', () => {
    expect(incidentExposureSchema.safeParse(validExposure({ exposureDisplacedNumber: 0 })).success).toBe(true)
  })

  describe('exposureItem, required only for EXTERNAL_EXPOSURE', () => {
    it('accepts INTERNAL_EXPOSURE with no exposureItem', () => {
      const result = incidentExposureSchema.safeParse(validExposure({ exposureType: 'INTERNAL_EXPOSURE' }))
      expect(result.success).toBe(true)
    })

    it('accepts INTERNAL_EXPOSURE even if exposureItem happens to be set', () => {
      const result = incidentExposureSchema.safeParse(
        validExposure({ exposureType: 'INTERNAL_EXPOSURE', exposureItem: 'STRUCTURE' })
      )
      expect(result.success).toBe(true)
    })

    it('rejects EXTERNAL_EXPOSURE with no exposureItem', () => {
      const result = incidentExposureSchema.safeParse(validExposure({ exposureType: 'EXTERNAL_EXPOSURE' }))
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'exposureItem')).toBe(true)
    })

    it('accepts EXTERNAL_EXPOSURE with a valid exposureItem', () => {
      const result = incidentExposureSchema.safeParse(
        validExposure({ exposureType: 'EXTERNAL_EXPOSURE', exposureItem: 'VEHICLE' })
      )
      expect(result.success).toBe(true)
    })

    it('rejects an unrecognized exposureItem enum value', () => {
      const result = incidentExposureSchema.safeParse(
        validExposure({ exposureType: 'EXTERNAL_EXPOSURE', exposureItem: 'A_SPACESHIP' })
      )
      expect(result.success).toBe(false)
    })
  })
})
