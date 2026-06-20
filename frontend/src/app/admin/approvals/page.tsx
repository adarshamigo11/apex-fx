'use client';
import { useEffect, useState, useCallback } from 'react';
import { appApi } from '@/lib/appApi';
import Link from 'next/link';
import { PageHeader, StatusBadge, FilterTabs, Spinner, Pagination, PermGate } from '@/components/admin';

const TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function AdminApprovalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (tab) params.status = tab;
      const data = await appApi.admin.approvals.list(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load approvals', e);
    }
    setLoading(false);
  }, [page, tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  const handleQuickAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await appApi.admin.approvals.approve(id);
      } else {
        await appApi.admin.approvals.reject(id);
      }
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed');
    }
  };

  return (
    <div>
      <PageHeader
        title="Approval Queue"
        subtitle={`${total} approval requests${items.filter(i => i.status === 'PENDING').length ? `, ${items.filter(i => i.status === 'PENDING').length} pending` : ''}`}
      />

      <FilterTabs tabs={TABS} active={tab} onChange={(v) => { setTab(v); setPage(1); }} />

      <div className="glass rounded-xl overflow-hidden mt-6">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <p className="text-center text-muted py-12">No approval requests</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="p-4">Type</th>
                  <th className="p-4">Entity</th>
                  <th className="p-4">Requested By</th>
                  <th className="p-4">Level</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a: any) => (
                  <tr key={a._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]">
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded bg-[var(--surface)] font-medium">{a.type}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{a.entity}</p>
                      {a.entityId && <p className="text-xs text-muted font-mono">{String(a.entityId).slice(0, 8)}...</p>}
                    </td>
                    <td className="p-4 text-xs font-mono">{String(a.requestedBy).slice(0, 10)}...</td>
                    <td className="p-4">
                      <span className="text-xs text-muted">
                        {a.currentLevel || 0}/{a.totalLevels || 1}
                      </span>
                    </td>
                    <td className="p-4"><StatusBadge status={a.status} /></td>
                    <td className="p-4 text-muted text-xs whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link href={`/admin/approvals/${a._id}`} className="text-[#66b2ff] hover:underline text-xs">View</Link>
                        {a.status === 'PENDING' && (
                          <>
                            <PermGate perm="approval.approve">
                              <button onClick={() => handleQuickAction(a._id, 'approve')} className="text-[#39ff8b] hover:underline text-xs">Approve</button>
                            </PermGate>
                            <PermGate perm="approval.reject">
                              <button onClick={() => handleQuickAction(a._id, 'reject')} className="text-[#ff5d6c] hover:underline text-xs">Reject</button>
                            </PermGate>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
