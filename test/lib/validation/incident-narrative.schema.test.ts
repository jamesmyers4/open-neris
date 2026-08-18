import { describe, expect, it } from 'vitest'
import { incidentNarrativeTabSchema, incidentNarrativeRequiredSchema } from '@/lib/validation/incident-narrative.schema'

describe('incidentNarrativeTabSchema', () => {
  it('accepts an empty payload (both fields optional)', () => {
    expect(incidentNarrativeTabSchema.safeParse({}).success).toBe(true)
  })

  it('accepts populated narrative fields', () => {
    const result = incidentNarrativeTabSchema.safeParse({
      narrativeImpediment: 'Locked gate delayed access',
      narrativeOutcome: 'Fire extinguished, no injuries'
    })
    expect(result.success).toBe(true)
  })

  it('rejects narrativeImpediment over 100,000 characters', () => {
    expect(incidentNarrativeTabSchema.safeParse({ narrativeImpediment: 'a'.repeat(100_001) }).success).toBe(false)
  })

  it('rejects narrativeOutcome over 100,000 characters', () => {
    expect(incidentNarrativeTabSchema.safeParse({ narrativeOutcome: 'a'.repeat(100_001) }).success).toBe(false)
  })
})

describe('incidentNarrativeRequiredSchema', () => {
  it('accepts both fields non-empty', () => {
    const result = incidentNarrativeRequiredSchema.safeParse({
      narrativeImpediment: 'None',
      narrativeOutcome: 'Resolved'
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty narrativeImpediment', () => {
    expect(incidentNarrativeRequiredSchema.safeParse({ narrativeImpediment: '', narrativeOutcome: 'Resolved' }).success).toBe(false)
  })

  it('rejects an empty narrativeOutcome', () => {
    expect(incidentNarrativeRequiredSchema.safeParse({ narrativeImpediment: 'None', narrativeOutcome: '' }).success).toBe(false)
  })

  it('rejects a null narrativeOutcome', () => {
    expect(incidentNarrativeRequiredSchema.safeParse({ narrativeImpediment: 'None', narrativeOutcome: null }).success).toBe(false)
  })

  it('rejects missing fields entirely', () => {
    expect(incidentNarrativeRequiredSchema.safeParse({}).success).toBe(false)
  })
})
