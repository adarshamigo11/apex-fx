'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';

export default function AdminSymbolsPage() {
  const [symbols, setSymbols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSymbol, setEditSymbol] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<any>({ name: '', displayName: '', kind: 'FOREX', spreadPoints: 10, commission: 0, minLot: 0.01, maxLot: 100, lotStep: 0.01, marginPercent: 1, enabled: true });

  const fetchSymbols = async () => {
    setLoading(true);
    try {
      const data = await appApi.admin.symbols.list();
      setSymbols(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load symbols', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSymbols(); }, []);

  const openEdit = (sym: any) => {
    setEditSymbol(sym);
    setFormData({
      enabled: sym.enabled,
      spreadPoints: sym.spreadPoints,
      commission: sym.commission,
      minLot: sym.minLot,
      maxLot: sym.maxLot,
      lotStep: sym.lotStep,
      marginPercent: sym.marginPercent,
    });
  };

  const handleSave = async () => {
    if (!editSymbol) return;
    setSaving(true);
    try {
      const patch: any = {};
      if (formData.enabled !== undefined) patch.enabled = formData.enabled;
      if (formData.spreadPoints !== undefined) patch.spreadPoints = Number(formData.spreadPoints);
      if (formData.commission !== undefined) patch.commission = Number(formData.commission);
      if (formData.minLot !== undefined) patch.minLot = Number(formData.minLot);
      if (formData.maxLot !== undefined) patch.maxLot = Number(formData.maxLot);
      if (formData.lotStep !== undefined) patch.lotStep = Number(formData.lotStep);
      if (formData.marginPercent !== undefined) patch.marginPercent = Number(formData.marginPercent);
      await appApi.admin.symbols.update(editSymbol.name, patch);
      setEditSymbol(null);
      await fetchSymbols();
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setSaving(true);
    try {
      await appApi.admin.symbols.create({
        ...createForm,
        spreadPoints: Number(createForm.spreadPoints),
        commission: Number(createForm.commission),
        minLot: Number(createForm.minLot),
        maxLot: Number(createForm.maxLot),
        lotStep: Number(createForm.lotStep),
        marginPercent: Number(createForm.marginPercent),
      });
      setShowCreate(false);
      setCreateForm({ name: '', displayName: '', kind: 'FOREX', spreadPoints: 10, commission: 0, minLot: 0.01, maxLot: 100, lotStep: 0.01, marginPercent: 1, enabled: true });
      await fetchSymbols();
    } catch (e: any) {
      alert(e.message || 'Failed to create symbol');
    }
    setSaving(false);
  };

  const handleToggle = async (sym: any) => {
    try {
      if (sym.enabled) {
        await appApi.admin.symbols.disable(sym.name);
      } else {
        await appApi.admin.symbols.enable(sym.name);
      }
      await fetchSymbols();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle symbol');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Symbols</h1>
          <p className="text-muted">{symbols.length} trading instruments</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] text-sm font-medium hover:opacity-90">
          Add Instrument
        </button>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-2 border-[#39ff8b] border-t-transparent rounded-full" />
          </div>
        ) : symbols.length === 0 ? (
          <p className="text-center text-muted py-12">No symbols found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="p-4">Symbol</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Spread</th>
                  <th className="p-4">Commission</th>
                  <th className="p-4">Min Lot</th>
                  <th className="p-4">Max Lot</th>
                  <th className="p-4">Margin %</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {symbols.map((sym: any) => (
                  <tr key={sym.name} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{sym.name}</p>
                        <p className="text-xs text-muted">{sym.displayName}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        sym.kind === 'FOREX' ? 'bg-blue-500/10 text-blue-400' :
                        sym.kind === 'METAL' ? 'bg-[#ffd166]/10 text-[#ffd166]' :
                        sym.kind === 'INDEX' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-orange-500/10 text-orange-400'
                      }`}>
                        {sym.kind}
                      </span>
                    </td>
                    <td className="p-4">{sym.spreadPoints} pts</td>
                    <td className="p-4">${sym.commission}</td>
                    <td className="p-4">{sym.minLot}</td>
                    <td className="p-4">{sym.maxLot}</td>
                    <td className="p-4">{sym.marginPercent ? `${sym.marginPercent}%` : '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${sym.enabled ? 'bg-[#39ff8b]/10 text-[#39ff8b]' : 'bg-gray-500/10 text-gray-400'}`}>
                        {sym.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(sym)} className="text-[#39ff8b] hover:underline text-sm">Edit</button>
                        <button onClick={() => handleToggle(sym)} className={`text-sm hover:underline ${sym.enabled ? 'text-[#ff5d6c]' : 'text-[#39ff8b]'}`}>
                          {sym.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editSymbol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Edit {editSymbol.name}</h3>
              <button onClick={() => setEditSymbol(null)} className="text-muted hover:text-[var(--text)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Enabled toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Enabled</label>
                <button
                  onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                  className={`w-12 h-6 rounded-full transition-colors ${formData.enabled ? 'bg-[#39ff8b]' : 'bg-gray-500'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${formData.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Spread */}
              <div>
                <label className="text-sm text-muted block mb-1">Spread Points</label>
                <input
                  type="number"
                  value={formData.spreadPoints ?? ''}
                  onChange={(e) => setFormData({ ...formData, spreadPoints: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b]"
                />
              </div>

              {/* Commission */}
              <div>
                <label className="text-sm text-muted block mb-1">Commission ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.commission ?? ''}
                  onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b]"
                />
              </div>

              {/* Lot sizes */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted block mb-1">Min Lot</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minLot ?? ''}
                    onChange={(e) => setFormData({ ...formData, minLot: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b] text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Max Lot</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxLot ?? ''}
                    onChange={(e) => setFormData({ ...formData, maxLot: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b] text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Lot Step</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.lotStep ?? ''}
                    onChange={(e) => setFormData({ ...formData, lotStep: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b] text-sm"
                  />
                </div>
              </div>

              {/* Margin */}
              <div>
                <label className="text-sm text-muted block mb-1">Margin Percent (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.marginPercent ?? ''}
                  onChange={(e) => setFormData({ ...formData, marginPercent: e.target.value })}
                  placeholder="e.g. 1 for 1:100 leverage"
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-[#39ff8b] text-[#0a0e1a] font-medium hover:bg-[#39ff8b]/80 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditSymbol(null)}
                  className="flex-1 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Symbol Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Add New Instrument</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted hover:text-[var(--text)]">&times;</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted block mb-1">Symbol Name</label>
                  <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value.toUpperCase() })} placeholder="e.g. EURUSD" className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b]" />
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Display Name</label>
                  <input type="text" value={createForm.displayName} onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })} placeholder="e.g. EUR/USD" className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b]" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Type</label>
                <select value={createForm.kind} onChange={(e) => setCreateForm({ ...createForm, kind: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b]">
                  <option value="FOREX">Forex</option>
                  <option value="METAL">Metal</option>
                  <option value="INDEX">Index</option>
                  <option value="COMMODITY">Commodity</option>
                  <option value="STOCK">Stock</option>
                  <option value="ETF">ETF</option>
                  <option value="CRYPTO">Crypto</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted block mb-1">Spread Pts</label>
                  <input type="number" value={createForm.spreadPoints} onChange={(e) => setCreateForm({ ...createForm, spreadPoints: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Commission</label>
                  <input type="number" step="0.01" value={createForm.commission} onChange={(e) => setCreateForm({ ...createForm, commission: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Margin %</label>
                  <input type="number" step="0.1" value={createForm.marginPercent} onChange={(e) => setCreateForm({ ...createForm, marginPercent: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted block mb-1">Min Lot</label>
                  <input type="number" step="0.01" value={createForm.minLot} onChange={(e) => setCreateForm({ ...createForm, minLot: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Max Lot</label>
                  <input type="number" step="0.01" value={createForm.maxLot} onChange={(e) => setCreateForm({ ...createForm, maxLot: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Lot Step</label>
                  <input type="number" step="0.01" value={createForm.lotStep} onChange={(e) => setCreateForm({ ...createForm, lotStep: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={handleCreate} disabled={saving || !createForm.name.trim()} className="flex-1 py-2 rounded-lg bg-[#39ff8b] text-[#0a0e1a] font-medium hover:bg-[#39ff8b]/80 disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create'}
                </button>
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
