import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomBytes } from 'crypto'
import { getAccessToken, submitIncident } from '@/lib/neris/api-client'
import { encryptSecret } from '@/lib/crypto/secret-cipher'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const CLIENT_SECRET = 'super-secret-value'
let clientSecretCipher: string
let clientIdCounter = 0
let CLIENT_ID: string

beforeEach(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
  clientSecretCipher = encryptSecret(CLIENT_SECRET)
  clientIdCounter += 1
  CLIENT_ID = `client_${clientIdCounter}`
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getAccessToken', () => {
  it('exchanges credentials for a bearer token via HTTP Basic auth and client_credentials', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(jsonResponse(200, { access_token: 'token-1', expires_in: 3600, token_type: 'bearer' }))

    const token = await getAccessToken('SANDBOX', CLIENT_ID, clientSecretCipher)

    expect(token).toBe('token-1')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api-test.neris.fsri.org/v1/token')
    expect(init?.method).toBe('POST')
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`)
    expect(String(init?.body)).toBe('grant_type=client_credentials')
  })

  it('caches the token and does not re-authenticate on a second call within the TTL', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(jsonResponse(200, { access_token: 'token-1', expires_in: 3600, token_type: 'bearer' }))

    await getAccessToken('SANDBOX', CLIENT_ID, clientSecretCipher)
    await getAccessToken('SANDBOX', CLIENT_ID, clientSecretCipher)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws NerisApiError with no secret in the message on a failed exchange', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'invalid_client' }))

    await expect(getAccessToken('SANDBOX', CLIENT_ID, clientSecretCipher)).rejects.toMatchObject({ name: 'NerisApiError', status: 401 })
    await expect(getAccessToken('SANDBOX', CLIENT_ID, clientSecretCipher)).rejects.not.toMatchObject({ message: expect.stringContaining(CLIENT_SECRET) })
  })

  it('propagates a network failure as a rejection', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockRejectedValue(new Error('fetch failed'))

    await expect(getAccessToken('SANDBOX', CLIENT_ID, clientSecretCipher)).rejects.toThrow('fetch failed')
  })
})

describe('submitIncident', () => {
  it('submits the payload with a bearer token and returns the parsed response', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'token-1', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(201, { neris_id: 'FD12345678|abc|123', incident_status: { status: 'PENDING_INCIDENT_DATA', last_modified: 'x', created_by: 'y' } }))

    const result = await submitIncident('SANDBOX', CLIENT_ID, clientSecretCipher, 'FD24027334', { base: {} })

    expect(result.status).toBe(201)
    expect(result.body).toMatchObject({ neris_id: 'FD12345678|abc|123' })
    const submitCall = fetchMock.mock.calls[1]
    expect(submitCall[0]).toBe('https://api-test.neris.fsri.org/v1/incident/FD24027334')
    const headers = submitCall[1]?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer token-1')
    expect(submitCall[1]?.body).toBe(JSON.stringify({ base: {} }))
  })

  it('retries once with a fresh token on a 401, then returns the retried response', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'token-1', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(401, { error: 'invalid_grant' }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'token-2', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(201, { neris_id: 'FD12345678|abc|124', incident_status: { status: 'PENDING_INCIDENT_DATA', last_modified: 'x', created_by: 'y' } }))

    const result = await submitIncident('SANDBOX', CLIENT_ID, clientSecretCipher, 'FD24027334', { base: {} })

    expect(result.status).toBe(201)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    const finalSubmitHeaders = fetchMock.mock.calls[3][1]?.headers as Record<string, string>
    expect(finalSubmitHeaders.Authorization).toBe('Bearer token-2')
  })

  it('returns a 422 response body for a validation error instead of throwing', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'token-1', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(422, { detail: [{ loc: ['body', 'base'], msg: 'field required', type: 'missing' }] }))

    const result = await submitIncident('SANDBOX', CLIENT_ID, clientSecretCipher, 'FD24027334', { base: {} })

    expect(result.status).toBe(422)
    expect(result.body).toMatchObject({ detail: [expect.objectContaining({ msg: 'field required' })] })
  })

  it('propagates a network failure as a rejection', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'token-1', expires_in: 3600 }))
      .mockRejectedValueOnce(new Error('network down'))

    await expect(submitIncident('SANDBOX', CLIENT_ID, clientSecretCipher, 'FD24027334', { base: {} })).rejects.toThrow('network down')
  })
})
