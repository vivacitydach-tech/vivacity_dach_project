import type { AuthUser, CurrencyCode } from './types';

const TOKEN_KEY = 'te_access_token';
const USER_KEY = 'te_user';
const COMPANY_KEY = 'te_company_id';
const CURRENCY_KEY = 'te_currency';
const COUNTRY_KEY = 'te_country';

const DEFAULT_COMPANY =
  process.env.NEXT_PUBLIC_COMPANY_ID ??
  '00000000-0000-4000-8000-000000000001';

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function getToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export function getCompanyId(): string {
  if (!canUseStorage()) return DEFAULT_COMPANY;
  return localStorage.getItem(COMPANY_KEY) ?? DEFAULT_COMPANY;
}

export function setCompanyId(id: string) {
  localStorage.setItem(COMPANY_KEY, id);
}

export function getCurrency(): CurrencyCode {
  if (!canUseStorage()) return 'EUR';
  const v = localStorage.getItem(CURRENCY_KEY);
  return v === 'PKR' ? 'PKR' : 'EUR';
}

export function setCurrency(currency: CurrencyCode) {
  localStorage.setItem(CURRENCY_KEY, currency);
}

export function getCountry(): string {
  if (!canUseStorage()) return 'DE';
  return localStorage.getItem(COUNTRY_KEY) ?? 'DE';
}

export function setCountry(country: string) {
  localStorage.setItem(COUNTRY_KEY, country);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function logout() {
  clearToken();
  clearUser();
}
