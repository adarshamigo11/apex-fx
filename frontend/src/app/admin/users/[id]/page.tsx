'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { appApi } from '@/lib/appApi';
import { StatusBadge, Modal, PermGate, Spinner } from '@/components/admin';

export default function AdminUserDetailPage() {
  // Load tokens from localStorage into module-level variables
  // so that API calls include the Authorization header
  appApi.loadTokens();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  // Wallet modal
  const [walletModal, setWalletModal] = useState<string | null>(null);
  const [walletAction, setWalletAction] = useState<'credit' | 'debit'>('credit');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');
  // Login/Device/IP/Security data
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [deviceHistory, setDeviceHistory] = useState<any[]>([]);
  const [ipHistory, setIpHistory] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const fetchUser = async () => {
    try {
      const d = await appApi.admin.users.detail(id);
      setData(d);
    } catch (e) {
      console.error('Failed to load user', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUser(); }, [id]);

  const fetchTabData = async (tab: string) => {
    setTabLoading(true);
    try {
      if (tab === 'logins') {
        const d = await appApi.admin.users.loginHistory(id);
        setLoginHistory(d.items || d || []);
      } else if (tab === 'devices') {
        const d = await appApi.admin.users.devices(id);
        setDeviceHistory(Array.isArray(d) ? d : d?.items || []);
      } else if (tab === 'ip') {
        const d = await appApi.admin.users.ipHistory(id);
        setIpHistory(d.items || d || []);
      } else if (tab === 'security') {
        const d = await appApi.admin.users.securityEvents(id);
        setSecurityEvents(d.items || d || []);
      }
    } catch (e) {
      console.error('Failed to load tab data', e);
    }
    setTabLoading(false);
  };

  useEffect(() => {
    if (activeTab !== 'profile' && activeTab !== 'kyc' && activeTab !== 'accounts') {
      fetchTabData(activeTab);
    }
  }, [activeTab]);

  const handleSetStatus = async (status: string) => {
    if (!confirm(`Set user status to ${status}?`)) return;
    setActionLoading(status);
    try {
      await appApi.admin.users.setStatus(id, status);
      await fetchUser();
    } catch (e: any) {
      alert(e.message || 'Failed');
    }
    setActionLoading('');
  };

  const handleFreeze = async () => {
    setActionLoading('freeze');
    try {
      await appApi.admin.users.freeze(id);
      await fetchUser();
    } catch (e: any) {
      alert(e.message || 'Failed');
    }
    setActionLoading('');
  };

  const handleKycDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!data?.kyc) return;
    const n = decision === 'REJECTED' ? prompt('Rejection note:') : undefined;
    setActionLoading('kyc');
    try {
      await appApi.admin.kyc.decide(data.kyc._id, decision, n || undefined);
      await fetchUser();
    } catch (e: any) {
      alert(e.message || 'Failed');
    }
    setActionLoading('');
  };

  const handleWalletAction = async () => {
    if (!walletAmount || !walletReason.trim()) return;
    setActionLoading('wallet');
    try {
      const userId = id;
      if (walletAction === 'credit') {
        await appApi.admin.wallet.credit(userId, parseFloat(walletAmount), walletReason.trim());
      } else {
        await appApi.admin.wallet.debit(userId, parseFloat(walletAmount), walletReason.trim());
      }
      setWalletModal(null);
      setWalletAmount('');
      setWalletReason('');
      await fetchUser();
    } catch (e: any) {
      alert(e.message || 'Failed');
    }
    setActionLoading('');
  };

  const handleBalanceAdjust = async () => {
    if (!walletModal || !walletAmount || !walletReason.trim()) return;
    setActionLoading('balance');
    try {
      await appApi.admin.balance.adjust(walletModal, parseFloat(walletAmount), walletReason.trim());
      setWalletModal(null);
      setWalletAmount('');
      setWalletReason('');
      await fetchUser();
    } catch (e: any) {
      alert(e.message || 'Failed');
    }
    setActionLoading('');
  };

  if (loading) return <Spinner />;
  if (!data?.user) return <p className="text-center text-muted py-12">User not found</p>;

  const { user, wallet, kyc, accounts } = data;
  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'kyc', label: 'KYC' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'logins', label: 'Login History' },
    { id: 'devices', label: 'Devices' },
    { id: 'ip', label: 'IP History' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/admin/users')} className="text-sm text-muted hover:text-[var(--text)] flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Users
      </button>

      {/* User info card */}
      <div className="glass rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#39ff8b] to-[#ffd166] flex items-center justify-center text-2xl font-bold text-[#0a0e1a]">
              {(user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{user.firstName} {user.lastName}</h1>
              <p className="text-muted">{user.email}</p>
              <StatusBadge status={user.status} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermGate perm="users.edit">
              <button onClick={() => handleSetStatus('ACTIVE')} disabled={actionLoading === 'ACTIVE' || user.status === 'ACTIVE'} className="px-3 py-1.5 rounded-lg bg-[#39ff8b]/10 text-[#39ff8b] hover:bg-[#39ff8b]/20 disabled:opacity-50 text-xs">Activate</button>
              <button onClick={() => handleSetStatus('SUSPENDED')} disabled={actionLoading === 'SUSPENDED' || user.status === 'SUSPENDED'} className="px-3 py-1.5 rounded-lg bg-[#ffd166]/10 text-[#ffd166] hover:bg-[#ffd166]/20 disabled:opacity-50 text-xs">Suspend</button>
              <button onClick={handleFreeze} disabled={actionLoading === 'freeze' || user.status === 'FROZEN'} className="px-3 py-1.5 rounded-lg bg-[#66b2ff]/10 text-[#66b2ff] hover:bg-[#66b2ff]/20 disabled:opacity-50 text-xs">Freeze</button>
              <button onClick={() => handleSetStatus('BANNED')} disabled={actionLoading === 'BANNED' || user.status === 'BANNED'} className="px-3 py-1.5 rounded-lg bg-[#ff5d6c]/10 text-[#ff5d6c] hover:bg-[#ff5d6c]/20 disabled:opacity-50 text-xs">Ban</button>
            </PermGate>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-muted">Role</p><p className="font-medium">{user.roleName}</p></div>
          <div><p className="text-muted">Phone</p><p className="font-medium">{user.phone || 'Not set'}</p></div>
          <div><p className="text-muted">2FA</p><p className="font-medium">{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p></div>
          <div><p className="text-muted">Email Verified</p><p className="font-medium">{user.emailVerified ? 'Yes' : 'No'}</p></div>
          <div><p className="text-muted">Last Login</p><p className="font-medium">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</p></div>
          <div><p className="text-muted">Joined</p><p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p></div>
          <div><p className="text-muted">User ID</p><p className="font-medium text-xs font-mono">{user._id}</p></div>
        </div>
      </div>

      {/* Wallet quick actions */}
      {wallet && (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Wallet</h2>
              <p className="text-2xl font-bold text-[#39ff8b] mt-1">${Number(wallet.balance || 0).toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <PermGate perm="wallet.credit">
                <button onClick={() => { setWalletAction('credit'); setWalletModal('wallet'); setWalletAmount(''); setWalletReason(''); }} className="px-3 py-1.5 rounded-lg bg-[#39ff8b]/10 text-[#39ff8b] text-xs hover:bg-[#39ff8b]/20">Credit</button>
              </PermGate>
              <PermGate perm="wallet.debit">
                <button onClick={() => { setWalletAction('debit'); setWalletModal('wallet'); setWalletAmount(''); setWalletReason(''); }} className="px-3 py-1.5 rounded-lg bg-[#ff5d6c]/10 text-[#ff5d6c] text-xs hover:bg-[#ff5d6c]/20">Debit</button>
              </PermGate>
              <PermGate perm="wallet.freeze">
                <button onClick={async () => { try { await appApi.admin.wallet.freeze(id); await fetchUser(); } catch(e: any) { alert(e.message); } }} className="px-3 py-1.5 rounded-lg bg-[#66b2ff]/10 text-[#66b2ff] text-xs hover:bg-[#66b2ff]/20">Freeze</button>
              </PermGate>
              <PermGate perm="wallet.unfreeze">
                <button onClick={async () => { try { await appApi.admin.wallet.unfreeze(id); await fetchUser(); } catch(e: any) { alert(e.message); } }} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-xs hover:bg-[var(--border)]">Unfreeze</button>
              </PermGate>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 glass rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-[#39ff8b]/10 text-[#39ff8b]' : 'text-muted hover:text-[var(--text)]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="glass rounded-xl p-6">
        {tabLoading ? <Spinner size="sm" /> : (
          <>
            {/* KYC Tab */}
            {activeTab === 'kyc' && kyc && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">KYC Verification</h2>
                  {kyc.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleKycDecision('APPROVED')} disabled={actionLoading === 'kyc'} className="px-3 py-1 rounded-lg bg-[#39ff8b]/10 text-[#39ff8b] hover:bg-[#39ff8b]/20 text-sm">Approve</button>
                      <button onClick={() => handleKycDecision('REJECTED')} disabled={actionLoading === 'kyc'} className="px-3 py-1 rounded-lg bg-[#ff5d6c]/10 text-[#ff5d6c] hover:bg-[#ff5d6c]/20 text-sm">Reject</button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-muted">Status</p><StatusBadge status={kyc.status} /></div>
                  <div><p className="text-muted">Full Name</p><p className="font-medium">{kyc.fullName}</p></div>
                  <div><p className="text-muted">Country</p><p className="font-medium">{kyc.country}</p></div>
                  <div><p className="text-muted">Document</p><p className="font-medium">{kyc.documentType}: {kyc.documentNumber}</p></div>
                </div>
              </div>
            )}
            {activeTab === 'kyc' && !kyc && <p className="text-muted text-center py-8">No KYC submission</p>}

            {/* Accounts Tab */}
            {activeTab === 'accounts' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Trading Accounts ({accounts?.length || 0})</h2>
                {accounts?.length === 0 ? <p className="text-muted text-sm">No trading accounts</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted border-b border-[var(--border)]"><th className="pb-2 pr-4">Login</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Balance</th><th className="pb-2 pr-4">Leverage</th><th className="pb-2">Actions</th></tr></thead>
                      <tbody>
                        {accounts?.map((acc: any) => (
                          <tr key={acc._id} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-3 pr-4 font-medium">{acc.login}</td>
                            <td className="py-3 pr-4">{acc.type}</td>
                            <td className="py-3 pr-4">${Number(acc.balance || 0).toFixed(2)}</td>
                            <td className="py-3 pr-4">1:{acc.leverage}</td>
                            <td className="py-3">
                              <button onClick={() => { setWalletModal(acc._id); setWalletAction('credit'); setWalletAmount(''); setWalletReason(''); }} className="text-[#39ff8b] hover:underline text-sm">Adjust Balance</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div><p className="text-muted">First Name</p><p className="font-medium">{user.firstName}</p></div>
                <div><p className="text-muted">Last Name</p><p className="font-medium">{user.lastName}</p></div>
                <div><p className="text-muted">Email</p><p className="font-medium">{user.email}</p></div>
                <div><p className="text-muted">Phone</p><p className="font-medium">{user.phone || 'Not set'}</p></div>
                <div><p className="text-muted">Date of Birth</p><p className="font-medium">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not set'}</p></div>
                <div><p className="text-muted">Country</p><p className="font-medium">{user.country || 'Not set'}</p></div>
              </div>
            )}

            {/* Login History Tab */}
            {activeTab === 'logins' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Login History</h2>
                {loginHistory.length === 0 ? <p className="text-muted text-center py-8">No login history</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted border-b border-[var(--border)]"><th className="pb-2 pr-4">Time</th><th className="pb-2 pr-4">IP</th><th className="pb-2 pr-4">Device</th><th className="pb-2">Success</th></tr></thead>
                      <tbody>
                        {loginHistory.map((l: any, i: number) => (
                          <tr key={i} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-2 pr-4 text-xs">{new Date(l.createdAt || l.timestamp).toLocaleString()}</td>
                            <td className="py-2 pr-4 font-mono text-xs">{l.ip || '-'}</td>
                            <td className="py-2 pr-4 text-xs">{l.userAgent?.slice(0, 40) || l.device || '-'}</td>
                            <td className="py-2">{l.success !== false ? <span className="text-[#39ff8b]">Yes</span> : <span className="text-[#ff5d6c]">No</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Device History Tab */}
            {activeTab === 'devices' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Device History</h2>
                {deviceHistory.length === 0 ? <p className="text-muted text-center py-8">No device history</p> : (
                  <div className="space-y-3">
                    {deviceHistory.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                        <div>
                          <p className="text-sm font-medium">{d.deviceType || 'Unknown'} - {d.os || 'N/A'}</p>
                          <p className="text-xs text-muted">{d.browser || ''} {d.fingerprint ? `| FP: ${d.fingerprint.slice(0, 12)}...` : ''}</p>
                        </div>
                        <span className="text-xs text-muted">{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* IP History Tab */}
            {activeTab === 'ip' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">IP History</h2>
                {ipHistory.length === 0 ? <p className="text-muted text-center py-8">No IP history</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted border-b border-[var(--border)]"><th className="pb-2 pr-4">IP</th><th className="pb-2 pr-4">City</th><th className="pb-2 pr-4">Country</th><th className="pb-2 pr-4">ISP</th><th className="pb-2">Date</th></tr></thead>
                      <tbody>
                        {ipHistory.map((ip: any, i: number) => (
                          <tr key={i} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-2 pr-4 font-mono text-xs">{ip.ip}</td>
                            <td className="py-2 pr-4 text-xs">{ip.city || '-'}</td>
                            <td className="py-2 pr-4 text-xs">{ip.country || '-'}</td>
                            <td className="py-2 pr-4 text-xs">{ip.isp || '-'}</td>
                            <td className="py-2 text-xs text-muted">{ip.createdAt ? new Date(ip.createdAt).toLocaleString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Security Events Tab */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Security Events</h2>
                {securityEvents.length === 0 ? <p className="text-muted text-center py-8">No security events</p> : (
                  <div className="space-y-3">
                    {securityEvents.map((e: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                        <div>
                          <StatusBadge status={e.type} />
                          <p className="text-xs text-muted mt-1">{e.description || '-'}</p>
                          {e.ip && <p className="text-xs font-mono text-muted">{e.ip}</p>}
                        </div>
                        <span className="text-xs text-muted">{e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Wallet Credit/Debit Modal */}
      <Modal open={walletModal === 'wallet'} onClose={() => setWalletModal(null)} title={walletAction === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">Amount ($)</label>
            <input type="number" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} placeholder="e.g. 100" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Reason</label>
            <input type="text" value={walletReason} onChange={(e) => setWalletReason(e.target.value)} placeholder="e.g. Bonus credit" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleWalletAction} disabled={!walletAmount || !walletReason.trim() || actionLoading === 'wallet'} className={`flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 ${walletAction === 'credit' ? 'bg-[#39ff8b] text-[#0a0e1a]' : 'bg-[#ff5d6c] text-white'}`}>
              {actionLoading === 'wallet' ? 'Processing...' : walletAction === 'credit' ? 'Credit' : 'Debit'}
            </button>
            <button onClick={() => setWalletModal(null)} className="flex-1 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Balance Adjust Modal (for trading accounts) */}
      <Modal open={walletModal !== null && walletModal !== 'wallet'} onClose={() => setWalletModal(null)} title="Adjust Balance">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">Amount (positive to add, negative to deduct)</label>
            <input type="number" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} placeholder="e.g. 100 or -50" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Reason</label>
            <input type="text" value={walletReason} onChange={(e) => setWalletReason(e.target.value)} placeholder="e.g. Bonus credit" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleBalanceAdjust} disabled={!walletAmount || !walletReason.trim() || actionLoading === 'balance'} className="flex-1 py-2.5 rounded-xl bg-[#39ff8b] text-[#0a0e1a] font-medium disabled:opacity-50 text-sm">Confirm</button>
            <button onClick={() => setWalletModal(null)} className="flex-1 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
