import { describe, expect, it } from 'vitest'
import { getRelevantModules, isModuleRelevant, type ModuleKey } from '@/lib/neris/module-relevance'

// Verified against vendor/neris-framework's core_mod_incident.csv `possible_if` column:
// exposure, unit_response, rescue_ff, rescue_nonff, emerging_hazard, and tactic_timestamps
// all have a blank possible_if there (unconditional on incident type).
const ALWAYS_RELEVANT: ModuleKey[] = ['exposures', 'unitResponse', 'rescuesFf', 'rescuesNonFf', 'emergingHazard', 'tacticTimestamps']

describe('getRelevantModules', () => {
  it('returns just the always-relevant baseline for an empty types array', () => {
    expect(getRelevantModules([])).toEqual(ALWAYS_RELEVANT)
  })

  it('adds fire for a FIRE-primary type with no STRUCTURE_FIRE value2', () => {
    const modules = getRelevantModules([{ value1: 'FIRE', value2: 'OUTSIDE_FIRE' }])
    expect(modules).toEqual(expect.arrayContaining([...ALWAYS_RELEVANT, 'fire']))
    expect(modules).not.toContain('riskReduction')
    expect(modules).not.toContain('medical')
    expect(modules).not.toContain('hazsit')
  })

  it('adds fire and riskReduction for FIRE with STRUCTURE_FIRE as value2', () => {
    const modules = getRelevantModules([{ value1: 'FIRE', value2: 'STRUCTURE_FIRE' }])
    expect(modules).toEqual(expect.arrayContaining([...ALWAYS_RELEVANT, 'fire', 'riskReduction']))
  })

  it('adds medical for a MEDICAL-only type', () => {
    const modules = getRelevantModules([{ value1: 'MEDICAL' }])
    expect(modules).toEqual(expect.arrayContaining([...ALWAYS_RELEVANT, 'medical']))
    expect(modules).not.toContain('fire')
    expect(modules).not.toContain('hazsit')
    expect(modules).not.toContain('riskReduction')
  })

  it('adds hazsit for a HAZSIT-only type', () => {
    const modules = getRelevantModules([{ value1: 'HAZSIT' }])
    expect(modules).toEqual(expect.arrayContaining([...ALWAYS_RELEVANT, 'hazsit']))
    expect(modules).not.toContain('fire')
    expect(modules).not.toContain('medical')
  })

  it('does not add fire/medical/hazsit/riskReduction for an unrelated type', () => {
    const modules = getRelevantModules([{ value1: 'RESCUE' }])
    expect(modules).toEqual(ALWAYS_RELEVANT)
  })

  it('combines modules across up to 3 type rows, not just the primary', () => {
    const modules = getRelevantModules([
      { value1: 'MEDICAL' },
      { value1: 'FIRE', value2: 'STRUCTURE_FIRE' },
      { value1: 'HAZSIT' }
    ])
    expect(modules).toEqual(expect.arrayContaining([...ALWAYS_RELEVANT, 'fire', 'medical', 'hazsit', 'riskReduction']))
  })

  it('does not duplicate always-relevant entries when multiple rows share a value1', () => {
    const modules = getRelevantModules([{ value1: 'FIRE' }, { value1: 'FIRE', value2: 'STRUCTURE_FIRE' }])
    expect(modules.filter(m => m === 'fire')).toHaveLength(1)
    expect(modules.filter(m => m === 'riskReduction')).toHaveLength(1)
  })
})

describe('isModuleRelevant', () => {
  it('is true for an always-relevant module regardless of type', () => {
    expect(isModuleRelevant([], 'exposures')).toBe(true)
    expect(isModuleRelevant([], 'tacticTimestamps')).toBe(true)
  })

  it('is false for fire when no type includes FIRE', () => {
    expect(isModuleRelevant([{ value1: 'MEDICAL' }], 'fire')).toBe(false)
  })

  it('is true for fire when a type includes FIRE', () => {
    expect(isModuleRelevant([{ value1: 'FIRE' }], 'fire')).toBe(true)
  })

  it('is false for riskReduction unless STRUCTURE_FIRE is the value2', () => {
    expect(isModuleRelevant([{ value1: 'FIRE', value2: 'OUTSIDE_FIRE' }], 'riskReduction')).toBe(false)
    expect(isModuleRelevant([{ value1: 'FIRE', value2: 'STRUCTURE_FIRE' }], 'riskReduction')).toBe(true)
  })
})
