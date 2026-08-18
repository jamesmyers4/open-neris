import { describe, expect, it } from 'vitest'
import { applyTemplate } from '@/lib/incidents/generate-internal-id'

describe('applyTemplate', () => {
  it('substitutes {year}', () => {
    expect(applyTemplate('{year}-INC', 2026, 1)).toBe('2026-INC')
  })

  it('substitutes {seq} with no padding', () => {
    expect(applyTemplate('INC-{seq}', 2026, 42)).toBe('INC-42')
  })

  it('substitutes {seq:N} with zero-padding to width N', () => {
    expect(applyTemplate('{seq:6}', 2026, 42)).toBe('000042')
  })

  it('does not truncate when the sequence is wider than the padding width', () => {
    expect(applyTemplate('{seq:3}', 2026, 123456)).toBe('123456')
  })

  it('combines {year} and {seq:N} together', () => {
    expect(applyTemplate('{year}-{seq:6}', 2026, 7)).toBe('2026-000007')
  })

  it('substitutes multiple occurrences of the same placeholder', () => {
    expect(applyTemplate('{year}/{year}', 2026, 1)).toBe('2026/2026')
  })

  it('leaves a template with no placeholders untouched', () => {
    expect(applyTemplate('STATIC-ID', 2026, 1)).toBe('STATIC-ID')
  })

  it('leaves unrecognized placeholder-like text untouched', () => {
    expect(applyTemplate('{month}-{seq}', 2026, 1)).toBe('{month}-1')
  })

  it('handles seq:0 as no padding', () => {
    expect(applyTemplate('{seq:0}', 2026, 5)).toBe('5')
  })
})
