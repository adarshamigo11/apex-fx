'use client';

import { useState } from 'react';

const MOCK_MONTHLY = [
  { month: 'Jan', profit: 1200, trades: 45, winRate: 62 },
  { month: 'Feb', profit: -340, trades: 38, winRate: 47 },
  { month: 'Mar', profit: 2100, trades: 52, winRate: 65 },
  { month: 'Apr', profit: 890, trades: 41, winRate: 58 },
  { month: 'May', profit: 1650, trades: 48, winRate: 63 },
  { month: 'Jun', profit: -120, trades: 35, winRate: 49 },
];

const STATS = [
  { label: 'Total Profit', value: '$5,380', color: 'text-neon' },
  { label: 'Win Rate', value: '61.2%', color: 'text-neon' },
  { label: 'Profit Factor', value: '1.85', color: 'text-gold' },
  { label: 'Total Trades', value: '259', color: 'text-[var(--text)]' },
  { label: 'Avg RRR', value: '1:2.3', color: 'text-gold' },
  { label: 'Max Drawdown', value: '-4.2%', color: 'text-loss' },
  { label: 'Best Trade', value: '+$890', color: 'text-neon' },
  { label: 'Worst Trade', value: '-$340', color: 'text-loss' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'1M' | '3M' | '6M' | 'ALL'>('6M');
  const maxProfit = Math.max(...MOCK_MONTHLY.map(m => Math.abs(m.profit)));

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-xs text-muted">Performance insights & statistics</p>
        </div>
        <div className="flex gap-1 glass rounded-lg p-0.5">
          {(['1M', '3M', '6M', 'ALL'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs rounded-md transition ${period === p ? 'bg-neon/20 text-neon font-medium' : 'text-muted'}`}
            >{p}</button>
          ))}
        </div>
      </header>

      {/* Summary Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {STATS.map(s => (
          <div key={s.label} className="glass rounded-xl p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Equity Curve (simplified bar chart) */}
      <section className="glass rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4">Monthly P&L</h2>
        <div className="flex items-end gap-2 h-40">
          {MOCK_MONTHLY.map(m => {
            const h = (Math.abs(m.profit) / maxProfit) * 100;
            const isPos = m.profit >= 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className={`text-[10px] font-medium ${isPos ? 'text-neon' : 'text-loss'}`}>
                  {isPos ? '+' : ''}${m.profit}
                </span>
                <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                  <div
                    className={`w-full rounded-t-md ${isPos ? 'bg-neon/60' : 'bg-loss/60'}`}
                    style={{ height: `${h}%`, minHeight: '4px' }}
                  />
                </div>
                <span className="text-[10px] text-muted">{m.month}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detailed Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Win/Loss Distribution */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Win/Loss Distribution</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neon">Wins (158)</span>
                <span>61.2%</span>
              </div>
              <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                <div className="h-full bg-neon rounded-full" style={{ width: '61.2%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-loss">Losses (101)</span>
                <span>38.8%</span>
              </div>
              <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                <div className="h-full bg-loss rounded-full" style={{ width: '38.8%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Risk Analysis</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
              <span className="text-muted">Sharpe Ratio</span><span className="font-medium">1.42</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
              <span className="text-muted">Sortino Ratio</span><span className="font-medium">2.15</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
              <span className="text-muted">Max Consecutive Wins</span><span className="font-medium text-neon">8</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
              <span className="text-muted">Max Consecutive Losses</span><span className="font-medium text-loss">4</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
              <span className="text-muted">Avg Holding Time</span><span className="font-medium">2h 15m</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted">Recovery Factor</span><span className="font-medium">3.2</span>
            </div>
          </div>
        </div>

        {/* Top Traded Pairs */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Top Pairs</h3>
          <div className="space-y-2">
            {[
              { pair: 'XAUUSD', trades: 78, pnl: 2340 },
              { pair: 'EURUSD', trades: 62, pnl: 1560 },
              { pair: 'GBPUSD', trades: 45, pnl: 890 },
              { pair: 'BTCUSD', trades: 34, pnl: -410 },
              { pair: 'USDJPY', trades: 40, pnl: 1000 },
            ].map(p => (
              <div key={p.pair} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="font-medium">{p.pair}</span>
                <span className="text-muted">{p.trades} trades</span>
                <span className={p.pnl >= 0 ? 'text-neon' : 'text-loss'}>{p.pnl >= 0 ? '+' : ''}${p.pnl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trading Sessions */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Best Sessions</h3>
          <div className="space-y-2">
            {[
              { session: 'London', pnl: 2800, winRate: 65 },
              { session: 'New York', pnl: 1900, winRate: 60 },
              { session: 'Asia', pnl: 680, winRate: 55 },
            ].map(s => (
              <div key={s.session} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="font-medium">{s.session}</span>
                <span className="text-muted">{s.winRate}% WR</span>
                <span className="text-neon">+${s.pnl}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
