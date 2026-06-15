import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

/**
 * Dev default: `/api/v1` → Vite `server.proxy` forwards `/api` to Nest (see vite.config.ts).
 * Production / Cloudflare tunnel: set `VITE_API_BASE_URL` to your Nest origin, e.g.
 * `https://api.yourdomain.com/api/v1`. Same-origin `/api` does not exist on static hosts — without this,
 * requests hit the CDN and often surface as HTTP 520 from Cloudflare.
 */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  if (raw) {
    return raw.replace(/\/+$/, '');
  }
  return '/api/v1';
}

const baseURL = resolveApiBaseUrl();

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/** No auth interceptor — used only for `POST /auth/refresh` to avoid recursion. */
const refreshClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token =
    useAuthStore.getState().token ?? localStorage.getItem('eggfleet_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/** Single in-flight refresh so parallel 401s share one refresh call. */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh =
    useAuthStore.getState().refreshToken ?? localStorage.getItem('eggfleet_admin_refresh');
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const r = await refreshClient.post<{ success?: boolean; data?: { accessToken?: string } }>(
          '/auth/refresh',
          { refreshToken: refresh },
        );
        const access = r.data?.data?.accessToken;
        if (!access) return null;
        useAuthStore.getState().setAccessToken(access);
        return access;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function redirectToLoginIfNeeded() {
  const path = window.location.pathname;
  if (path !== '/login' && path !== '/forgot-password') {
    window.location.replace('/login');
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const path = originalRequest.url ?? '';
    if (path.includes('/auth/refresh') || path.includes('/auth/login')) {
      useAuthStore.getState().clearAuth();
      redirectToLoginIfNeeded();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      useAuthStore.getState().clearAuth();
      redirectToLoginIfNeeded();
      return Promise.reject(error);
    }

    const access = await refreshAccessToken();
    if (!access) {
      useAuthStore.getState().clearAuth();
      redirectToLoginIfNeeded();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    originalRequest.headers.Authorization = `Bearer ${access}`;
    return api(originalRequest);
  },
);

export default api;
