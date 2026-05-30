/**
 * @file client — Axios API client with JWT auth interceptors
 * @author Viktor Nikolayev <viktor.nikolayev@gmail.com>
 */
import axios from 'axios';
import {
  getAccessToken, getRefreshToken, setTokens, clearTokens,
  isTokenExpired, getActiveTenantId, getImpersonateUser,
  scheduleTokenRefresh,
} from '../store/auth';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: add Bearer token + active tenant ──
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const imp = getImpersonateUser();
  if (imp) {
    config.headers['X-Impersonate-User-Id'] = String(imp.user_id);
  }
  // Only set if not explicitly provided in the request
  if (!config.headers['X-Tenant-Id']) {
    const tenantId = getActiveTenantId();
    if (tenantId) {
      config.headers['X-Tenant-Id'] = String(tenantId);
    }
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401, redirect on failure ──
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => {
    window.dispatchEvent(new Event('api-activity'));
    return res;
  },
  async (err) => {
    const original = err.config;

    // Track instance proxy errors — circuit breaker after 3 failures
    if (err.response && original.url?.includes('/instance/') &&
        (err.response.status === 502 || err.response.status === 504)) {
      trackInstanceError(err.response.status);
    }

    // Only the auth endpoints themselves are excluded from refresh-on-401.
    // NOTE: /instance/* and /integrations/* must NOT be excluded — those are the
    // most-polled URLs on product pages, so a JWT expiring mid-session surfaces
    // as a 401 there first. Excluding them meant the expired access token never
    // got refreshed reactively (the proactive setTimeout is throttled in
    // background tabs), producing a wall of 401s that looked like a logout.
    // Concurrent refreshes are deduped via refreshPromise; loops are guarded by
    // _retry — so a genuine instance-side 401 just retries once and rejects.
    if (
      !err.response ||
      err.response.status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/register') ||
      original.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(err);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      window.location.hash = '#/login';
      return Promise.reject(err);
    }

    // Deduplicate concurrent refresh calls
    if (!refreshPromise) {
      refreshPromise = axios
        .post('/api/v1/auth/refresh', { refresh_token: refreshToken })
        .then((res) => {
          const newAccess = res.data.access_token;
          const newRefresh = res.data.refresh_token;
          setTokens(newAccess, newRefresh);
          scheduleTokenRefresh();
          return newAccess;
        })
        .catch(() => {
          clearTokens();
          window.location.hash = '#/login';
          return '';
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newToken = await refreshPromise;
    if (!newToken) return Promise.reject(err);

    original._retry = true;
    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);

/** Check if access token needs refresh before a critical operation */
export async function ensureFreshToken(): Promise<void> {
  const access = getAccessToken();
  const refresh = getRefreshToken();
  if (access && isTokenExpired(access) && refresh) {
    try {
      const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refresh });
      setTokens(res.data.access_token, res.data.refresh_token);
      scheduleTokenRefresh(); // re-arm the proactive timer after a manual refresh
    } catch {
      clearTokens();
      window.location.hash = '#/login';
    }
  }
}

// The proactive refresh timer (setTimeout) is throttled or suspended in
// background tabs and after the machine sleeps, so the access token can lapse
// without it firing. Refresh on tab re-focus to close that gap before the next
// request goes out with an expired token.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void ensureFreshToken();
    }
  });
}

/** Set instance proxy prefix — all requests will be prefixed */
let _instancePrefix = '';
export function setInstancePrefix(prefix: string) { _instancePrefix = prefix; }
export function getInstancePrefix() { return _instancePrefix; }

/** Instance offline flag — stops polling when instance is unreachable */
let _instanceOffline = false;
let _instanceFailCount = 0;
const INSTANCE_FAIL_THRESHOLD = 3;
export function setInstanceOffline(offline: boolean) {
  _instanceOffline = offline;
  if (!offline) _instanceFailCount = 0;
}
export function isInstanceOffline() { return _instanceOffline; }
export function trackInstanceError(status: number) {
  if (status === 502 || status === 504 || status === 0) {
    _instanceFailCount++;
    if (_instanceFailCount >= INSTANCE_FAIL_THRESHOLD) {
      _instanceOffline = true;
    }
  }
}
export function resetInstanceErrors() { _instanceFailCount = 0; }

// Override baseURL dynamically based on instance prefix
const originalGet = api.get.bind(api);
const originalPost = api.post.bind(api);
const originalPut = api.put.bind(api);
const originalDelete = api.delete.bind(api);
const originalPatch = api.patch.bind(api);

function prefixUrl(url: string): string {
  if (!_instancePrefix || url.startsWith('/auth') || url.startsWith('/admin') ||
      url.startsWith('/instance') || url.startsWith('/tenants') || url.startsWith('/features') ||
      url.startsWith('/my-instances') || url.startsWith('/products') || url.startsWith('/catalog') ||
      url.startsWith('/categories') || url === '/logs') {
    return url;
  }
  return `${_instancePrefix}${url}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.get = ((url: string, ...args: any[]) => originalGet(prefixUrl(url), ...args)) as typeof api.get;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.post = ((url: string, ...args: any[]) => originalPost(prefixUrl(url), ...args)) as typeof api.post;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.put = ((url: string, ...args: any[]) => originalPut(prefixUrl(url), ...args)) as typeof api.put;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.delete = ((url: string, ...args: any[]) => originalDelete(prefixUrl(url), ...args)) as typeof api.delete;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.patch = ((url: string, ...args: any[]) => originalPatch(prefixUrl(url), ...args)) as typeof api.patch;

export default api;
