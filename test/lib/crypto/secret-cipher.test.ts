import { beforeEach, describe, expect, it } from 'vitest'
import { randomBytes } from 'crypto'
import { encryptSecret, decryptSecret } from '@/lib/crypto/secret-cipher'

beforeEach(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('encryptSecret / decryptSecret', () => {
  it('round-trips a plaintext secret', () => {
    const ciphertext = encryptSecret('vendor-client-secret-value')
    expect(decryptSecret(ciphertext)).toBe('vendor-client-secret-value')
  })

  it('produces different ciphertext for the same plaintext on repeated calls', () => {
    const first = encryptSecret('same-secret')
    const second = encryptSecret('same-secret')
    expect(first).not.toBe(second)
  })

  it('fails to decrypt with a different key', () => {
    const ciphertext = encryptSecret('vendor-client-secret-value')
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
    expect(() => decryptSecret(ciphertext)).toThrow()
  })

  it('throws when ENCRYPTION_KEY is unset', () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encryptSecret('vendor-client-secret-value')).toThrow(/ENCRYPTION_KEY/)
  })

  it('throws when ENCRYPTION_KEY does not decode to 32 bytes', () => {
    process.env.ENCRYPTION_KEY = Buffer.from('too-short').toString('base64')
    expect(() => encryptSecret('vendor-client-secret-value')).toThrow(/32 bytes/)
  })
})
