import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { missingPaths } from '@/lib/validation/missing-paths'

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().nonnegative()
})

describe('missingPaths', () => {
  it('returns an empty set when the data satisfies the schema', () => {
    expect(missingPaths(schema, { name: 'Engine 1', age: 5 })).toEqual(new Set())
  })

  it('returns the dot-joined path of every failing field', () => {
    expect(missingPaths(schema, { name: '', age: -1 })).toEqual(new Set(['name', 'age']))
  })

  it('joins nested/array paths with dots, matching getSubmitCompleteness issue paths', () => {
    const nested = z.object({ rows: z.array(z.object({ value: z.string().min(1) })) })
    expect(missingPaths(nested, { rows: [{ value: '' }] })).toEqual(new Set(['rows.0.value']))
  })
})
