'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatusBadge, DetailRow, Spinner, ConfirmDialog, Modal } from '@/components/admin';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'profile' | 'activity' | 'performance' | 'logins'>('profile');
  const [activity, setActivity] = useState<any>(null);
  const [perf, setPerf] = useState<any>(null);
  const [logins, setLogins] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [showTerminate, setShowTerminate] = useState(false);
  const [resetPw, setResetPw] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);

  useEffect(() => { appApi.admin.employees.detail(id).then(setData).finally(() => setLoading(false)); }, [id]);

  const loadTab = (t: string) => {
    setTab(t as any);
    if (t === 'activity' && !activity) appApi.admin.employees.activity(id).then(setActivity);
    if (t === 'performance' && !perf) appApi.admin.employees.performance(id).then(setPerf);
    if (t === 'logins' && !logins) appApi.admin.employees.loginHistory(id).then(setLogins);
  };

  const handleAction = async () => {
    if (confirmAction === 'suspend') await appApi.admin.employees.suspend(id);
    else if (confirmAction === 'activate') await appApi.admin.employees.activate(id);
    else if (confirmAction === 'forceLogout') await appApi.admin.employees.forceLogout(id);
    appApi.admin.employees.detail(id).then(setData);
    setConfirmAction(null);
  };

  const handleTerminate = async () => {
    await appApi.admin.employees.terminate(id, terminateReason);
    router.push('/admin/employees');
  };

  const handleResetPw = async () => {
    await appApi.admin.employees.resetPassword(id, resetPw);
    setShowResetPw(false);
    setResetPw('');
    alert('Password reset successfully');
  };

  if (loading) return <Spinner />;
  if (!data) return <p className="text-muted">Employee not found</p>;

  const { user, profile } = data;

  return (
    <div>
      <PageHeader
        title={`${user.firstName || ''} ${user.lastName || ''}`}
        subtitle={user.email}
        actions={
          <div className="flex gap-2">
            {user.status === 'ACTIVE' && <button onClick={() => setConfirmAction('suspend')} className="px-3 py-1.5 rounded-lg bg-[#ff5d6c]/10 text-[#ff5d6c] text-xs font-medium">Suspend</button>}
            {user.status === 'SUSPENDED' && <button onClick={() => setConfirmAction('activate')} className="px-3 py-1.5 rounded-lg bg-[#39ff8b]/10 text-[#39ff8b] text-xs font-medium">Activate</button>}
            <button onClick={() => setShowResetPw(true)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-xs font-medium">Reset Password</button>
            <button onClick={() => setConfirmAction('forceLogout')} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-xs font-medium">Force Logout</button>
            <button onClick={() => setShowTerminate(true)} className="px-3 py-1.5 rounded-lg bg-[#ff5d6c]/10 text-[#ff5d6c] text-xs font-medium">Terminate</button>
          </div>
        }
      />

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold mb-3">Profile</h3>
          <DetailRow label="Full Name" value={`${user.firstName || ''} ${user.lastName || ''}`} />
          <DetailRow label="Email" value={user.email} mono />
          <DetailRow label="Role" value={<StatusBadge status={user.roleName} />} />
          <DetailRow label="Status" value={<StatusBadge status={user.status} />} />
          <DetailRow label="Department" value={profile?.department || '-'} />
          <DetailRow label="Title" value={profile?.title || '-'} />
          <DetailRow label="Hired" value={profile?.hireDate ? new Date(profile.hireDate).toLocaleDateString() : '-'} />
          <DetailRow label="Last Login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'} />
        </div>
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold mb-3">Quick Stats</h3>
          {perf ? (
            <>
              <DetailRow label="Total Actions" value={perf.totalActions} />
              <DetailRow label="KYC Reviewed" value={perf.kycReviewed} />
              <DetailRow label="Tickets Resolved" value={perf.ticketsHandled} />
              <DetailRow label="Withdrawals Processed" value={perf.withdrawalsProcessed} />
              <DetailRow label="Deposits Processed" value={perf.depositsProcessed} />
            </>
          ) : (
            <div className="text-center py-4"><button onClick={() => { appApi.admin.employees.performance(id).then(setPerf); }} className="text-sm text-[#39ff8b]">Load stats</button></div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['profile', 'activity', 'performance', 'logins'] as const).map(t => (
          <button key={t} onClick={() => loadTab(t)} className={`px-4 py-2 rounded-lg text-sm ${tab === t ? 'bg-[#39ff8b]/10 text-[#39ff8b]' : 'bg-[var(--surface)] text-muted'}`}>
            {t === 'logins' ? 'Login History' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'activity' && (
        <div className="glass rounded-xl p-5">
          {activity?.items?.length ? activity.items.map((a: any) => (
            <div key={a._id} className="flex justify-between py-2 border-b border-[var(--border)] last:border-0 text-sm">
              <span>{a.action} {a.targetType && `→ ${a.targetType}`}</span>
              <span className="text-muted">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          )) : <p className="text-sm text-muted text-center py-4">No activity</p>}
        </div>
      )}

      {tab === 'performance' && perf && (
        <div className="glass rounded-xl p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Actions', value: perf.totalActions },
              { label: 'KYC Reviewed', value: perf.kycReviewed },
              { label: 'Tickets', value: perf.ticketsHandled },
              { label: 'Withdrawals', value: perf.withdrawalsProcessed },
              { label: 'Deposits', value: perf.depositsProcessed },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'logins' && (
        <div className="glass rounded-xl p-5">
          {logins?.items?.length ? logins.items.map((l: any) => (
            <div key={l._id} className="flex justify-between py-2 border-b border-[var(--border)] last:border-0 text-sm">
              <span>{l.ip || 'Unknown IP'} — {l.success ? '✅' : '❌'}</span>
              <span className="text-muted">{new Date(l.createdAt).toLocaleString()}</span>
            </div>
          )) : <p className="text-sm text-muted text-center py-4">No login history</p>}
        </div>
      )}

      <ConfirmDialog open={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={handleAction} title="Confirm Action" message={`Are you sure you want to ${confirmAction} this employee?`} confirmText="Confirm" danger={confirmAction === 'suspend' || confirmAction === 'terminate'} />

      <Modal open={showTerminate} onClose={() => setShowTerminate(false)} title="Terminate Employee">
        <p className="text-sm text-muted mb-3">This will permanently terminate this employee&apos;s access.</p>
        <textarea value={terminateReason} onChange={e => setTerminateReason(e.target.value)} placeholder="Reason for termination (required)" className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm mb-4 h-24 resize-none focus:outline-none focus:border-[#ff5d6c]" />
        <button onClick={handleTerminate} disabled={!terminateReason.trim()} className="w-full py-2.5 rounded-xl bg-[#ff5d6c] text-white text-sm font-medium hover:bg-[#ff5d6c]/80 disabled:opacity-50">Terminate Employee</button>
      </Modal>

      <Modal open={showResetPw} onClose={() => setShowResetPw(false)} title="Reset Password">
        <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="New password (min 8 chars)" minLength={8} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm mb-4 focus:outline-none focus:border-[#39ff8b]" />
        <button onClick={handleResetPw} disabled={!resetPw || resetPw.length < 8} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] text-sm font-semibold hover:opacity-90 disabled:opacity-50">Reset Password</button>
      </Modal>
    </div>
  );
}
