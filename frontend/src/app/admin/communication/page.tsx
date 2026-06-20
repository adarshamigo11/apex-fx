'use client';
import { useEffect, useState, useCallback } from 'react';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatusBadge, Spinner, Pagination, FilterTabs, Modal, PermGate } from '@/components/admin';

const TABS = [
  { value: '', label: 'All' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'BROADCAST', label: 'Broadcast' },
];

export default function AdminCommunicationPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const [showSend, setShowSend] = useState<string | null>(null); // 'email', 'sms', 'broadcast'
  const [form, setForm] = useState<any>({ userId: '', subject: '', body: '', message: '', channel: 'PUSH', filter: '' });
  const [sending, setSending] = useState(false);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (tab) params.type = tab;
      const data = await appApi.admin.communication.history(params);
      setHistory(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load communication history', e);
    }
    setLoading(false);
  }, [page, tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  const handleSend = async () => {
    setSending(true);
    try {
      if (showSend === 'email') {
        await appApi.admin.communication.email(form.userId, form.subject, form.body);
      } else if (showSend === 'sms') {
        await appApi.admin.communication.sms(form.userId, form.message);
      } else if (showSend === 'broadcast') {
        await appApi.admin.communication.broadcast({ ...form });
      }
      setShowSend(null);
      setForm({ userId: '', subject: '', body: '', message: '', channel: 'PUSH', filter: '' });
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to send');
    }
    setSending(false);
  };

  return (
    <div>
      <PageHeader
        title="Communication"
        subtitle={`${total} messages sent`}
        actions={
          <div className="flex gap-2">
            <PermGate perm="communication.send_email">
              <button onClick={() => setShowSend('email')} className="px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm transition-colors">
                Send Email
              </button>
            </PermGate>
            <PermGate perm="communication.send_sms">
              <button onClick={() => setShowSend('sms')} className="px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm transition-colors">
                Send SMS
              </button>
            </PermGate>
            <PermGate perm="communication.broadcast">
              <button onClick={() => setShowSend('broadcast')} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] text-sm font-medium hover:opacity-90">
                Broadcast
              </button>
            </PermGate>
          </div>
        }
      />

      <FilterTabs tabs={TABS} active={tab} onChange={(v) => { setTab(v); setPage(1); }} />

      {/* History */}
      <div className="glass rounded-xl overflow-hidden mt-6">
        {loading ? (
          <Spinner />
        ) : history.length === 0 ? (
          <p className="text-center text-muted py-12">No communication history</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="p-4">Type</th>
                  <th className="p-4">Channel</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Sent By</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]">
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded bg-[var(--surface)] font-medium">{h.type || h.channel}</span>
                    </td>
                    <td className="p-4 text-muted">{h.channel || '-'}</td>
                    <td className="p-4">
                      <p className="font-medium truncate max-w-xs">{h.subject || h.message?.slice(0, 50) || '-'}</p>
                    </td>
                    <td className="p-4 text-xs font-mono">{h.sentBy ? String(h.sentBy).slice(0, 10) + '...' : '-'}</td>
                    <td className="p-4"><StatusBadge status={h.status || 'SENT'} /></td>
                    <td className="p-4 text-muted text-xs whitespace-nowrap">{new Date(h.sentAt || h.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {/* Send Email Modal */}
      <Modal open={showSend === 'email'} onClose={() => setShowSend(null)} title="Send Email">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">User ID</label>
            <input type="text" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="Recipient user ID" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Subject</label>
            <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Email subject" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Body</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Email body" className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm resize-none h-32 focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={handleSend} disabled={sending || !form.userId || !form.subject || !form.body} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-medium hover:opacity-90 disabled:opacity-50 text-sm">
              {sending ? 'Sending...' : 'Send Email'}
            </button>
            <button onClick={() => setShowSend(null)} className="flex-1 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Send SMS Modal */}
      <Modal open={showSend === 'sms'} onClose={() => setShowSend(null)} title="Send SMS">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">User ID</label>
            <input type="text" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="Recipient user ID" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Message</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="SMS message" className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm resize-none h-24 focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={handleSend} disabled={sending || !form.userId || !form.message} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-medium hover:opacity-90 disabled:opacity-50 text-sm">
              {sending ? 'Sending...' : 'Send SMS'}
            </button>
            <button onClick={() => setShowSend(null)} className="flex-1 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Broadcast Modal */}
      <Modal open={showSend === 'broadcast'} onClose={() => setShowSend(null)} title="Broadcast Notification">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">Subject / Title</label>
            <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Notification title" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Message</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Notification message" className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm resize-none h-24 focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted block mb-1">Channel</label>
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]">
                <option value="PUSH">Push</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="IN_APP">In-App</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Filter (optional)</label>
              <input type="text" value={form.filter} onChange={(e) => setForm({ ...form, filter: e.target.value })} placeholder="e.g. ACTIVE users" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={handleSend} disabled={sending || !form.subject || !form.body} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-medium hover:opacity-90 disabled:opacity-50 text-sm">
              {sending ? 'Broadcasting...' : 'Broadcast'}
            </button>
            <button onClick={() => setShowSend(null)} className="flex-1 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
