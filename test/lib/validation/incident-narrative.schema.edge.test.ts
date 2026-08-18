import { describe, expect, it } from 'vitest'
import { incidentNarrativeTabSchema, incidentNarrativeRequiredSchema } from '@/lib/validation/incident-narrative.schema'

// Phase 5: edge/negative/boundary, beyond Phase 1's core-case coverage.
describe('incidentNarrativeTabSchema — boundary', () => {
  it('accepts narrativeImpediment of exactly 100,000 characters', () => {
    expect(incidentNarrativeTabSchema.safeParse({ narrativeImpediment: 'a'.repeat(100_000) }).success).toBe(true)
  })

  it('rejects narrativeImpediment of exactly 100,001 characters', () => {
    expect(incidentNarrativeTabSchema.safeParse({ narrativeImpediment: 'a'.repeat(100_001) }).success).toBe(false)
  })

  it('accepts an empty-string narrativeImpediment (optional, no min(1))', () => {
    expect(incidentNarrativeTabSchema.safeParse({ narrativeImpediment: '' }).success).toBe(true)
  })
})

describe('incidentNarrativeRequiredSchema — boundary', () => {
  it('accepts whitespace-only fields (min(1) does not trim)', () => {
    const result = incidentNarrativeRequiredSchema.safeParse({ narrativeImpediment: '   ', narrativeOutcome: '   ' })
    expect(result.success).toBe(true)
  })

  it('rejects a non-string narrativeOutcome (e.g. a number)', () => {
    expect(incidentNarrativeRequiredSchema.safeParse({ narrativeImpediment: 'None', narrativeOutcome: 42 }).success).toBe(false)
  })
})
