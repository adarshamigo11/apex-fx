'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatusBadge, SearchInput, Spinner, EmptyState, Pagination, ConfirmDialog } from '@/components/admin';
import Link from 'next/link';

export default function EmployeesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);

  const load = () => {
    setLoading(true);
    appApi.admin.employees.list({ q, status: statusFilter || undefined, page, limit: 20 })
      .then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [q, page, statusFilter]);

  const handleAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.action === 'suspend') await appApi.admin.employees.suspend(confirmAction.id);
      else if (confirmAction.action === 'activate') await appApi.admin.employees.activate(confirmAction.id);
      else if (confirmAction.action === 'forceLogout') await appApi.admin.employees.forceLogout(confirmAction.id);
      load();
    } catch (e: any) { alert(e.message); }
    setConfirmAction(null);
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${data?.total ?? 0} total employees`}
        actions={<Link href="/admin/employees/create" className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] text-sm font-semibold hover:opacity-90">+ New Employee</Link>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput value={q} onChange={setQ} placeholder="Search employees..." />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {loading ? <Spinner /> : !data?.items?.length ? <EmptyState icon="👔" title="No employees found" description="Create your first employee to get started" /> : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((emp: any) => (
                  <tr key={emp._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/employees/${emp._id}`} className="font-medium hover:text-[#39ff8b] transition-colors">
                        {emp.firstName} {emp.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{emp.email}</td>
                    <td className="px-4 py-3"><StatusBadge status={emp.roleName} /></td>
                    <td className="px-4 py-3 text-muted">{emp.profile?.department || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {emp.status === 'ACTIVE' ? (
                          <button onClick={() => setConfirmAction({ id: emp._id, action: 'suspend' })} className="px-2 py-1 text-xs rounded bg-[#ff5d6c]/10 text-[#ff5d6c] hover:bg-[#ff5d6c]/20">Suspend</button>
                        ) : emp.status === 'SUSPENDED' ? (
                          <button onClick={() => setConfirmAction({ id: emp._id, action: 'activate' })} className="px-2 py-1 text-xs rounded bg-[#39ff8b]/10 text-[#39ff8b] hover:bg-[#39ff8b]/20">Activate</button>
                        ) : null}
                        <button onClick={() => setConfirmAction({ id: emp._id, action: 'forceLogout' })} className="px-2 py-1 text-xs rounded bg-[var(--surface)] text-muted hover:text-[var(--text)]">Logout</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAction}
        title={`${confirmAction?.action === 'suspend' ? 'Suspend' : confirmAction?.action === 'activate' ? 'Activate' : 'Force Logout'} Employee`}
        message={`Are you sure you want to ${confirmAction?.action} this employee?`}
        confirmText={confirmAction?.action === 'suspend' ? 'Suspend' : 'Confirm'}
        danger={confirmAction?.action === 'suspend'}
      />
    </div>
  );
}
