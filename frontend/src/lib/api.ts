// Typed API client with automatic refresh-token retry.
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(a: string | null, r: string | null) {
  accessToken = a; refreshToken = r;
  if (typeof window !== 'undefined') {
    if (a) localStorage.setItem('at', a); else localStorage.removeItem('at');
    if (r) localStorage.setItem('rt', r); else localStorage.removeItem('rt');
  }
}
export function loadTokens() {
  if (typeof window !== 'undefined') { accessToken = localStorage.getItem('at'); refreshToken = localStorage.getItem('rt'); }
}

async function raw(path: string, init: RequestInit = {}) {
  // Auto-load tokens from localStorage if not in memory (e.g. after page navigation)
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('at');
    refreshToken = localStorage.getItem('rt');
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as any) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${BASE}${path}`, { ...init, headers });
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await raw(path, init);
  if (res.status === 401 && refreshToken) {
    const r = await raw('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
    if (r.ok) { const t = await r.json(); setTokens(t.accessToken, t.refreshToken); res = await raw(path, init); }
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

export const auth = {
  login: (identifier: string, password: string) =>
    api<{ accessToken: string; refreshToken: string; user: any }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  register: (body: any) => api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
};
export const market = { symbols: () => api('/api/market/symbols') };
