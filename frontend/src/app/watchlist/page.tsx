'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLivePrices, Tick } from '../../lib/useLivePrices';
import { useTheme } from '../../lib/useTheme';

const ALL_SYMBOLS = [
  { name: 'XAUUSD', label: 'Gold', kind: 'Gold' },
  { name: 'EURUSD', label: 'EUR/USD', kind: 'Forex' },
  { name: 'GBPUSD', label: 'GBP/USD', kind: 'Forex' },
  { name: 'USDJPY', label: 'USD/JPY', kind: 'Forex' },
  { name: 'US30', label: 'Dow Jones 30', kind: 'Indices' },
  { name: 'NAS100', label: 'Nasdaq 100', kind: 'Indices' },
  { name: 'BTCUSD', label: 'Bitcoin/USD', kind: 'Crypto' },
];

const CATEGORIES = ['All', 'Forex', 'Gold', 'Indices', 'Crypto'];

export default function WatchlistPage() {
  const prices = useLivePrices();
  const { theme, toggle } = useTheme();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('watchlist_favs') || '[]'); } catch { return []; }
  });

  const toggleFav = (sym: string) => {
    setFavorites((prev) => {
      const next = prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym];
      localStorage.setItem('watchlist_favs', JSON.stringify(next));
      return next;
    });
  };

  const filtered = useMemo(() => {
    return ALL_SYMBOLS.filter((s) => {
      if (category !== 'All' && s.kind !== category) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, category]);

  const favSymbols = ALL_SYMBOLS.filter((s) => favorites.includes(s.name));

  return (
    <main className="min-h-screen p-3 sm:p-4 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-3">
        <div>
          <h1 className="text-lg font-bold">Market Watch</h1>
          <p className="text-[10px] text-muted uppercase tracking-widest">Live prices</p>
        </div>
        <button onClick={toggle} className="glass rounded-full w-8 h-8 grid place-items-center text-sm">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Search */}
      <div className="relative mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbols..."
          className="w-full glass rounded-xl px-4 py-2.5 text-sm outline-none bg-transparent placeholder:text-muted"
        />
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              cat === category ? 'bg-neon/20 text-neon font-semibold' : 'glass text-muted'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Favorites */}
      {favSymbols.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs text-muted uppercase tracking-widest mb-2 px-1">Favorites</h2>
          <div className="space-y-2">
            {favSymbols.map((sym) => (
              <SymbolCard key={`fav-${sym.name}`} sym={sym} tick={prices[sym.name]} isFav onToggleFav={() => toggleFav(sym.name)} />
            ))}
          </div>
        </section>
      )}

      {/* All Symbols */}
      <section>
        <h2 className="text-xs text-muted uppercase tracking-widest mb-2 px-1">
          {category === 'All' ? 'All Symbols' : category}
        </h2>
        <div className="space-y-2">
          {filtered.map((sym) => (
            <SymbolCard key={sym.name} sym={sym} tick={prices[sym.name]} isFav={favorites.includes(sym.name)} onToggleFav={() => toggleFav(sym.name)} />
          ))}
        </div>
      </section>
    </main>
  );
}

function SymbolCard({ sym, tick, isFav, onToggleFav }: {
  sym: { name: string; label: string; kind: string };
  tick: Tick | undefined;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  return (
    <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onToggleFav} className={`text-sm ${isFav ? 'text-gold' : 'text-muted'}`} aria-label="Toggle favorite">
          {isFav ? '★' : '☆'}
        </button>
        <div>
          <p className="font-semibold text-sm">{sym.name}</p>
          <p className="text-[10px] text-muted">{sym.label} &middot; {sym.kind}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Prices */}
        <div className="text-right">
          <div className="flex gap-2 font-mono text-sm">
            <span className="text-loss">{tick ? tick.bid : '—'}</span>
            <span className="text-neon">{tick ? tick.ask : '—'}</span>
          </div>
          <div className="flex gap-2 text-[10px] text-muted mt-0.5">
            <span>Sp: {tick ? tick.spread : '—'}</span>
            <span>H: {tick ? tick.high : '—'}</span>
            <span>L: {tick ? tick.low : '—'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="hidden sm:flex items-center gap-1">
          <Link href={`/dashboard?symbol=${sym.name}`} className="text-[10px] glass rounded-lg px-2 py-1 hover:bg-neon/10">Chart</Link>
          <Link href={`/dashboard?symbol=${sym.name}&side=BUY`} className="text-[10px] bg-neon/10 text-neon rounded-lg px-2 py-1">Buy</Link>
          <Link href={`/dashboard?symbol=${sym.name}&side=SELL`} className="text-[10px] bg-loss/10 text-loss rounded-lg px-2 py-1">Sell</Link>
        </div>
      </div>
    </div>
  );
}
