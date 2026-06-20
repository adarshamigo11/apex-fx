'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatusBadge, Spinner, DetailRow, PermGate } from '@/components/admin';

export default function AdminApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [approval, setApproval] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await appApi.admin.approvals.list({ limit: 1000 });
      const items = data.items || [];
      const found = items.find((a: any) => a._id === id);
      setApproval(found || null);
    } catch (e) {
      console.error('Failed to load approval', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await appApi.admin.approvals.approve(id, note || undefined);
      setNote('');
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to approve');
    }
    setActionLoading('');
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      await appApi.admin.approvals.reject(id, note || undefined);
      setNote('');
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to reject');
    }
    setActionLoading('');
  };

  if (loading) return <Spinner />;
  if (!approval) return <p className="text-center text-muted py-12">Approval not found</p>;

  return (
    <div>
      <button onClick={() => router.push('/admin/approvals')} className="text-sm text-muted hover:text-[var(--text)] flex items-center gap-2 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Approvals
      </button>

      <PageHeader
        title={`${approval.type} Approval`}
        subtitle={`Approval #${String(approval._id).slice(0, 8)}`}
        actions={approval.status === 'PENDING' ? (
          <div className="flex gap-2">
            <PermGate perm="approval.approve">
              <button onClick={handleApprove} disabled={actionLoading === 'approve'} className="px-4 py-2 rounded-xl bg-[#39ff8b]/10 text-[#39ff8b] hover:bg-[#39ff8b]/20 text-sm font-medium disabled:opacity-50">
                {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
              </button>
            </PermGate>
            <PermGate perm="approval.reject">
              <button onClick={handleReject} disabled={actionLoading === 'reject'} className="px-4 py-2 rounded-xl bg-[#ff5d6c]/10 text-[#ff5d6c] hover:bg-[#ff5d6c]/20 text-sm font-medium disabled:opacity-50">
                {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
              </button>
            </PermGate>
          </div>
        ) : undefined}
      />

      {/* Approval Info */}
      <div className="glass rounded-xl p-6 mb-6">
        <DetailRow label="Status" value={<StatusBadge status={approval.status} />} />
        <DetailRow label="Type" value={approval.type} />
        <DetailRow label="Entity" value={approval.entity} />
        {approval.entityId && <DetailRow label="Entity ID" value={<span className="font-mono text-xs">{approval.entityId}</span>} />}
        <DetailRow label="Requested By" value={<span className="font-mono text-xs">{approval.requestedBy}</span>} />
        <DetailRow label="Level" value={`${approval.currentLevel || 0} / ${approval.totalLevels || 1}`} />
        <DetailRow label="Created" value={new Date(approval.createdAt).toLocaleString()} />
      </div>

      {/* Approval Chain */}
      {approval.approvedBy?.length > 0 && (
        <div className="glass rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Approval Chain</h2>
          <div className="space-y-3">
            {approval.approvedBy.map((slot: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    slot.status === 'APPROVED' ? 'bg-[#39ff8b]/15 text-[#39ff8b]' :
                    slot.status === 'REJECTED' ? 'bg-[#ff5d6c]/15 text-[#ff5d6c]' :
                    'bg-[var(--surface)] text-muted'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{slot.approverId ? String(slot.approverId).slice(0, 10) + '...' : 'Pending'}</p>
                    {slot.note && <p className="text-xs text-muted">{slot.note}</p>}
                  </div>
                </div>
                <div className="text-right">
                  {slot.status && <StatusBadge status={slot.status} />}
                  {slot.approvedAt && <p className="text-xs text-muted mt-1">{new Date(slot.approvedAt).toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note Input */}
      {approval.status === 'PENDING' && (
        <div className="glass rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4">Add Note</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for your decision..."
            className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm resize-none h-24 focus:outline-none focus:border-[#39ff8b]"
          />
        </div>
      )}
    </div>
  );
}
