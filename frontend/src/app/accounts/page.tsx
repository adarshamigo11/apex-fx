'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { appApi } from '../../lib/appApi';

function fmt(n: number | null | undefined, d = 2) {
  return (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [liveTypes, setLiveTypes] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [leverage, setLeverage] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string>('');

  useEffect(() => {
    appApi.loadTokens();
    appApi.accounts().then((accs: any[]) => {
      setAccounts(accs);
      if (accs.length > 0) setActiveAccountId(accs[0]._id);
    }).catch(() => {});
    appApi.liveAccountTypes().then(setLiveTypes).catch(() => {});
    appApi.profile().then((p: any) => {
      if (p?.activeAccountId) setActiveAccountId(p.activeAccountId);
    }).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!selectedType) return;
    setMsg(null);
    setCreating(true);
    try {
      const body: any = { accountTypeId: selectedType._id };
      if (leverage) body.leverage = parseInt(leverage);
      if (currency) body.currency = currency;
      await appApi.createAccount(body);
      setMsg({ text: `${selectedType.displayName || selectedType.name} account created!`, ok: true });
      setShowCreate(false);
      setSelectedType(null);
      setLeverage('');
      const accs = await appApi.accounts();
      setAccounts(accs);
    } catch (e: any) {
      setMsg({ text: e.message || 'Failed to create account', ok: false });
    }
    setCreating(false);
  };

  const handleSwitch = async (accountId: string) => {
    setSwitching(accountId);
    try {
      await appApi.switchAccount(accountId);
      setActiveAccountId(accountId);
      router.push('/dashboard');
    } catch (e: any) {
      alert(e.message || 'Failed to switch account');
    }
    setSwitching(null);
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Trading Accounts</h1>
          <p className="text-xs text-muted">Manage your trading accounts</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-[#39ff8b] text-[#0a0e1a] text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition">
          + Open New Account
        </button>
      </header>

      {msg && (
        <div className={`text-xs mb-4 p-3 rounded-xl ${msg.ok ? 'bg-[#39ff8b]/10 text-[#39ff8b]' : 'bg-[#ff5d6c]/10 text-[#ff5d6c]'}`}>
          {msg.text}
        </div>
      )}

      {/* Create Account Panel */}
      {showCreate && (
        <section className="glass rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold mb-4">Open a New Live Account</h2>

          {!selectedType ? (
            <>
              <p className="text-xs text-muted mb-3">Select an account type:</p>
              {liveTypes.length === 0 ? (
                <p className="text-xs text-muted">No live account types available. Contact support.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {liveTypes.map((t: any) => (
                    <button key={t._id} onClick={() => { setSelectedType(t); setLeverage(String(t.defaultLeverage || 500)); setCurrency(t.currency?.[0] || 'USD'); }}
                      className="glass rounded-xl p-4 text-left hover:ring-1 hover:ring-[#39ff8b]/40 transition-all">
                      <h3 className="text-sm font-bold text-[#ffd166]">{t.displayName || t.name}</h3>
                      <div className="mt-2 space-y-1 text-[10px] text-muted">
                        <p>Min Deposit: <span className="text-[var(--text)]">${t.minDeposit ?? 0}</span></p>
                        <p>Spread: <span className="text-[var(--text)]">{t.spreadInfo || 'From 0.0 pips'}</span></p>
                        <p>Leverage: <span className="text-[var(--text)]">Up to 1:{t.maxLeverage ?? 500}</span></p>
                        {t.commission && <p>Commission: <span className="text-[var(--text)]">{t.commission}</span></p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="max-w-md space-y-4">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted">Selected Type</p>
                <p className="text-sm font-bold text-[#ffd166]">{selectedType.displayName || selectedType.name}</p>
                <button onClick={() => setSelectedType(null)} className="text-[10px] text-muted hover:text-[#39ff8b] mt-1">Change type</button>
              </div>

              <div>
                <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Leverage</label>
                <select value={leverage} onChange={e => setLeverage(e.target.value)}
                  className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none bg-transparent">
                  {[100, 200, 300, 500, 1000, 2000].filter(l => l <= (selectedType.maxLeverage || 2000)).map(l => (
                    <option key={l} value={l}>1:{l}</option>
                  ))}
                </select>
              </div>

              {selectedType.currency?.length > 1 && (
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none bg-transparent">
                    {selectedType.currency.map((c: string) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={creating}
                  className="flex-1 bg-[#39ff8b] text-[#0a0e1a] font-semibold rounded-lg py-2.5 text-sm hover:opacity-90 disabled:opacity-50 transition">
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
                <button onClick={() => { setShowCreate(false); setSelectedType(null); }}
                  className="flex-1 glass rounded-lg py-2.5 text-sm text-muted hover:text-white transition">
                  Cancel
                </button>
              </div>

              <p className="text-[10px] text-muted text-center">
                Live accounts are subject to verification. Status will be PENDING until approved.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Available Account Types (info cards) */}
      {liveTypes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Available Live Account Types</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveTypes.map((t: any) => (
              <div key={t._id} className="glass rounded-xl p-4">
                <h3 className="text-sm font-bold text-[#ffd166]">{t.displayName || t.name}</h3>
                <div className="mt-2 space-y-1 text-[10px] text-muted">
                  <p>Min Deposit: <span className="text-[var(--text)]">${t.minDeposit ?? 0}</span></p>
                  <p>Spread: <span className="text-[var(--text)]">{t.spreadInfo || 'Variable'}</span></p>
                  {t.commission && <p>Commission: <span className="text-[var(--text)]">{t.commission}</span></p>}
                  <p>Leverage: <span className="text-[var(--text)]">Up to 1:{t.maxLeverage ?? 500}</span></p>
                  {t.swapInfo && <p>Swap: <span className="text-[var(--text)]">{t.swapInfo}</span></p>}
                  {t.recommendedFor && <p className="pt-1 italic">Best for: {t.recommendedFor}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Your Accounts */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Your Accounts</h2>
        {accounts.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-muted text-sm">No accounts yet. Open one to start trading.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc: any) => {
              const isDemo = acc.accountCategory === 'DEMO' || acc.server?.startsWith('Demo');
              const isActive = acc._id === activeAccountId;
              return (
                <div key={acc._id} className={`glass rounded-xl p-4 transition-all ${isActive ? 'ring-1 ring-[#39ff8b]/40' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isDemo ? 'bg-[#66b2ff]/15 text-[#66b2ff]' : 'bg-[#39ff8b]/15 text-[#39ff8b]'
                      }`}>
                        {isDemo ? 'DEMO' : 'LIVE'}
                      </span>
                      <span className="text-sm font-semibold">{acc.type || acc.accountType || 'Standard'} #{acc.login}</span>
                      {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#39ff8b]/15 text-[#39ff8b] font-bold">ACTIVE</span>}
                      {acc.status === 'PENDING' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ffd166]/15 text-[#ffd166] font-bold">PENDING</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#39ff8b]">${fmt(acc.balance)}</p>
                        <p className="text-[10px] text-muted">Balance</p>
                      </div>
                      {!isActive && acc.status !== 'PENDING' && (
                        <button onClick={() => handleSwitch(acc._id)} disabled={switching === acc._id}
                          className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors disabled:opacity-50">
                          {switching === acc._id ? '...' : 'Switch'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-[var(--border)] text-[11px]">
                    <div>
                      <p className="text-muted">Leverage</p>
                      <p className="font-mono font-bold">1:{acc.leverage}</p>
                    </div>
                    <div>
                      <p className="text-muted">Currency</p>
                      <p className="font-mono font-bold">{acc.currency}</p>
                    </div>
                    <div>
                      <p className="text-muted">Server</p>
                      <p className="font-mono font-bold">{acc.server}</p>
                    </div>
                    <div>
                      <p className="text-muted">Status</p>
                      <p className={`font-mono font-bold ${acc.status === 'ACTIVE' ? 'text-[#39ff8b]' : 'text-[#ffd166]'}`}>{acc.status || 'ACTIVE'}</p>
                    </div>
                  </div>
                  {isDemo && (acc.investorPassword || acc.tradingPassword) && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-3 text-[10px]">
                      {acc.tradingPassword && <div><span className="text-muted">Trading Pass:</span> <span className="font-mono">{acc.tradingPassword}</span></div>}
                      {acc.investorPassword && <div><span className="text-muted">Investor Pass:</span> <span className="font-mono">{acc.investorPassword}</span></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
