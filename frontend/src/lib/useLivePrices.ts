'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Tick { symbol: string; bid: number; ask: number; spread: number; high: number; low: number; }

export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, Tick>>({});
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const socket: Socket = io(base, { auth: { token: typeof window !== 'undefined' ? localStorage.getItem('at') : '' } });
    socket.on('connect', () => socket.emit('subscribe:market'));
    socket.on('prices', (batch: Tick[]) =>
      setPrices((prev) => { const next = { ...prev }; for (const t of batch) next[t.symbol] = t; return next; }));
    return () => { socket.disconnect(); };
  }, []);
  return prices;
}
