'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatusBadge, Spinner, DetailRow, PermGate } from '@/components/admin';

export default function AdminSupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await appApi.admin.support.detail(id);
      setTicket(data);
    } catch (e) {
      console.error('Failed to load ticket', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleEscalate = async () => {
    setActionLoading('escalate');
    try {
      await appApi.admin.support.escalate(id);
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to escalate');
    }
    setActionLoading('');
  };

  const handleResolve = async () => {
    if (!resolution.trim()) return;
    setActionLoading('resolve');
    try {
      await appApi.admin.support.resolve(id, resolution.trim());
      setResolution('');
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to resolve');
    }
    setActionLoading('');
  };

  if (loading) return <Spinner />;
  if (!ticket) return <p className="text-center text-muted py-12">Ticket not found</p>;

  return (
    <div>
      <button onClick={() => router.push('/admin/support')} className="text-sm text-muted hover:text-[var(--text)] flex items-center gap-2 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Tickets
      </button>

      <PageHeader
        title={ticket.subject || 'Support Ticket'}
        subtitle={`Ticket #${String(ticket._id).slice(0, 8)}`}
        actions={
          <div className="flex gap-2">
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <>
                <PermGate perm="support.escalate">
                  <button
                    onClick={handleEscalate}
                    disabled={actionLoading === 'escalate'}
                    className="px-4 py-2 rounded-xl bg-[#ffd166]/10 text-[#ffd166] hover:bg-[#ffd166]/20 text-sm transition-colors disabled:opacity-50"
                  >
                    Escalate
                  </button>
                </PermGate>
              </>
            )}
          </div>
        }
      />

      {/* Ticket Info */}
      <div className="glass rounded-xl p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted">Status</p>
            <StatusBadge status={ticket.status} />
          </div>
          <div>
            <p className="text-muted mt-1">Priority</p>
            <StatusBadge status={ticket.priority || 'MEDIUM'} />
          </div>
          <div>
            <p className="text-muted">User ID</p>
            <p className="font-mono text-xs">{ticket.userId}</p>
          </div>
          <div>
            <p className="text-muted">Created</p>
            <p className="text-xs">{new Date(ticket.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">Conversation</h2>
        {ticket.messages?.length ? (
          <div className="space-y-4">
            {ticket.messages.map((msg: any, i: number) => (
              <div key={i} className={`p-4 rounded-xl ${msg.sender === 'admin' ? 'bg-[#39ff8b]/5 border border-[#39ff8b]/20' : 'bg-[var(--surface)]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${msg.sender === 'admin' ? 'text-[#39ff8b]' : 'text-[#66b2ff]'}`}>
                    {msg.sender === 'admin' ? 'Admin' : 'User'} {msg.senderName ? `(${msg.senderName})` : ''}
                  </span>
                  <span className="text-xs text-muted">{new Date(msg.createdAt || msg.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.body || msg.message || msg.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-8">No messages in this ticket</p>
        )}
      </div>

      {/* Resolve Section */}
      {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
        <div className="glass rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4">Resolve Ticket</h2>
          <div className="space-y-3">
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Enter resolution details..."
              className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm resize-none h-24 focus:outline-none focus:border-[#39ff8b]"
            />
            <PermGate perm="support.resolve">
              <button
                onClick={handleResolve}
                disabled={!resolution.trim() || actionLoading === 'resolve'}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading === 'resolve' ? 'Resolving...' : 'Mark Resolved'}
              </button>
            </PermGate>
          </div>
        </div>
      )}

      {/* Ticket Metadata */}
      {ticket.category && (
        <div className="glass rounded-xl p-6 mt-6">
          <h2 className="font-semibold text-lg mb-4">Details</h2>
          <DetailRow label="Category" value={ticket.category} />
          {ticket.department && <DetailRow label="Department" value={ticket.department} />}
          {ticket.assignedTo && <DetailRow label="Assigned To" value={String(ticket.assignedTo).slice(0, 10) + '...'} />}
          {ticket.resolution && <DetailRow label="Resolution" value={ticket.resolution} />}
        </div>
      )}
    </div>
  );
}
