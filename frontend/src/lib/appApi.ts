import { api, setTokens, loadTokens } from './api';

function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('at');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: payload.sub, role: payload.role, perms: payload.perms || [] };
  } catch { return null; }
}

function qs(params: Record<string, any>): string {
  return new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]),
  ).toString();
}

export const appApi = {
  me: () => api('/api/auth/me'),
  login: (email: string, password: string) => api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (body: any) => api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('at');
      localStorage.removeItem('rt');
    }
    setTokens(null, null);
    window.location.href = '/login';
  },
  adminLogout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('at');
      localStorage.removeItem('rt');
    }
    setTokens(null, null);
    window.location.href = '/admin/login';
  },
  wallet: () => api('/api/wallet'),
  deposit: (amount: number) => api('/api/wallet/deposit', { method: 'POST', body: JSON.stringify({ amount }) }),
  withdraw: (amount: number) => api('/api/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount }) }),
  kyc: () => api('/api/kyc'),
  submitKyc: (body: any) => api('/api/kyc/submit', { method: 'POST', body: JSON.stringify(body) }),
  accounts: () => api('/api/accounts'),
  accountTypes: () => api('/api/accounts/types'),
  createAccount: (body: any) => api('/api/accounts', { method: 'POST', body: JSON.stringify(body) }),
  market: {
    symbols: () => api('/api/market/symbols'),
    prices: () => api('/api/market/prices'),
  },
  trading: {
    candles: (symbol: string, tf: string) => api(`/api/trading/candles/${symbol}/${tf}`),
    placeOrder: (accountId: string, body: any) =>
      api(`/api/trading/accounts/${accountId}/orders/market`, { method: 'POST', body: JSON.stringify(body) }),
    closePosition: (positionId: string) => api(`/api/trading/positions/${positionId}/close`, { method: 'POST' }),
    snapshot: (accountId: string) => api(`/api/trading/accounts/${accountId}/snapshot`),
    analytics: (accountId: string) => api(`/api/trading/accounts/${accountId}/analytics`),
  },
  admin: {
    // ─── Employees ───
    employees: {
      create: (data: any) => api('/api/admin/employees', { method: 'POST', body: JSON.stringify(data) }),
      list: (params: any = {}) => api(`/api/admin/employees?${qs(params)}`),
      detail: (id: string) => api(`/api/admin/employees/${id}`),
      update: (id: string, data: any) => api(`/api/admin/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      suspend: (id: string) => api(`/api/admin/employees/${id}/suspend`, { method: 'PATCH' }),
      activate: (id: string) => api(`/api/admin/employees/${id}/activate`, { method: 'PATCH' }),
      terminate: (id: string, reason: string) => api(`/api/admin/employees/${id}/terminate`, { method: 'POST', body: JSON.stringify({ reason }) }),
      resetPassword: (id: string, newPassword: string) => api(`/api/admin/employees/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
      forceLogout: (id: string) => api(`/api/admin/employees/${id}/force-logout`, { method: 'POST' }),
      loginHistory: (id: string, params: any = {}) => api(`/api/admin/employees/${id}/login-history?${qs(params)}`),
      devices: (id: string) => api(`/api/admin/employees/${id}/devices`),
      activity: (id: string, params: any = {}) => api(`/api/admin/employees/${id}/activity?${qs(params)}`),
      performance: (id: string) => api(`/api/admin/employees/${id}/performance`),
    },
    // ─── Roles & Permissions ───
    roles: {
      list: () => api('/api/admin/roles'),
      create: (data: any) => api('/api/admin/roles', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: any) => api(`/api/admin/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) => api(`/api/admin/roles/${id}`, { method: 'DELETE' }),
      assign: (userId: string, roleName: string) => api(`/api/admin/users/${userId}/assign-role`, { method: 'POST', body: JSON.stringify({ roleName }) }),
    },
    permissions: {
      matrix: () => api('/api/admin/permissions/matrix'),
    },
    // ─── Users ───
    users: {
      list: (params: any = {}) => api(`/api/admin/users?${qs(params)}`),
      detail: (id: string) => api(`/api/admin/users/${id}`),
      setStatus: (id: string, status: string) => api(`/api/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
      freeze: (id: string) => api(`/api/admin/users/${id}/freeze`, { method: 'POST' }),
      restrict: (id: string, restrictions: string[]) => api(`/api/admin/users/${id}/restrict`, { method: 'POST', body: JSON.stringify({ restrictions }) }),
      merge: (id: string, targetUserId: string) => api(`/api/admin/users/${id}/merge`, { method: 'POST', body: JSON.stringify({ targetUserId }) }),
      loginHistory: (id: string, params: any = {}) => api(`/api/admin/users/${id}/login-history?${qs(params)}`),
      devices: (id: string) => api(`/api/admin/users/${id}/devices`),
      ipHistory: (id: string) => api(`/api/admin/users/${id}/ip-history`),
      securityEvents: (id: string) => api(`/api/admin/users/${id}/security-events`),
    },
    // ─── Wallet ───
    wallet: {
      credit: (userId: string, amount: number, reason: string) => api(`/api/admin/wallet/${userId}/credit`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
      debit: (userId: string, amount: number, reason: string) => api(`/api/admin/wallet/${userId}/debit`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
      freeze: (userId: string) => api(`/api/admin/wallet/${userId}/freeze`, { method: 'POST' }),
      unfreeze: (userId: string) => api(`/api/admin/wallet/${userId}/unfreeze`, { method: 'POST' }),
    },
    balance: {
      adjust: (accountId: string, delta: number, reason: string) =>
        api(`/api/admin/accounts/${accountId}/adjust-balance`, { method: 'POST', body: JSON.stringify({ delta, reason }) }),
    },
    // ─── KYC ───
    kyc: {
      list: (params: any = {}) => api(`/api/admin/kyc?${qs(params)}`),
      decide: (id: string, decision: 'APPROVED' | 'REJECTED', note?: string) =>
        api(`/api/admin/kyc/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, note }) }),
      review: (id: string, data: any) =>
        api(`/api/admin/kyc/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),
      requestDocs: (id: string, data: { docTypes: string[], note?: string }) =>
        api(`/api/admin/kyc/${id}/request-docs`, { method: 'POST', body: JSON.stringify(data) }),
      stats: () => api('/api/admin/kyc/stats'),
    },
    // ─── Deposits ───
    deposits: {
      list: (status?: string) => api(`/api/admin/deposits${status ? `?status=${status}` : ''}`),
      decide: (id: string, decision: 'APPROVED' | 'REJECTED', note?: string) =>
        api(`/api/admin/deposits/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, note }) }),
    },
    // ─── Withdrawals ───
    withdrawals: {
      list: (status?: string) => api(`/api/admin/withdrawals${status ? `?status=${status}` : ''}`),
      decide: (id: string, decision: 'APPROVED' | 'REJECTED', note?: string) =>
        api(`/api/admin/withdrawals/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, note }) }),
    },
    // ─── Trades ───
    trades: {
      list: (params: any = {}) => api(`/api/admin/trades?${qs(params)}`),
    },
    positions: {
      list: (symbol?: string) => api(`/api/admin/positions${symbol ? `?symbol=${symbol}` : ''}`),
    },
    // ─── Support ───
    support: {
      tickets: (params: any = {}) => api(`/api/admin/support/tickets?${qs(params)}`),
      detail: (id: string) => api(`/api/admin/support/tickets/${id}`),
      escalate: (id: string) => api(`/api/admin/support/tickets/${id}/escalate`, { method: 'POST' }),
      resolve: (id: string, resolution: string) => api(`/api/admin/support/tickets/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution }) }),
    },
    // ─── Symbols ───
    symbols: {
      list: () => api('/api/admin/symbols'),
      create: (data: any) => api('/api/admin/symbols', { method: 'POST', body: JSON.stringify(data) }),
      update: (name: string, patch: any) => api(`/api/admin/symbols/${name}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      disable: (name: string) => api(`/api/admin/symbols/${name}/disable`, { method: 'POST' }),
      enable: (name: string) => api(`/api/admin/symbols/${name}/enable`, { method: 'POST' }),
    },
    // ─── Market ───
    market: {
      config: () => api('/api/admin/market/config'),
      updateConfig: (config: any) => api('/api/admin/market/config', { method: 'PATCH', body: JSON.stringify(config) }),
      sessions: () => api('/api/admin/market/sessions'),
      setSession: (data: any) => api('/api/admin/market/sessions', { method: 'POST', body: JSON.stringify(data) }),
      halt: (symbolName?: string) => api('/api/admin/market/halt', { method: 'POST', body: JSON.stringify({ symbolName }) }),
      resume: (symbolName?: string) => api('/api/admin/market/resume', { method: 'POST', body: JSON.stringify({ symbolName }) }),
      feedProviders: () => api('/api/admin/market/feed-providers'),
      updateFeedProvider: (id: string, patch: any) => api(`/api/admin/market/feed-providers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      feedHealth: () => api('/api/admin/market/feed-health'),
      dashboard: () => api('/api/admin/market/dashboard'),
    },
    // ─── Risk ───
    risk: {
      rules: () => api('/api/admin/risk/rules'),
      createRule: (data: any) => api('/api/admin/risk/rules', { method: 'POST', body: JSON.stringify(data) }),
      updateRule: (id: string, data: any) => api(`/api/admin/risk/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      deleteRule: (id: string) => api(`/api/admin/risk/rules/${id}`, { method: 'DELETE' }),
      dashboard: () => api('/api/admin/risk/dashboard'),
    },
    // ─── Approvals ───
    approvals: {
      list: (params: any = {}) => api(`/api/admin/approvals?${qs(params)}`),
      create: (data: any) => api('/api/admin/approvals', { method: 'POST', body: JSON.stringify(data) }),
      approve: (id: string, note?: string) => api(`/api/admin/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify({ note }) }),
      reject: (id: string, note?: string) => api(`/api/admin/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
      chains: () => api('/api/admin/approvals/chains'),
    },
    // ─── Communication ───
    communication: {
      email: (userId: string, subject: string, body: string) =>
        api(`/api/admin/communication/email/${userId}`, { method: 'POST', body: JSON.stringify({ subject, body }) }),
      sms: (userId: string, message: string) =>
        api(`/api/admin/communication/sms/${userId}`, { method: 'POST', body: JSON.stringify({ message }) }),
      broadcast: (data: any) => api('/api/admin/communication/broadcast', { method: 'POST', body: JSON.stringify(data) }),
      history: (params: any = {}) => api(`/api/admin/communication/history?${qs(params)}`),
    },
    // ─── Audit ───
    auditLog: {
      list: (params: any = {}) => api(`/api/admin/audit/log?${qs(params)}`),
      export: (params: any = {}) => api(`/api/admin/audit/export?${qs(params)}`),
    },
    actionLog: {
      list: (params: any = {}) => api(`/api/admin/action-log?${qs(params)}`),
    },
    // ─── Security ───
    securityEvents: {
      list: (params: any = {}) => api(`/api/admin/security-events?${qs(params)}`),
    },
    // ─── Monitoring ───
    monitoring: {
      system: () => api('/api/admin/monitoring/system'),
      stats: () => api('/api/admin/monitoring/stats'),
    },
    // ─── Settings ───
    settings: {
      get: () => api('/api/admin/settings'),
      update: (settings: any) => api('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(settings) }),
    },
    // ─── Account Types ───
    accountTypes: {
      list: () => api('/api/admin/account-types'),
      create: (data: any) => api('/api/admin/account-types', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: any) => api(`/api/admin/account-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) => api(`/api/admin/account-types/${id}`, { method: 'DELETE' }),
      toggle: (id: string) => api(`/api/admin/account-types/${id}/toggle`, { method: 'POST' }),
    },
  },
  setTokens,
  loadTokens,
  getCurrentUser,

  // User KYC endpoints
  kycSubmit: (body: any) => api('/api/kyc/submit', { method: 'POST', body: JSON.stringify(body) }),
  kycUploadUrl: (body: any) => api('/api/kyc/documents/upload', { method: 'POST', body: JSON.stringify(body) }),
  kycCountries: () => api('/api/kyc/countries'),
};