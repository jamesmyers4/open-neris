import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@clerk/nextjs/server', () => ({ currentUser: vi.fn() }))
vi.mock('@/lib/onboarding/resolve-department-signup', () => ({ resolveDepartmentSignup: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { resolveDepartmentSignup } from '@/lib/onboarding/resolve-department-signup'
import { isDeactivatedClerkUser } from '@/lib/auth/current-user'
import { submitOnboarding } from '@/app/onboarding/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'

const mockCurrentUser = vi.mocked(currentUser)
const mockResolveDepartmentSignup = vi.mocked(resolveDepartmentSignup)
const mockIsDeactivatedClerkUser = vi.mocked(isDeactivatedClerkUser)

function fakeClerkUser(overrides: Partial<{ id: string; firstName: string | null; lastName: string | null; email: string | null }> = {}) {
  const { id = 'clerk_new_1', firstName = 'Jamie', lastName = 'Smith', email = 'jamie@example.com' } = overrides
  return {
    id,
    firstName,
    lastName,
    primaryEmailAddress: email ? { emailAddress: email } : null
  } as never
}

function validFormData() {
  const fd = new FormData()
  fd.set('departmentName', 'Metro Fire')
  fd.set('city', 'Metro')
  fd.set('state', 'NY')
  return fd
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('submitOnboarding', () => {
  it('returns a message when there is no Clerk session at all', async () => {
    mockCurrentUser.mockResolvedValue(null)
    const result = await submitOnboarding({}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockResolveDepartmentSignup).not.toHaveBeenCalled()
  })

  it('redirects to /incidents without calling resolveDepartmentSignup when an app User row already exists', async () => {
    mockCurrentUser.mockResolvedValue(fakeClerkUser())
    mockSignedInAs()

    await submitOnboarding({}, validFormData())

    expect(redirect).toHaveBeenCalledWith('/incidents')
    expect(mockResolveDepartmentSignup).not.toHaveBeenCalled()
  })

  it('returns a message and never calls resolveDepartmentSignup for a deactivated account', async () => {
    mockCurrentUser.mockResolvedValue(fakeClerkUser())
    mockSignedOut()
    mockIsDeactivatedClerkUser.mockResolvedValue(true)

    const result = await submitOnboarding({}, validFormData())

    expect(result.message).toMatch(/deactivated/i)
    expect(mockResolveDepartmentSignup).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('returns a message when the Clerk account has no primary email', async () => {
    mockCurrentUser.mockResolvedValue(fakeClerkUser({ email: null }))
    mockSignedOut()

    const result = await submitOnboarding({}, validFormData())

    expect(result.message).toMatch(/email/i)
    expect(mockResolveDepartmentSignup).not.toHaveBeenCalled()
  })

  it('returns fieldErrors for a missing departmentName without calling resolveDepartmentSignup', async () => {
    mockCurrentUser.mockResolvedValue(fakeClerkUser())
    mockSignedOut()
    const fd = new FormData()
    fd.set('city', 'Metro')
    fd.set('state', 'NY')

    const result = await submitOnboarding({}, fd)

    expect(result.errors?.departmentName).toBeDefined()
    expect(mockResolveDepartmentSignup).not.toHaveBeenCalled()
  })

  it('calls resolveDepartmentSignup with the parsed input and a signer derived from the Clerk profile', async () => {
    mockCurrentUser.mockResolvedValue(fakeClerkUser({ id: 'clerk_new_1', firstName: 'Jamie', lastName: 'Smith', email: 'jamie@example.com' }))
    mockSignedOut()
    mockResolveDepartmentSignup.mockResolvedValue({ outcome: 'CREATED', departmentId: 'dept_1', userId: 'user_1' })

    await submitOnboarding({}, validFormData())

    expect(mockResolveDepartmentSignup).toHaveBeenCalledWith(
      {},
      { departmentName: 'Metro Fire', city: 'Metro', state: 'NY' },
      { clerkId: 'clerk_new_1', name: 'Jamie Smith', email: 'jamie@example.com' }
    )
  })

  it('redirects to /incidents on a CREATED outcome', async () => {
    mockCurrentUser.mockResolvedValue(fakeClerkUser())
    mockSignedOut()
    mockResolveDepartmentSignup.mockResolvedValue({ outcome: 'CREATED', departmentId: 'dept_1', userId: 'user_1' })

    await submitOnboarding({}, validFormData())

    expect(redirect).toHaveBeenCalledWith('/incidents')
  })

  it('redirects to /incidents on a CLAIMED outcome', async () => {
    mockCurrentUser.mockResolvedValue(fakeClerkUser())
    mockSignedOut()
    mockResolveDepartmentSignup.mockResolvedValue({ outcome: 'CLAIMED', departmentId: 'dept_1', userId: 'user_1' })

    await submitOnboarding({}, validFormData())

    expect(redirect).toHaveBeenCalledWith('/incidents')
  })

  it('returns the admin\'s contact info without redirecting on a CONTACT_ADMIN outcome', async () => {
    mockCurrentUser.mockResolvedValue(fakeClerkUser())
    mockSignedOut()
    mockResolveDepartmentSignup.mockResolvedValue({
      outcome: 'CONTACT_ADMIN',
      admin: { name: 'Existing Admin', email: 'admin@example.com' }
    })

    const result = await submitOnboarding({}, validFormData())

    expect(result.contactAdmin).toEqual({ name: 'Existing Admin', email: 'admin@example.com' })
    expect(redirect).not.toHaveBeenCalled()
  })
})
