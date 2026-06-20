'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatusBadge, Spinner, Modal, PermGate } from '@/components/admin';

export default function AdminFeedProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProvider, setEditProvider] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await appApi.admin.market.feedProviders();
      setProviders(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      console.error('Failed to load feed providers', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openEdit = (p: any) => {
    setEditProvider(p);
    setForm({
      name: p.name,
      type: p.type,
      url: p.url,
      apiKey: p.apiKey || '',
      priority: p.priority || 1,
      healthStatus: p.healthStatus || 'HEALTHY',
    });
  };

  const handleSave = async () => {
    if (!editProvider) return;
    setSaving(true);
    try {
      await appApi.admin.market.updateFeedProvider(editProvider._id, {
        ...form,
        priority: Number(form.priority),
      });
      setEditProvider(null);
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Feed Providers"
        subtitle={`${providers.length} data feed providers configured`}
      />

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((p: any) => (
          <div key={p._id} className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${p.healthStatus === 'HEALTHY' ? 'bg-[#39ff8b]' : p.healthStatus === 'DEGRADED' ? 'bg-[#ffd166]' : 'bg-[#ff5d6c]'}`} />
                <h3 className="font-semibold text-sm">{p.name}</h3>
              </div>
              <StatusBadge status={p.healthStatus || 'UNKNOWN'} />
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted">Type</span>
                <span>{p.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Priority</span>
                <span>{p.priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">URL</span>
                <span className="text-xs font-mono truncate max-w-[150px]">{p.url}</span>
              </div>
              {p.lastCheckAt && (
                <div className="flex justify-between">
                  <span className="text-muted">Last Check</span>
                  <span className="text-xs">{new Date(p.lastCheckAt).toLocaleString()}</span>
                </div>
              )}
            </div>
            <PermGate perm="market.configure">
              <button onClick={() => openEdit(p)} className="w-full py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] text-sm transition-colors">
                Configure
              </button>
            </PermGate>
          </div>
        ))}
      </div>

      {providers.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-4xl mb-4">📡</p>
          <p className="font-semibold">No feed providers configured</p>
          <p className="text-sm text-muted mt-1">Add data feed providers to start receiving market prices</p>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editProvider} onClose={() => setEditProvider(null)} title={`Configure ${editProvider?.name || 'Provider'}`}>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">Name</label>
            <input type="text" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Type</label>
            <select value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]">
              <option value="REST">REST API</option>
              <option value="WEBSOCKET">WebSocket</option>
              <option value="FIX">FIX Protocol</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">URL</label>
            <input type="text" value={form.url || ''} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">API Key</label>
            <input type="text" value={form.apiKey || ''} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted block mb-1">Priority</label>
              <input type="number" value={form.priority ?? 1} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Health Status</label>
              <select value={form.healthStatus || 'HEALTHY'} onChange={(e) => setForm({ ...form, healthStatus: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]">
                <option value="HEALTHY">Healthy</option>
                <option value="DEGRADED">Degraded</option>
                <option value="DOWN">Down</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-medium hover:opacity-90 disabled:opacity-50 text-sm">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setEditProvider(null)} className="flex-1 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
