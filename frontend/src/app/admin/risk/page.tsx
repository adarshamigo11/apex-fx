'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatCard, StatusBadge, Spinner, Modal, PermGate, ConfirmDialog } from '@/components/admin';

export default function AdminRiskPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);
  const [form, setForm] = useState<any>({ type: 'MAX_EXPOSURE', symbolName: '', maxExposure: '', maxPosition: '', maxVolume: '', marginMultiplier: '', circuitBreaker: false, enabled: true });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([appApi.admin.risk.dashboard(), appApi.admin.risk.rules()]);
      setDashboard(d);
      setRules(Array.isArray(r) ? r : r?.items || []);
    } catch (e) {
      console.error('Failed to load risk data', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...form,
        maxExposure: form.maxExposure ? Number(form.maxExposure) : undefined,
        maxPosition: form.maxPosition ? Number(form.maxPosition) : undefined,
        maxVolume: form.maxVolume ? Number(form.maxVolume) : undefined,
        marginMultiplier: form.marginMultiplier ? Number(form.marginMultiplier) : undefined,
      };
      if (editRule) {
        await appApi.admin.risk.updateRule(editRule._id, data);
      } else {
        await appApi.admin.risk.createRule(data);
      }
      setShowCreate(false);
      setEditRule(null);
      setForm({ type: 'MAX_EXPOSURE', symbolName: '', maxExposure: '', maxPosition: '', maxVolume: '', marginMultiplier: '', circuitBreaker: false, enabled: true });
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to save rule');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await appApi.admin.risk.deleteRule(id);
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
    setDeleteId(null);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Risk Dashboard"
        subtitle="Risk controls, exposure limits, and circuit breakers"
        actions={
          <PermGate perm="risk.configure">
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] text-sm font-medium hover:opacity-90">
              Add Rule
            </button>
          </PermGate>
        }
      />

      {/* Risk Metrics */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Exposure" value={`$${(dashboard.totalExposure || 0).toLocaleString()}`} icon="📊" color="#ff5d6c" />
          <StatCard label="Margin Utilization" value={`${(dashboard.marginUtilization || 0).toFixed(1)}%`} icon="📈" color="#ffd166" />
          <StatCard label="Open Positions" value={dashboard.openPositions || 0} icon="📉" color="#66b2ff" />
          <StatCard label="Active Rules" value={rules.filter(r => r.enabled).length} icon="⚠️" color="#39ff8b" />
        </div>
      )}

      {/* P&L Summary */}
      {dashboard?.pnl && (
        <div className="glass rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">P&L Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className={`text-2xl font-bold ${(dashboard.pnl.today || 0) >= 0 ? 'text-[#39ff8b]' : 'text-[#ff5d6c]'}`}>
                ${(dashboard.pnl.today || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted">Today</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${(dashboard.pnl.week || 0) >= 0 ? 'text-[#39ff8b]' : 'text-[#ff5d6c]'}`}>
                ${(dashboard.pnl.week || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted">This Week</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${(dashboard.pnl.month || 0) >= 0 ? 'text-[#39ff8b]' : 'text-[#ff5d6c]'}`}>
                ${(dashboard.pnl.month || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted">This Month</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${(dashboard.pnl.total || 0) >= 0 ? 'text-[#39ff8b]' : 'text-[#ff5d6c]'}`}>
                ${(dashboard.pnl.total || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted">All Time</p>
            </div>
          </div>
        </div>
      )}

      {/* Risk Rules */}
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">Risk Rules ({rules.length})</h2>
        {rules.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No risk rules configured</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4">Max Exposure</th>
                  <th className="pb-3 pr-4">Max Position</th>
                  <th className="pb-3 pr-4">Max Volume</th>
                  <th className="pb-3 pr-4">Circuit Breaker</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule: any) => (
                  <tr key={rule._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]">
                    <td className="py-3 pr-4">
                      <span className="text-xs px-2 py-1 rounded bg-[var(--surface)] font-medium">{rule.type}</span>
                    </td>
                    <td className="py-3 pr-4 text-muted">{rule.symbolName || 'Global'}</td>
                    <td className="py-3 pr-4">{rule.maxExposure ? `$${rule.maxExposure.toLocaleString()}` : '-'}</td>
                    <td className="py-3 pr-4">{rule.maxPosition || '-'}</td>
                    <td className="py-3 pr-4">{rule.maxVolume || '-'}</td>
                    <td className="py-3 pr-4">
                      {rule.circuitBreaker ? <span className="text-[#ff5d6c] text-xs font-medium">Active</span> : <span className="text-muted text-xs">No</span>}
                    </td>
                    <td className="py-3 pr-4"><StatusBadge status={rule.enabled ? 'ENABLED' : 'DISABLED'} /></td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditRule(rule); setForm(rule); setShowCreate(true); }} className="text-[#39ff8b] hover:underline text-xs">Edit</button>
                        <button onClick={() => setDeleteId(rule._id)} className="text-[#ff5d6c] hover:underline text-xs">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Rule Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditRule(null); }} title={editRule ? 'Edit Risk Rule' : 'Create Risk Rule'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted block mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]">
                <option value="MAX_EXPOSURE">Max Exposure</option>
                <option value="MAX_POSITION">Max Position</option>
                <option value="MAX_VOLUME">Max Volume</option>
                <option value="MARGIN_MULTIPLIER">Margin Multiplier</option>
                <option value="CIRCUIT_BREAKER">Circuit Breaker</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Symbol (empty = global)</label>
              <input type="text" value={form.symbolName} onChange={(e) => setForm({ ...form, symbolName: e.target.value })} placeholder="e.g. EURUSD" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted block mb-1">Max Exposure ($)</label>
              <input type="number" value={form.maxExposure ?? ''} onChange={(e) => setForm({ ...form, maxExposure: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Max Position (lots)</label>
              <input type="number" value={form.maxPosition ?? ''} onChange={(e) => setForm({ ...form, maxPosition: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted block mb-1">Max Volume</label>
              <input type="number" value={form.maxVolume ?? ''} onChange={(e) => setForm({ ...form, maxVolume: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Margin Multiplier</label>
              <input type="number" value={form.marginMultiplier ?? ''} onChange={(e) => setForm({ ...form, marginMultiplier: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.circuitBreaker} onChange={(e) => setForm({ ...form, circuitBreaker: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm">Circuit Breaker</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm">Enabled</span>
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-medium hover:opacity-90 disabled:opacity-50 text-sm">
              {saving ? 'Saving...' : editRule ? 'Update Rule' : 'Create Rule'}
            </button>
            <button onClick={() => { setShowCreate(false); setEditRule(null); }} className="flex-1 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Risk Rule"
        message="Are you sure you want to delete this risk rule? This may affect trading limits."
        confirmText="Delete"
        danger
      />
    </div>
  );
}
