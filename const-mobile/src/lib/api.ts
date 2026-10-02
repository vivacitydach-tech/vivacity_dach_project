import { getApiUrl, getCompanyId, getToken, logout } from './auth'
import type { ApiErrorBody, ApiSuccess } from './types'

export class ApiClientError extends Error {
  code: string
  requestId: string
  status?: number

  constructor(
    message: string,
    code: string,
    requestId: string,
    status?: number,
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.requestId = requestId
    this.status = status
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  idempotencyKey?: string
  headers?: Record<string, string>
  skipAuth?: boolean
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Company-Id': getCompanyId(),
    ...options.headers,
  }

  if (!options.skipAuth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey
  }

  let res: Response
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
    })
  } catch {
    throw new ApiClientError('Network error', 'NETWORK_ERROR', 'offline')
  }

  const json = (await res.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiErrorBody
    | null

  if (!res.ok) {
    if (res.status === 401) {
      logout()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    const err = json && 'error' in json ? json.error : null
    throw new ApiClientError(
      err?.message ?? `HTTP ${res.status}`,
      err?.code ?? 'HTTP_ERROR',
      err?.request_id ?? 'unknown',
      res.status,
    )
  }

  if (json && 'data' in json) return json.data
  throw new ApiClientError('Invalid response', 'BAD_RESPONSE', 'unknown')
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}

export async function sha256Hex(data: ArrayBuffer | Blob): Promise<string> {
  const buffer = data instanceof Blob ? await data.arrayBuffer() : data
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
