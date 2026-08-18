import { describe, expect, it } from 'vitest'
import { incidentLocationTabSchema, incidentLocationRequiredSchema } from '@/lib/validation/incident-location.schema'
import { locationUseOptions, locPlaceOptions } from '@/lib/neris/lookups'

const validStreetState = { streetAddressComplete: '123 Main St', state: 'NY' }

const useOption = locationUseOptions[0]
const mismatchedSubtype = locationUseOptions.find(o => o.value1 !== useOption.value1)!.value2
const placeValue = locPlaceOptions[0].value

describe('incidentLocationTabSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(incidentLocationTabSchema.safeParse(validStreetState).success).toBe(true)
  })

  it('rejects a missing streetAddressComplete', () => {
    expect(incidentLocationTabSchema.safeParse({ state: 'NY' }).success).toBe(false)
  })

  it('rejects a state that is not 2 characters', () => {
    expect(incidentLocationTabSchema.safeParse({ ...validStreetState, state: 'New York' }).success).toBe(false)
  })

  it('defaults country to US', () => {
    const result = incidentLocationTabSchema.safeParse(validStreetState)
    expect(result.success && result.data.country).toBe('US')
  })

  it('accepts a real place value', () => {
    expect(incidentLocationTabSchema.safeParse({ ...validStreetState, place: placeValue }).success).toBe(true)
  })

  it('rejects an unrecognized place value', () => {
    expect(incidentLocationTabSchema.safeParse({ ...validStreetState, place: 'NOT_A_REAL_PLACE' }).success).toBe(false)
  })

  it('accepts a real useType', () => {
    expect(incidentLocationTabSchema.safeParse({ ...validStreetState, useType: useOption.value1 }).success).toBe(true)
  })

  it('rejects an unrecognized useType', () => {
    expect(incidentLocationTabSchema.safeParse({ ...validStreetState, useType: 'NOT_A_REAL_USE_TYPE' }).success).toBe(false)
  })

  it('rejects a useSubtype given without a useType', () => {
    const result = incidentLocationTabSchema.safeParse({ ...validStreetState, useSubtype: useOption.value2 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'useSubtype')).toBe(true)
  })

  it('accepts a valid useType/useSubtype pair', () => {
    const result = incidentLocationTabSchema.safeParse({
      ...validStreetState,
      useType: useOption.value1,
      useSubtype: useOption.value2
    })
    expect(result.success).toBe(true)
  })

  it('rejects a useSubtype that does not belong to the given useType', () => {
    const result = incidentLocationTabSchema.safeParse({
      ...validStreetState,
      useType: useOption.value1,
      useSubtype: mismatchedSubtype
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(i => i.path.join('.') === 'useSubtype')).toBe(true)
  })

  it('rejects an unrecognized useVacancy enum value', () => {
    expect(incidentLocationTabSchema.safeParse({ ...validStreetState, useVacancy: 'HAUNTED' }).success).toBe(false)
  })
})

describe('incidentLocationRequiredSchema', () => {
  it('accepts a valid street/state pair', () => {
    expect(incidentLocationRequiredSchema.safeParse(validStreetState).success).toBe(true)
  })

  it('rejects a missing streetAddressComplete', () => {
    expect(incidentLocationRequiredSchema.safeParse({ state: 'NY' }).success).toBe(false)
  })

  it('rejects a null streetAddressComplete', () => {
    expect(incidentLocationRequiredSchema.safeParse({ streetAddressComplete: null, state: 'NY' }).success).toBe(false)
  })

  it('rejects a missing state', () => {
    expect(incidentLocationRequiredSchema.safeParse({ streetAddressComplete: '123 Main St' }).success).toBe(false)
  })
})
