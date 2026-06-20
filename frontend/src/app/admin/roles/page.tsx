'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';
import Link from 'next/link';
import { PageHeader, StatusBadge, Spinner, Modal, PermGate } from '@/components/admin';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-[#ffd166]/20 text-[#ffd166]',
  ADMIN: 'bg-[#66b2ff]/15 text-[#66b2ff]',
  OPERATIONS_MANAGER: 'bg-[#39ff8b]/15 text-[#39ff8b]',
  FINANCE_MANAGER: 'bg-purple-500/15 text-purple-400',
  RISK_MANAGER: 'bg-[#ff5d6c]/15 text-[#ff5d6c]',
  COMPLIANCE_OFFICER: 'bg-cyan-500/15 text-cyan-400',
  SUPPORT_MANAGER: 'bg-orange-500/15 text-orange-400',
  SUPPORT_AGENT: 'bg-orange-500/10 text-orange-400',
  SALES_MANAGER: 'bg-pink-500/15 text-pink-400',
  SALES_AGENT: 'bg-pink-500/10 text-pink-400',
  AFFILIATE_MANAGER: 'bg-indigo-500/15 text-indigo-400',
  MARKETING_MANAGER: 'bg-rose-500/15 text-rose-400',
  AUDITOR: 'bg-teal-500/15 text-teal-400',
  READ_ONLY_ANALYST: 'bg-gray-500/15 text-gray-400',
};

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ roleName: '', description: '', permissions: [] as string[] });
  const [allPerms, setAllPerms] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([appApi.admin.roles.list(), appApi.admin.permissions.matrix()]);
      setRoles(Array.isArray(r) ? r : r?.items || []);
      setAllPerms(p);
    } catch (e) {
      console.error('Failed to load roles', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.roleName.trim()) return;
    setSaving(true);
    try {
      await appApi.admin.roles.create(form);
      setShowCreate(false);
      setForm({ roleName: '', description: '', permissions: [] });
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to create role');
    }
    setSaving(false);
  };

  const togglePerm = (perm: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle={`${roles.length} roles configured`}
        actions={
          <PermGate perm="role.create">
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] text-sm font-medium hover:opacity-90 transition-opacity">
              Create Role
            </button>
          </PermGate>
        }
      />

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role: any) => (
          <Link key={role._id} href={`/admin/roles/${role._id}`} className="glass rounded-xl p-5 hover:border-[#39ff8b]/30 transition-colors block">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[role.roleName] || 'bg-[var(--surface)] text-[var(--muted)]'}`}>
                {role.roleName}
              </span>
              <span className="text-xs text-muted">{role.permissions?.length || 0} perms</span>
            </div>
            <h3 className="font-semibold text-base mb-1">{role.roleName?.replace(/_/g, ' ')}</h3>
            {role.description && <p className="text-xs text-muted mb-3">{role.description}</p>}
            {role.userCount != null && (
              <p className="text-xs text-muted">{role.userCount} users assigned</p>
            )}
            <div className="flex flex-wrap gap-1 mt-3">
              {(role.permissions || []).slice(0, 6).map((p: string) => (
                <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface)] text-muted">{p}</span>
              ))}
              {(role.permissions || []).length > 6 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface)] text-muted">+{role.permissions.length - 6}</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Create Role Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Role" size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">Role Name</label>
            <input
              type="text"
              value={form.roleName}
              onChange={(e) => setForm({ ...form, roleName: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
              placeholder="e.g. SENIOR_ANALYST"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Role description"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
            />
          </div>

          {/* Permissions */}
          {allPerms && (
            <div>
              <label className="text-sm text-muted block mb-2">Permissions ({form.permissions.length} selected)</label>
              <div className="max-h-64 overflow-y-auto space-y-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                {Object.entries(allPerms).map(([module, perms]: [string, any]) => (
                  <div key={module}>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">{module}</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(perms) ? perms : []).map((p: string) => (
                        <button
                          key={p}
                          onClick={() => togglePerm(p)}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                            form.permissions.includes(p)
                              ? 'bg-[#39ff8b]/15 text-[#39ff8b]'
                              : 'bg-[var(--surface)] text-muted hover:text-[var(--text)]'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={handleCreate} disabled={saving || !form.roleName.trim()} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-medium hover:opacity-90 disabled:opacity-50 text-sm">
              {saving ? 'Creating...' : 'Create Role'}
            </button>
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
