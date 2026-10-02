import axios, { AxiosError, type AxiosInstance } from 'axios';
import { getCompanyId, getToken, logout } from './auth';
import type { ApiErrorBody, ApiSuccess } from './types';

function getBaseURL(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return '/v1';
  }
  return 'http://api:3000/v1';
}

export class ApiClientError extends Error {
  code: string;
  requestId: string;
  status?: number;

  constructor(message: string, code: string, requestId: string, status?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.requestId = requestId;
    this.status = status;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Company-Id'] = getCompanyId();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const body = error.response?.data;
    if (status === 401 && typeof window !== 'undefined') {
      logout();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    if (body?.error) {
      return Promise.reject(
        new ApiClientError(
          body.error.message,
          body.error.code,
          body.error.request_id,
          status,
        ),
      );
    }
    return Promise.reject(
      new ApiClientError(
        error.message || 'Network error',
        'NETWORK_ERROR',
        'unknown',
        status,
      ),
    );
  },
);

export async function apiGet<T>(url: string): Promise<T> {
  const res = await api.get<ApiSuccess<T>>(url);
  return res.data.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<ApiSuccess<T>>(url, body);
  return res.data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<ApiSuccess<T>>(url, body);
  return res.data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put<ApiSuccess<T>>(url, body);
  return res.data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await api.delete<ApiSuccess<T>>(url);
  return res.data.data;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
