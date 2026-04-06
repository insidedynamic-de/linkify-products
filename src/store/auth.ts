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
