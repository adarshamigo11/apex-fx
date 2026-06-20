'use client';

import { useState } from 'react';

const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'trade', title: 'Position Closed', desc: 'XAUUSD BUY +$234.50', time: '2 min ago', read: false },
  { id: '2', type: 'trade', title: 'Position Opened', desc: 'EURUSD SELL 0.5 lots @ 1.0892', time: '15 min ago', read: false },
  { id: '3', type: 'alert', title: 'Price Alert', desc: 'XAUUSD reached $2,680.00', time: '1 hour ago', read: false },
  { id: '4', type: 'system', title: 'KYC Approved', desc: 'Your identity verification has been approved', time: '3 hours ago', read: true },
  { id: '5', type: 'promo', title: 'Deposit Bonus', desc: 'Get 20% bonus on deposits over $1,000', time: '1 day ago', read: true },
  { id: '6', type: 'trade', title: 'Stop Loss Triggered', desc: 'GBPUSD BUY -$45.00', time: '1 day ago', read: true },
  { id: '7', type: 'system', title: 'Maintenance Notice', desc: 'Scheduled maintenance on Jan 15, 2:00-4:00 UTC', time: '2 days ago', read: true },
  { id: '8', type: 'alert', title: 'Margin Warning', desc: 'Margin level below 150%', time: '3 days ago', read: true },
];

const TYPE_ICONS: Record<string, string> = {
  trade: '📈',
  alert: '⚠️',
  system: '🔔',
  promo: '🎉',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Notifications</h1>
          <p className="text-xs text-muted">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-neon hover:underline">
            Mark all read
          </button>
        )}
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === 'all' ? 'bg-neon/20 text-neon' : 'glass text-muted'}`}>
          All
        </button>
        <button onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === 'unread' ? 'bg-neon/20 text-neon' : 'glass text-muted'}`}>
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <section className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm text-muted">No notifications</p>
          </div>
        ) : (
          filtered.map(n => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`glass rounded-xl p-4 flex items-start gap-3 cursor-pointer transition hover:bg-[var(--surface)] ${
                !n.read ? 'border-l-2 border-neon' : ''
              }`}
            >
              <span className="text-xl shrink-0">{TYPE_ICONS[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium truncate ${!n.read ? '' : 'text-muted'}`}>{n.title}</p>
                  {!n.read && <span className="w-2 h-2 bg-neon rounded-full shrink-0" />}
                </div>
                <p className="text-xs text-muted truncate mt-0.5">{n.desc}</p>
              </div>
              <span className="text-[10px] text-muted whitespace-nowrap shrink-0">{n.time}</span>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
