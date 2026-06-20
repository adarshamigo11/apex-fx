'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';
import { PageHeader, Spinner } from '@/components/admin';

interface AccountType {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  category: 'LIVE' | 'DEMO';
  defaultLeverage: number;
  maxLeverage: number;
  minDeposit: number;
  defaultBalance: number;
  commission: number;
  spreadMarkup: number;
  currency: string[];
  features: string[];
  enabled: boolean;
  sortOrder: number;
}

const EMPTY_FORM: Omit<AccountType, '_id'> = {
  name: '', displayName: '', description: '', category: 'LIVE',
  defaultLeverage: 100, maxLeverage: 500, minDeposit: 100, defaultBalance: 0,
  commission: 0, spreadMarkup: 1, currency: ['USD'], features: [],
  enabled: true, sortOrder: 0,
};

const FEATURE_OPTIONS = [
  'all_instruments', 'expert_advisors', 'hedging', 'scalping', 'raw_spreads',
  'ecn_execution', 'swap_free', 'api_access', 'dedicated_manager', 'priority_support', 'virtual_funds',
];

export default function AccountTypesPage() {
  const [types, setTypes] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AccountType | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currencyInput, setCurrencyInput] = useState('');

  const load = () => {
    appApi.loadTokens();
    appApi.admin.accountTypes.list().then(setTypes).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCurrencyInput('USD');
    setShowForm(true);
    setError('');
  };

  const openEdit = (t: AccountType) => {
    setEditing(t);
    setForm({ ...t });
    setCurrencyInput(t.currency.join(', '));
    setShowForm(true);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const data = {
        ...form,
        currency: currencyInput.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length === 3),
      };
      if (editing) {
        await appApi.admin.accountTypes.update(editing._id, data);
      } else {
        await appApi.admin.accountTypes.create(data);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleToggle = async (t: AccountType) => {
    await appApi.admin.accountTypes.toggle(t._id);
    load();
  };

  const handleDelete = async (t: AccountType) => {
    if (!confirm(`Delete account type "${t.displayName}"? This cannot be undone.`)) return;
    try {
      await appApi.admin.accountTypes.delete(t._id);
      load();
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Account Types" subtitle="Manage trading account types available to clients" />
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-medium text-sm hover:opacity-90 transition-opacity">
          + New Account Type
        </button>
      </div>

      {/* Account Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {types.map(t => (
          <div key={t._id} className={`glass rounded-xl p-5 relative ${!t.enabled ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.category === 'DEMO' ? 'bg-[#66b2ff]/15 text-[#66b2ff]' : 'bg-[#39ff8b]/15 text-[#39ff8b]'}`}>
                  {t.category}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.enabled ? 'bg-[#39ff8b]/15 text-[#39ff8b]' : 'bg-[#ff5d6c]/15 text-[#ff5d6c]'}`}>
                  {t.enabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-[var(--surface)] text-muted hover:text-white transition-colors" title="Edit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button onClick={() => handleToggle(t)} className="p-1.5 rounded hover:bg-[var(--surface)] text-muted hover:text-[#ffd166] transition-colors" title={t.enabled ? 'Disable' : 'Enable'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d={t.enabled ? "M4.93 4.93l14.14 14.14" : "M12 8v4l3 3"} /></svg>
                </button>
                <button onClick={() => handleDelete(t)} className="p-1.5 rounded hover:bg-[var(--surface)] text-muted hover:text-[#ff5d6c] transition-colors" title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold">{t.displayName}</h3>
            <p className="text-[11px] text-muted font-mono mb-2">{t.name}</p>
            {t.description && <p className="text-xs text-muted mb-3">{t.description}</p>}

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[var(--surface)] rounded-lg p-2 text-center">
                <p className="text-xs text-muted">Leverage</p>
                <p className="text-sm font-bold">1:{t.defaultLeverage}</p>
                <p className="text-[9px] text-muted">max 1:{t.maxLeverage}</p>
              </div>
              <div className="bg-[var(--surface)] rounded-lg p-2 text-center">
                <p className="text-xs text-muted">Min Deposit</p>
                <p className="text-sm font-bold">${t.minDeposit.toLocaleString()}</p>
              </div>
              <div className="bg-[var(--surface)] rounded-lg p-2 text-center">
                <p className="text-xs text-muted">Commission</p>
                <p className="text-sm font-bold">${t.commission}/lot</p>
              </div>
              <div className="bg-[var(--surface)] rounded-lg p-2 text-center">
                <p className="text-xs text-muted">Spread Markup</p>
                <p className="text-sm font-bold">{t.spreadMarkup} pts</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {t.currency.map(c => (
                <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface)] text-muted">{c}</span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              {t.features.slice(0, 4).map(f => (
                <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-[#39ff8b]/10 text-[#39ff8b]">{f.replace(/_/g, ' ')}</span>
              ))}
              {t.features.length > 4 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface)] text-muted">+{t.features.length - 4} more</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {types.length === 0 && (
        <div className="text-center py-16 text-muted">
          <p className="text-lg mb-2">No account types configured</p>
          <p className="text-sm">Create your first account type to allow clients to open trading accounts.</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Account Type' : 'Create Account Type'}</h2>

            {error && <div className="mb-4 p-3 rounded-lg bg-[#ff5d6c]/10 border border-[#ff5d6c]/20 text-[#ff5d6c] text-sm">{error}</div>}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted">Internal Name</span>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" placeholder="e.g. MICRO" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Display Name</span>
                  <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" placeholder="e.g. Micro Account" />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-muted">Description</span>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" rows={2} />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted">Category</span>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as 'LIVE' | 'DEMO' })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm">
                    <option value="LIVE">LIVE</option>
                    <option value="DEMO">DEMO</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Sort Order</span>
                  <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: +e.target.value })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted">Default Leverage</span>
                  <input type="number" value={form.defaultLeverage} onChange={e => setForm({ ...form, defaultLeverage: +e.target.value })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Max Leverage</span>
                  <input type="number" value={form.maxLeverage} onChange={e => setForm({ ...form, maxLeverage: +e.target.value })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted">Min Deposit ($)</span>
                  <input type="number" value={form.minDeposit} onChange={e => setForm({ ...form, minDeposit: +e.target.value })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Default Balance (DEMO)</span>
                  <input type="number" value={form.defaultBalance} onChange={e => setForm({ ...form, defaultBalance: +e.target.value })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted">Commission ($/lot)</span>
                  <input type="number" step="0.1" value={form.commission} onChange={e => setForm({ ...form, commission: +e.target.value })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Spread Markup (pts)</span>
                  <input type="number" step="0.1" value={form.spreadMarkup} onChange={e => setForm({ ...form, spreadMarkup: +e.target.value })} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-muted">Currencies (comma-separated)</span>
                <input value={currencyInput} onChange={e => setCurrencyInput(e.target.value)} className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm" placeholder="USD, EUR, GBP" />
              </label>

              <div>
                <span className="text-xs text-muted">Features</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {FEATURE_OPTIONS.map(f => (
                    <label key={f} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.features.includes(f)}
                        onChange={e => {
                          if (e.target.checked) setForm({ ...form, features: [...form.features, f] });
                          else setForm({ ...form, features: form.features.filter(x => x !== f) });
                        }}
                        className="rounded"
                      />
                      {f.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} className="rounded" />
                Enabled (visible to clients)
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-muted hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-medium text-sm hover:opacity-90 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
