'use client';

import { useState } from 'react';

type Impact = 'High' | 'Medium' | 'Low';
type Country = 'US' | 'EU' | 'UK' | 'JP' | 'AU' | 'CH';

interface EconomicEvent {
  id: string;
  time: string;
  country: Country;
  impact: Impact;
  event: string;
  actual?: string;
  forecast?: string;
  previous: string;
}

const MOCK_EVENTS: EconomicEvent[] = [
  { id: '1', time: '08:30', country: 'US', impact: 'High', event: 'Non-Farm Payrolls', forecast: '180K', previous: '216K' },
  { id: '2', time: '08:30', country: 'US', impact: 'High', event: 'Unemployment Rate', forecast: '3.8%', previous: '3.7%' },
  { id: '3', time: '10:00', country: 'US', impact: 'Medium', event: 'ISM Manufacturing PMI', forecast: '47.5', previous: '47.4' },
  { id: '4', time: '13:00', country: 'EU', impact: 'High', event: 'ECB Interest Rate Decision', forecast: '4.50%', previous: '4.50%' },
  { id: '5', time: '14:30', country: 'EU', impact: 'Medium', event: 'ECB Press Conference', previous: '-' },
  { id: '6', time: '02:00', country: 'UK', impact: 'High', event: 'GDP (QoQ)', forecast: '0.2%', previous: '-0.1%' },
  { id: '7', time: '04:30', country: 'UK', impact: 'Medium', event: 'Manufacturing PMI', forecast: '46.3', previous: '46.2' },
  { id: '8', time: '19:50', country: 'JP', impact: 'Medium', event: 'BoJ Monetary Policy Statement', previous: '-' },
  { id: '9', time: '21:30', country: 'AU', impact: 'High', event: 'Employment Change', forecast: '25.0K', previous: '14.6K' },
  { id: '10', time: '07:45', country: 'CH', impact: 'Medium', event: 'SNB Interest Rate Decision', forecast: '1.75%', previous: '1.75%' },
  { id: '11', time: '12:30', country: 'US', impact: 'High', event: 'CPI (YoY)', forecast: '3.1%', previous: '3.4%' },
  { id: '12', time: '14:00', country: 'US', impact: 'High', event: 'FOMC Statement', previous: '-' },
];

const COUNTRY_FLAGS: Record<Country, string> = { US: '🇺🇸', EU: '🇪🇺', UK: '🇬🇧', JP: '🇯🇵', AU: '🇦🇺', CH: '🇨🇭' };
const IMPACT_COLORS: Record<Impact, string> = { High: 'bg-loss', Medium: 'bg-gold', Low: 'bg-neon' };

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [filterCountry, setFilterCountry] = useState<Country | 'ALL'>('ALL');
  const [filterImpact, setFilterImpact] = useState<Impact | 'ALL'>('ALL');

  const filtered = MOCK_EVENTS.filter(e => {
    if (filterCountry !== 'ALL' && e.country !== filterCountry) return false;
    if (filterImpact !== 'ALL' && e.impact !== filterImpact) return false;
    return true;
  });

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Economic Calendar</h1>
        <p className="text-xs text-muted">Upcoming market-moving events</p>
      </header>

      {/* Week selector */}
      <section className="flex gap-2 mb-4 overflow-x-auto">
        {DAYS.map((d, i) => (
          <button key={d} onClick={() => setSelectedDay(i)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
              selectedDay === i ? 'bg-neon/20 text-neon' : 'glass text-muted hover:text-[var(--text)]'
            }`}
          >
            <span className="block">{d}</span>
            <span className="block text-[10px]">Jan {13 + i}</span>
          </button>
        ))}
      </section>

      {/* Filters */}
      <section className="flex flex-wrap gap-2 mb-6">
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value as Country | 'ALL')}
          className="glass rounded-lg px-3 py-1.5 text-xs outline-none bg-transparent">
          <option value="ALL">All Countries</option>
          {Object.entries(COUNTRY_FLAGS).map(([c, f]) => <option key={c} value={c}>{f} {c}</option>)}
        </select>
        <select value={filterImpact} onChange={e => setFilterImpact(e.target.value as Impact | 'ALL')}
          className="glass rounded-lg px-3 py-1.5 text-xs outline-none bg-transparent">
          <option value="ALL">All Impact</option>
          <option value="High">High Impact</option>
          <option value="Medium">Medium Impact</option>
          <option value="Low">Low Impact</option>
        </select>
      </section>

      {/* Events List */}
      <section className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-muted text-sm">No events match your filters</p>
          </div>
        ) : (
          filtered.map(event => (
            <div key={event.id} className="glass rounded-xl p-4 flex items-center gap-4">
              {/* Time */}
              <div className="text-center min-w-[50px]">
                <p className="text-xs font-mono font-medium">{event.time}</p>
                <p className="text-lg">{COUNTRY_FLAGS[event.country]}</p>
              </div>

              {/* Impact dot */}
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${IMPACT_COLORS[event.impact]}`} title={event.impact} />

              {/* Event details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.event}</p>
                <p className="text-[10px] text-muted">{event.country} • {event.impact} Impact</p>
              </div>

              {/* Values */}
              <div className="flex gap-4 text-xs text-right shrink-0">
                <div>
                  <p className="text-muted">Forecast</p>
                  <p className="font-medium">{event.forecast ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted">Previous</p>
                  <p className="font-medium">{event.previous}</p>
                </div>
                {event.actual && (
                  <div>
                    <p className="text-muted">Actual</p>
                    <p className="font-medium text-neon">{event.actual}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Legend */}
      <section className="mt-6 glass rounded-xl p-4">
        <p className="text-xs text-muted mb-2">Impact Legend:</p>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-loss" /> High</span>
          <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-gold" /> Medium</span>
          <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-neon" /> Low</span>
        </div>
      </section>
    </main>
  );
}
