import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { checkIncidentCompleteness, type ModuleCheck } from '@/lib/validation/incident-completeness'

const requiredString = z.object({ value: z.string().min(1) })

describe('checkIncidentCompleteness', () => {
  it('is complete when there are no checks', () => {
    const result = checkIncidentCompleteness([], [])
    expect(result).toEqual({ complete: true, missing: [] })
  })

  it('is complete when a core check passes', () => {
    const checks: ModuleCheck[] = [{ module: 'core', schema: requiredString, data: { value: 'ok' } }]
    expect(checkIncidentCompleteness([], checks)).toEqual({ complete: true, missing: [] })
  })

  it('reports a missing field for a failing core check, with module/path/message', () => {
    const checks: ModuleCheck[] = [{ module: 'core', schema: requiredString, data: { value: '' } }]
    const result = checkIncidentCompleteness([], checks)
    expect(result.complete).toBe(false)
    expect(result.missing).toEqual([
      { module: 'core', path: 'value', message: expect.any(String) }
    ])
  })

  it('always runs core checks regardless of incident type', () => {
    const checks: ModuleCheck[] = [{ module: 'core', schema: requiredString, data: { value: '' } }]
    expect(checkIncidentCompleteness([{ value1: 'RESCUE' }], checks).complete).toBe(false)
  })

  it('runs a check for an always-relevant module even with no types set', () => {
    const checks: ModuleCheck[] = [{ module: 'exposures', schema: requiredString, data: { value: '' } }]
    expect(checkIncidentCompleteness([], checks).complete).toBe(false)
  })

  it('skips a check for a module that is not relevant to the given types', () => {
    const checks: ModuleCheck[] = [{ module: 'fire', schema: requiredString, data: { value: '' } }]
    // No FIRE type present, so the fire module isn't relevant — its failing data is ignored.
    const result = checkIncidentCompleteness([{ value1: 'MEDICAL' }], checks)
    expect(result).toEqual({ complete: true, missing: [] })
  })

  it('runs a check for a module that is relevant to the given types', () => {
    const checks: ModuleCheck[] = [{ module: 'fire', schema: requiredString, data: { value: '' } }]
    const result = checkIncidentCompleteness([{ value1: 'FIRE' }], checks)
    expect(result.complete).toBe(false)
    expect(result.missing[0].module).toBe('fire')
  })

  it('collects every issue when a single schema fails on multiple fields', () => {
    const schema = z.object({ a: z.string().min(1), b: z.string().min(1) })
    const checks: ModuleCheck[] = [{ module: 'core', schema, data: { a: '', b: '' } }]
    const result = checkIncidentCompleteness([], checks)
    expect(result.complete).toBe(false)
    expect(result.missing).toHaveLength(2)
    expect(result.missing.map(m => m.path).sort()).toEqual(['a', 'b'])
  })

  it('aggregates missing fields across multiple checks, relevant and irrelevant mixed', () => {
    const checks: ModuleCheck[] = [
      { module: 'core', schema: requiredString, data: { value: '' } },
      { module: 'exposures', schema: requiredString, data: { value: 'ok' } },
      { module: 'fire', schema: requiredString, data: { value: '' } } // irrelevant, no FIRE type
    ]
    const result = checkIncidentCompleteness([{ value1: 'MEDICAL' }], checks)
    expect(result.complete).toBe(false)
    expect(result.missing).toHaveLength(1)
    expect(result.missing[0].module).toBe('core')
  })
})
