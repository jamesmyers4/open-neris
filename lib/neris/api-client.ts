import { decryptSecret } from '@/lib/crypto/secret-cipher'

export type NerisEnvironment = 'SANDBOX' | 'PRODUCTION'

const SANDBOX_BASE_URL = 'https://api-test.neris.fsri.org/v1'
const PRODUCTION_BASE_URL = process.env.NERIS_PRODUCTION_BASE_URL ?? 'https://api.neris.fsri.org/v1'
const TOKEN_EXPIRY_SAFETY_MARGIN_MS = 30_000

function baseUrlFor(environment: NerisEnvironment): string {
  return environment === 'PRODUCTION' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL
}

export class NerisApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'NerisApiError'
    this.status = status
    this.body = body
  }
}

type TokenCacheEntry = { accessToken: string; expiresAt: number }

const tokenCache = new Map<string, TokenCacheEntry>()

async function fetchToken(environment: NerisEnvironment, clientId: string, clientSecret: string): Promise<TokenCacheEntry> {
  const response = await fetch(`${baseUrlFor(environment)}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  })

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok || !body || typeof (body as { access_token?: unknown }).access_token !== 'string') {
    throw new NerisApiError('Failed to obtain a NERIS access token', response.status, body)
  }

  const parsed = body as { access_token: string; expires_in?: number }
  const expiresInMs = (typeof parsed.expires_in === 'number' ? parsed.expires_in : 300) * 1000

  return { accessToken: parsed.access_token, expiresAt: Date.now() + expiresInMs - TOKEN_EXPIRY_SAFETY_MARGIN_MS }
}

export async function getAccessToken(environment: NerisEnvironment, clientId: string, clientSecretCipher: string, forceRefresh = false): Promise<string> {
  const cacheKey = `${environment}:${clientId}`
  const cached = tokenCache.get(cacheKey)
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.accessToken
  }

  const clientSecret = decryptSecret(clientSecretCipher)
  const entry = await fetchToken(environment, clientId, clientSecret)
  tokenCache.set(cacheKey, entry)
  return entry.accessToken
}

export type NerisSubmitResult = { status: number; body: unknown }

export async function submitIncident(
  environment: NerisEnvironment,
  clientId: string,
  clientSecretCipher: string,
  nerisIdEntity: string,
  payload: Record<string, unknown>
): Promise<NerisSubmitResult> {
  const call = async (accessToken: string) =>
    fetch(`${baseUrlFor(environment)}/incident/${nerisIdEntity}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    })

  let accessToken = await getAccessToken(environment, clientId, clientSecretCipher)
  let response = await call(accessToken)

  if (response.status === 401) {
    accessToken = await getAccessToken(environment, clientId, clientSecretCipher, true)
    response = await call(accessToken)
  }

  const body: unknown = await response.json().catch(() => null)
  return { status: response.status, body }
}
