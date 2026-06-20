'use client';

import { useEffect, useState } from 'react';
import { appApi } from '../../lib/appApi';

const ACCOUNT_TYPES = [
  { type: 'Standard', leverage: '1:500', spread: 'From 1.2 pips', minDeposit: 100, color: 'text-neon' },
  { type: 'Raw Spread', leverage: '1:500', spread: 'From 0.0 pips', minDeposit: 500, color: 'text-gold' },
  { type: 'VIP', leverage: '1:1000', spread: 'From 0.0 pips', minDeposit: 10000, color: 'text-purple-400' },
  { type: 'Demo', leverage: '1:500', spread: 'From 0.0 pips', minDeposit: 0, color: 'text-muted' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState('Standard');
  const [createName, setCreateName] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    appApi.loadTokens();
    appApi.accounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  const handleCreate = async () => {
    setMsg('');
    try {
      await appApi.createAccount({ type: createType, name: createName || `${createType} Account` });
      setMsg('Account created!');
      setShowCreate(false);
      setCreateName('');
      appApi.accounts().then(setAccounts);
    } catch { setMsg('Failed to create account'); }
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Trading Accounts</h1>
          <p className="text-xs text-muted">Manage your trading accounts</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="bg-neon text-black text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition">
          + New Account
        </button>
      </header>

      {msg && <p className="text-xs text-neon mb-4">{msg}</p>}

      {/* Create Account Modal */}
      {showCreate && (
        <section className="glass rounded-xl p-5 mb-6 max-w-md">
          <h2 className="text-sm font-semibold mb-3">Create New Account</h2>
          <div className="space-y-3">
            <select value={createType} onChange={e => setCreateType(e.target.value)}
              className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none bg-transparent">
              {ACCOUNT_TYPES.map(a => <option key={a.type} value={a.type}>{a.type}</option>)}
            </select>
            <input type="text" placeholder="Account name (optional)" value={createName} onChange={e => setCreateName(e.target.value)}
              className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none" />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 bg-neon text-black font-semibold rounded-lg py-2.5 text-sm">Create</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 glass rounded-lg py-2.5 text-sm text-muted">Cancel</button>
            </div>
          </div>
        </section>
      )}

      {/* Account Type Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {ACCOUNT_TYPES.map(at => (
          <div key={at.type} className="glass rounded-xl p-4">
            <h3 className={`text-sm font-bold ${at.color}`}>{at.type}</h3>
            <div className="mt-2 space-y-1 text-xs text-muted">
              <p>Leverage: <span className="text-[var(--text)]">{at.leverage}</span></p>
              <p>Spread: <span className="text-[var(--text)]">{at.spread}</span></p>
              <p>Min Deposit: <span className="text-[var(--text)]">${at.minDeposit}</span></p>
            </div>
          </div>
        ))}
      </section>

      {/* Active Accounts */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Your Accounts</h2>
        {accounts.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-muted text-sm">No accounts yet. Create one to start trading.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc: any, i: number) => (
              <div key={acc._id ?? i} className="glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{acc.name ?? `${acc.type ?? 'Standard'} Account`}</p>
                  <p className="text-[10px] text-muted">Type: {acc.type ?? 'Standard'} • Leverage: {acc.leverage ?? '1:500'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neon">${(acc.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-muted">Balance</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
