import { vi } from 'vitest'

// Every mutating server action calls revalidatePath() (or redirect(), on the
// two create-and-navigate actions), and both throw an "Invariant: static
// generation store missing" style error outside a real Next.js request
// context — confirmed empirically, not just documented in TEST-PLAN's
// redirect() gotcha. Mocked globally as plain spies (not throwing stand-ins)
// so every Phase 3+ action test can assert the call target directly —
// `expect(redirect).toHaveBeenCalledWith(path)` — without also having to
// catch a thrown NEXT_REDIRECT signal on every happy-path test. Per-test
// `vi.resetAllMocks()` clears these between tests along with the prisma
// mock, so each test file's beforeEach must re-run without needing any
// standing implementation here.
vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))
