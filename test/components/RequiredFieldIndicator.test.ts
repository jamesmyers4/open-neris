import { describe, expect, it } from 'vitest'
import { RequiredFieldIndicator } from '@/components/RequiredFieldIndicator'

describe('RequiredFieldIndicator', () => {
  it('renders nothing when show is false', () => {
    expect(RequiredFieldIndicator({ show: false, hint: 'required to submit' })).toBeNull()
  })

  it('renders a marker with the hint when show is true', () => {
    const element = RequiredFieldIndicator({ show: true, hint: 'required to submit' })
    expect(element).not.toBeNull()
  })

  it('marks the marker aria-hidden so it never pollutes an associated label field\'s accessible name', () => {
    const element = RequiredFieldIndicator({ show: true, hint: 'required to submit' })
    expect(element?.props['aria-hidden']).toBe('true')
  })

  it('includes the given hint text somewhere in the rendered tree', () => {
    const element = RequiredFieldIndicator({ show: true, hint: 'pick a reason, or add an action taken below' })
    const serialized = JSON.stringify(element)
    expect(serialized).toContain('pick a reason, or add an action taken below')
  })
})
