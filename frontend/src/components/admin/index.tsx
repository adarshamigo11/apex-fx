'use client';
import { useState, useEffect, useCallback } from 'react';

// ─── Stat Card ───
export function StatCard({ label, value, icon, trend, color = '#39ff8b' }: {
  label: string; value: string | number; icon?: string; trend?: string; color?: string;
}) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend && <span className={`text-xs px-2 py-0.5 rounded-full ${trend.startsWith('+') ? 'bg-[#39ff8b]/10 text-[#39ff8b]' : 'bg-[#ff5d6c]/10 text-[#ff5d6c]'}`}>{trend}</span>}
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}

// ─── Status Badge ───
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-[#39ff8b]/15 text-[#39ff8b]',
  PENDING: 'bg-[#ffd166]/15 text-[#ffd166]',
  APPROVED: 'bg-[#39ff8b]/15 text-[#39ff8b]',
  REJECTED: 'bg-[#ff5d6c]/15 text-[#ff5d6c]',
  SUSPENDED: 'bg-[#ff5d6c]/15 text-[#ff5d6c]',
  BANNED: 'bg-[#ff5d6c]/20 text-[#ff5d6c]',
  FROZEN: 'bg-[#66b2ff]/15 text-[#66b2ff]',
  RESTRICTED: 'bg-[#ffd166]/15 text-[#ffd166]',
  TERMINATED: 'bg-[#ff5d6c]/20 text-[#ff5d6c]',
  PROCESSING: 'bg-[#ffd166]/15 text-[#ffd166]',
  OPEN: 'bg-[#39ff8b]/15 text-[#39ff8b]',
  CLOSED: 'bg-[var(--muted)]/15 text-[var(--muted)]',
  RESOLVED: 'bg-[#39ff8b]/15 text-[#39ff8b]',
  ESCALATED: 'bg-[#ff5d6c]/15 text-[#ff5d6c]',
  HIGH: 'bg-[#ff5d6c]/15 text-[#ff5d6c]',
  LOW: 'bg-[#39ff8b]/15 text-[#39ff8b]',
  MEDIUM: 'bg-[#ffd166]/15 text-[#ffd166]',
  HEALTHY: 'bg-[#39ff8b]/15 text-[#39ff8b]',
  DEGRADED: 'bg-[#ffd166]/15 text-[#ffd166]',
  DOWN: 'bg-[#ff5d6c]/15 text-[#ff5d6c]',
  SENT: 'bg-[#39ff8b]/15 text-[#39ff8b]',
  FAILED: 'bg-[#ff5d6c]/15 text-[#ff5d6c]',
  CANCELLED: 'bg-[var(--muted)]/15 text-[var(--muted)]',
  ENABLED: 'bg-[#39ff8b]/15 text-[#39ff8b]',
  DISABLED: 'bg-[#ff5d6c]/15 text-[#ff5d6c]',
  SUPER_ADMIN: 'bg-[#ffd166]/20 text-[#ffd166]',
  ADMIN: 'bg-[#66b2ff]/15 text-[#66b2ff]',
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || 'bg-[var(--surface)] text-[var(--muted)]';
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${color}`}>
      {status}
    </span>
  );
}

// ─── Modal ───
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${sizes[size]} w-full glass rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 glass z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-[var(--text)] text-xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false, requireReason = false }: {
  open: boolean; onClose: () => void; onConfirm: (reason?: string) => void;
  title: string; message: string; confirmText?: string; danger?: boolean; requireReason?: boolean;
}) {
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-muted mb-4">{message}</p>
      {requireReason && (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)"
          className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm mb-4 resize-none h-24 focus:outline-none focus:border-[#39ff8b]"
        />
      )}
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm transition-colors">Cancel</button>
        <button
          onClick={() => { onConfirm(reason); setReason(''); onClose(); }}
          disabled={requireReason && !reason.trim()}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${danger ? 'bg-[#ff5d6c] text-white hover:bg-[#ff5d6c]/80' : 'bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] hover:opacity-90'}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

// ─── Search Input ───
export function SearchInput({ value, onChange, placeholder = 'Search...' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  const debounced = useCallback((v: string) => {
    const timer = setTimeout(() => onChange(v), 300);
    return () => clearTimeout(timer);
  }, [onChange]);
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => { setLocal(e.target.value); debounced(e.target.value); }}
      placeholder={placeholder}
      className="w-full sm:w-72 pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b] transition-colors"
    />
  );
}

// ─── Filter Tabs ───
export function FilterTabs({ tabs, active, onChange }: {
  tabs: { value: string; label: string; count?: number }[]; active: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            active === t.value
              ? 'bg-[#39ff8b]/10 text-[#39ff8b]'
              : 'bg-[var(--surface)] text-muted hover:text-[var(--text)]'
          }`}
        >
          {t.label}{t.count != null && <span className="ml-1.5 text-xs opacity-70">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Detail Row ───
export function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

// ─── Permission Gate ───
export function PermGate({ perm, children, fallback }: {
  perm: string; children: React.ReactNode; fallback?: React.ReactNode;
}) {
  const [has, setHas] = useState(false);
  useEffect(() => {
    try {
      const token = localStorage.getItem('at');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload.role;
      const perms = payload.perms || [];
      setHas(role === 'SUPER_ADMIN' || perms.includes(perm));
    } catch { /* ignore */ }
  }, [perm]);
  if (!has) return fallback ? <>{fallback}</> : null;
  return <>{children}</>;
}

// ─── Empty State ───
export function EmptyState({ icon = '📭', title, description }: { icon?: string; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      {description && <p className="text-sm text-muted">{description}</p>}
    </div>
  );
}

// ─── Loading Spinner ───
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center py-12">
      <div className={`${sizes[size]} animate-spin border-2 border-[#39ff8b] border-t-transparent rounded-full`} />
    </div>
  );
}

// ─── Page Header ───
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// ─── Pagination ───
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-sm disabled:opacity-30 hover:bg-[var(--border)] transition-colors"
      >Prev</button>
      <span className="text-sm text-muted">Page {page} of {totalPages}</span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-sm disabled:opacity-30 hover:bg-[var(--border)] transition-colors"
      >Next</button>
    </div>
  );
}
