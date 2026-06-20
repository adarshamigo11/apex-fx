'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatusBadge, Spinner, Modal, ConfirmDialog, PermGate } from '@/components/admin';

export default function AdminRoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [role, setRole] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ description: '', permissions: [] as string[] });
  const [allPerms, setAllPerms] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roles, perms] = await Promise.all([appApi.admin.roles.list(), appApi.admin.permissions.matrix()]);
      const list = Array.isArray(roles) ? roles : roles?.items || [];
      const found = list.find((r: any) => r._id === id);
      if (found) {
        setRole(found);
        setForm({ description: found.description || '', permissions: found.permissions || [] });
      }
      setAllPerms(perms);
    } catch (e) {
      console.error('Failed to load role', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await appApi.admin.roles.update(id, form);
      setEditing(false);
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await appApi.admin.roles.delete(id);
      router.push('/admin/roles');
    } catch (e: any) {
      alert(e.message || 'Failed to delete role');
    }
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
  if (!role) return <p className="text-center text-muted py-12">Role not found</p>;

  return (
    <div>
      <button onClick={() => router.push('/admin/roles')} className="text-sm text-muted hover:text-[var(--text)] flex items-center gap-2 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Roles
      </button>

      <PageHeader
        title={role.roleName?.replace(/_/g, ' ')}
        subtitle={role.description || `${role.permissions?.length || 0} permissions`}
        actions={
          <div className="flex gap-2">
            {!editing ? (
              <PermGate perm="role.edit">
                <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm transition-colors">
                  Edit
                </button>
              </PermGate>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setForm({ description: role.description || '', permissions: role.permissions || [] }); }} className="px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm transition-colors">
                  Cancel
                </button>
              </>
            )}
            <PermGate perm="role.delete">
              <button onClick={() => setShowDelete(true)} className="px-4 py-2 rounded-xl bg-[#ff5d6c]/10 text-[#ff5d6c] hover:bg-[#ff5d6c]/20 text-sm transition-colors">
                Delete
              </button>
            </PermGate>
          </div>
        }
      />

      {/* Role Info */}
      <div className="glass rounded-xl p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted">Role Name</p>
            <p className="font-medium">{role.roleName}</p>
          </div>
          <div>
            <p className="text-muted">Users Assigned</p>
            <p className="font-medium">{role.userCount ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted">Permissions</p>
            <p className="font-medium">{role.permissions?.length || 0}</p>
          </div>
          <div>
            <p className="text-muted">System Role</p>
            <p className="font-medium">{role.system ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      {editing && (
        <div className="glass rounded-xl p-6 mb-6">
          <label className="text-sm text-muted block mb-1">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
          />
        </div>
      )}

      {/* Permissions Matrix */}
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">
          Permissions ({form.permissions.length} selected)
        </h2>
        {allPerms ? (
          <div className="space-y-6">
            {Object.entries(allPerms).map(([module, perms]: [string, any]) => {
              const permList = Array.isArray(perms) ? perms : [];
              const enabledCount = permList.filter((p: string) => form.permissions.includes(p)).length;
              return (
                <div key={module}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted">{module}</h3>
                    <span className="text-xs text-muted">{enabledCount}/{permList.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {permList.map((p: string) => {
                      const active = form.permissions.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() => editing && togglePerm(p)}
                          disabled={!editing}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                            active
                              ? 'bg-[#39ff8b]/15 text-[#39ff8b] font-medium'
                              : 'bg-[var(--surface)] text-muted'
                          } ${editing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">No permission data available</p>
        )}
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Role"
        message="Are you sure you want to delete this role? This action cannot be undone. Users with this role will need to be reassigned."
        confirmText="Delete Role"
        danger
      />
    </div>
  );
}
