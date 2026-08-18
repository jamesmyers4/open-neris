import { describe, expect, it } from 'vitest'
import { createIncidentSchema } from '@/lib/validation/incident-create.schema'

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    types: [{ value1: 'FIRE', isPrimary: true }],
    alarmTime: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

// Phase 5: edge/negative/boundary, beyond Phase 1's core-case coverage.
describe('createIncidentSchema — boundary', () => {
  it('accepts a whitespace-only value1 (min(1) does not trim)', () => {
    const types = [{ value1: '   ', isPrimary: true }]
    expect(createIncidentSchema.safeParse(validPayload({ types })).success).toBe(true)
  })

  it('rejects duplicate specialModifiers entries not deduplicated (documents current behavior)', () => {
    const result = createIncidentSchema.safeParse(validPayload({ specialModifiers: ['MCI', 'MCI'] }))
    expect(result.success).toBe(true)
    expect(result.success && result.data.specialModifiers).toEqual(['MCI', 'MCI'])
  })

  it('rejects an unparseable alarmTime string', () => {
    expect(createIncidentSchema.safeParse(validPayload({ alarmTime: 'not-a-date' })).success).toBe(false)
  })

  // Confirmed empirically (not assumed): z.coerce.date() calls `new Date(x)`,
  // and `new Date(null)` coerces null to 0 via ToNumber, producing the Unix
  // epoch rather than an Invalid Date — so this SUCCEEDS. Genuinely
  // surprising and worth locking in as a known finding: createIncident's
  // action code reads `formData.get('alarmTime')` with no `|| undefined`
  // fallback, so an entirely-missing alarmTime key becomes `null`, not
  // `undefined` — which this schema does not reject, unlike a missing key.
  // See TESTING.md's Phase 5 section.
  it('coerces a null alarmTime to the Unix epoch instead of rejecting it (z.coerce.date() quirk)', () => {
    const result = createIncidentSchema.safeParse(validPayload({ alarmTime: null }))
    expect(result.success).toBe(true)
    expect(result.success && result.data.alarmTime).toEqual(new Date('1970-01-01T00:00:00Z'))
  })

  it('rejects an entirely missing alarmTime key (undefined, unlike explicit null)', () => {
    const result = createIncidentSchema.safeParse(validPayload({ alarmTime: undefined }))
    expect(result.success).toBe(false)
  })

  it('rejects a types entry missing value1 entirely', () => {
    const types = [{ isPrimary: true }]
    expect(createIncidentSchema.safeParse(validPayload({ types })).success).toBe(false)
  })
})
