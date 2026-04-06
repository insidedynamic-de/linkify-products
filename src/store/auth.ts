/**
 * @file auth — JWT auth store: login, register, logout, token management, user state
 */

export interface AuthUser {
  user_id: number;
  email: string;
  name: string;
  tenant_id: number;
  tenant_type: string;
  tenant_name: string;
  user_type: string;
  mfa_enabled: boolean;
}

interface TokenPayload {
  sub: string;
  email: string;
  tenant_id: number;
  tenant_type: string;
  user_type: string;
  exp: number;
  type: string;
}

const ACCESS_TOKEN_KEY = 'linkify_access_token';
const REFRESH_TOKEN_KEY = 'linkify_refresh_token';

// ── Token storage ──

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh?: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.setItem('linkify-logout-at', String(Date.now()));
}

// ── Token parsing ──

export function parseToken(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseToken(token);
  if (!payload?.exp) return true;
  // 30 second buffer
  return Date.now() >= (payload.exp - 30) * 1000;
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  // Even if expired, we might have a refresh token
  return !isTokenExpired(token) || !!getRefreshToken();
}

// ── Quick user info from token (no API call) ──

// ── Active tenant (impersonate / switch) ──

const ACTIVE_TENANT_KEY = 'linkify_active_tenant';

export interface ActiveTenant {
  id: number;
  name: string;
  tenant_type: string;
}

export interface ImpersonateUser {
  user_id: number;
  email: string;
  name: string;
  tenant_id: number;
  tenant_name: string;
  tenant_type: string;
  user_type: string;
}

const IMPERSONATE_KEY = 'linkify_impersonate';

export function getImpersonateUser(): ImpersonateUser | null {
  try {
    const raw = localStorage.getItem(IMPERSONATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return null;
}

export function setImpersonateUser(user: ImpersonateUser | null): void {
  if (user) {
    localStorage.setItem(IMPERSONATE_KEY, JSON.stringify(user));
    // Also set active tenant for API calls
    setActiveTenant({ id: user.tenant_id, name: user.tenant_name, tenant_type: user.tenant_type });
  } else {
    localStorage.removeItem(IMPERSONATE_KEY);
    setActiveTenant(null);
  }
}

/** Get effective user type — impersonated or real */
export function getEffectiveUserType(): string {
  const imp = getImpersonateUser();
  if (imp) return imp.user_type;
  return getUserFromToken()?.user_type || 'user';
}

export function getActiveTenant(): ActiveTenant | null {
  try {
    const raw = localStorage.getItem(ACTIVE_TENANT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return null;
}

export function setActiveTenant(tenant: ActiveTenant | null): void {
  if (tenant) {
    localStorage.setItem(ACTIVE_TENANT_KEY, JSON.stringify(tenant));
  } else {
    localStorage.removeItem(ACTIVE_TENANT_KEY);
  }
}

export function getActiveTenantId(): number | null {
  return getActiveTenant()?.id || null;
}

export function getUserFromToken(): Pick<AuthUser, 'user_id' | 'email' | 'tenant_id' | 'tenant_type' | 'user_type'> | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = parseToken(token);
  if (!payload) return null;
  return {
    user_id: parseInt(payload.sub),
    email: payload.email,
    tenant_id: payload.tenant_id,
    tenant_type: payload.tenant_type,
    user_type: payload.user_type,
  };
}
