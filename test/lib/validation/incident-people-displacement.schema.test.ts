import { describe, expect, it } from 'vitest'
import {
  incidentPeopleDisplacementTabSchema,
  incidentDisplacementSchema
} from '@/lib/validation/incident-people-displacement.schema'

describe('incidentPeopleDisplacementTabSchema', () => {
  it('accepts an empty payload (both fields optional)', () => {
    expect(incidentPeopleDisplacementTabSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a fully populated payload', () => {
    const result = incidentPeopleDisplacementTabSchema.safeParse({
      incidentPeoplePresent: true,
      incidentRescueAnimal: 2
    })
    expect(result.success).toBe(true)
  })

  it('rejects a negative incidentRescueAnimal', () => {
    expect(incidentPeopleDisplacementTabSchema.safeParse({ incidentRescueAnimal: -1 }).success).toBe(false)
  })

  it('rejects a non-integer incidentRescueAnimal', () => {
    expect(incidentPeopleDisplacementTabSchema.safeParse({ incidentRescueAnimal: 1.5 }).success).toBe(false)
  })
})

describe('incidentDisplacementSchema', () => {
  it('accepts one or more valid causes', () => {
    expect(incidentDisplacementSchema.safeParse({ causes: ['FIRE'] }).success).toBe(true)
    expect(incidentDisplacementSchema.safeParse({ causes: ['FIRE', 'SMOKE'] }).success).toBe(true)
  })

  it('rejects an empty causes array', () => {
    expect(incidentDisplacementSchema.safeParse({ causes: [] }).success).toBe(false)
  })

  it('rejects a missing causes field', () => {
    expect(incidentDisplacementSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an unrecognized cause enum value', () => {
    expect(incidentDisplacementSchema.safeParse({ causes: ['ALIEN_INVASION'] }).success).toBe(false)
  })
})
