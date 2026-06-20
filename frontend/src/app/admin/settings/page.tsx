'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';
import { PageHeader, Spinner, PermGate } from '@/components/admin';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await appApi.admin.settings.get();
      setSettings(data);
      setForm(data || {});
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await appApi.admin.settings.update(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Platform Settings"
        subtitle="Configure global platform parameters"
        actions={
          <PermGate perm="settings.edit">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
            </button>
          </PermGate>
        }
      />

      {/* Trading Settings */}
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">Trading Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-muted block mb-1">Default Leverage</label>
            <input
              type="number"
              value={form.defaultLeverage ?? ''}
              onChange={(e) => setForm({ ...form, defaultLeverage: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Stop-Out Level (%)</label>
            <input
              type="number"
              step="0.1"
              value={form.stopOutLevel ?? ''}
              onChange={(e) => setForm({ ...form, stopOutLevel: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Max Open Positions Per User</label>
            <input
              type="number"
              value={form.maxOpenPositions ?? ''}
              onChange={(e) => setForm({ ...form, maxOpenPositions: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Max Lot Size</label>
            <input
              type="number"
              step="0.01"
              value={form.maxLotSize ?? ''}
              onChange={(e) => setForm({ ...form, maxLotSize: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
        </div>
      </div>

      {/* Financial Settings */}
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">Financial Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-muted block mb-1">Min Deposit ($)</label>
            <input
              type="number"
              value={form.minDeposit ?? ''}
              onChange={(e) => setForm({ ...form, minDeposit: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Max Deposit ($)</label>
            <input
              type="number"
              value={form.maxDeposit ?? ''}
              onChange={(e) => setForm({ ...form, maxDeposit: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Min Withdrawal ($)</label>
            <input
              type="number"
              value={form.minWithdrawal ?? ''}
              onChange={(e) => setForm({ ...form, minWithdrawal: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Max Withdrawal ($)</label>
            <input
              type="number"
              value={form.maxWithdrawal ?? ''}
              onChange={(e) => setForm({ ...form, maxWithdrawal: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">Security Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-muted block mb-1">Max Failed Login Attempts</label>
            <input
              type="number"
              value={form.maxFailedLogins ?? ''}
              onChange={(e) => setForm({ ...form, maxFailedLogins: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Session Timeout (minutes)</label>
            <input
              type="number"
              value={form.sessionTimeout ?? ''}
              onChange={(e) => setForm({ ...form, sessionTimeout: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.require2FA ?? false}
                onChange={(e) => setForm({ ...form, require2FA: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Require 2FA for all users</span>
            </label>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requireKycForWithdrawal ?? false}
                onChange={(e) => setForm({ ...form, requireKycForWithdrawal: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Require KYC for withdrawals</span>
            </label>
          </div>
        </div>
      </div>

      {/* Platform Settings */}
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">Platform Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-muted block mb-1">Platform Name</label>
            <input
              type="text"
              value={form.platformName ?? ''}
              onChange={(e) => setForm({ ...form, platformName: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Support Email</label>
            <input
              type="email"
              value={form.supportEmail ?? ''}
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.maintenanceMode ?? false}
                onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Maintenance Mode</span>
            </label>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowRegistration ?? false}
                onChange={(e) => setForm({ ...form, allowRegistration: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Allow New Registrations</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
