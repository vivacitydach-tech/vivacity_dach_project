import type { AuthUser } from './types'

const TOKEN_KEY = 'te_field_token'
const USER_KEY = 'te_field_user'
const PROJECT_KEY = 'te_field_project'

export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000/v1'
}

export function getCompanyId(): string {
  return (
    import.meta.env.VITE_COMPANY_ID ??
    '00000000-0000-4000-8000-000000000001'
  )
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getSelectedProjectId(): string | null {
  return localStorage.getItem(PROJECT_KEY)
}

export function setSelectedProjectId(id: string | null): void {
  if (id) localStorage.setItem(PROJECT_KEY, id)
  else localStorage.removeItem(PROJECT_KEY)
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(PROJECT_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}
