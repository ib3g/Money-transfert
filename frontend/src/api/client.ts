import { ApiError } from '@/utils/api-error';
import { useAuthStore } from '@/stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
const TIMEOUT = 30_000;

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function tryRefreshToken(): Promise<boolean> {
  const { refreshToken, setAccessToken, clearAuth } = useAuthStore.getState();
  if (!refreshToken) { clearAuth(); return false; }

  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push((token) => {
        setAccessToken(token);
        resolve(true);
      });
    });
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) { clearAuth(); return false; }

    const body = await res.json();
    const newToken = body.data?.accessToken ?? body.accessToken;
    if (!newToken) { clearAuth(); return false; }

    setAccessToken(newToken);
    refreshQueue.forEach((cb) => cb(newToken));
    return true;
  } catch {
    clearAuth();
    return false;
  } finally {
    isRefreshing = false;
    refreshQueue = [];
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  _retry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, _retry = false, ...init } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 401 && !skipAuth && !_retry) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return request<T>(path, { ...options, _retry: true });
      }
      // Redirect to login happens via authStore.clearAuth reactive logic
      throw new ApiError('SESSION_EXPIRED', 'Session expirée', 401);
    }

    // Download (non-JSON)
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/pdf')) {
      return res.blob() as unknown as T;
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new ApiError(
        body?.error?.code ?? 'UNKNOWN_ERROR',
        body?.error?.message ?? `HTTP ${res.status}`,
        res.status,
        body?.error?.details
      );
    }

    if (body.data !== undefined) {
      if (body.pagination !== undefined) {
        return { data: body.data, pagination: body.pagination } as T;
      }
      return body.data as T;
    }
    return body as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'La requête a expiré', 408);
    }
    throw new ApiError('NETWORK_ERROR', 'Erreur réseau. Vérifiez votre connexion.', 0);
  }
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...opts }),

  post: <T>(path: string, body: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...opts }),

  patch: <T>(path: string, body: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...opts }),

  download: async (path: string, filename: string): Promise<void> => {
    const token = useAuthStore.getState().accessToken;
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new ApiError('DOWNLOAD_FAILED', 'Échec du téléchargement', res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
