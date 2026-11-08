'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { clampMiles, horizonLabel, money, MILES, type Row } from '@/lib/engine';
import type { Milestone } from '@/lib/issues';
import type { Severity } from '@/lib/types';

const RED = '#EB0A1E';
const SERIES = [
  { k: 'val', l: 'Estimated value', c: '#1a1a1a', w: 2.5 },
  { k: 'owed', l: 'Amount owed', c: '#8a8d91', w: 2.5 },
  { k: 'equity', l: 'Equity', c: '#12805c', w: 4 },
  { k: 'total', l: 'Total ownership cost', c: RED, w: 3 },
  { k: 'cm', l: 'Maintenance (cumulative)', c: '#c98200', w: 2.5 },
  { k: 'cr', l: 'Repairs (cumulative)', c: '#c98200', w: 2.5, dash: '4 4' }
] as const;

const SEV: Record<Severity, string> = { high: 'bg-red-600 text-white', moderate: 'bg-orange-500 text-white', low: 'bg-yellow-300 text-neutral-900' };

type Props = {
  rows: Row[]; base: Row[] | null; months: number; setMonths: (n: number) => void; miles: number; setMiles: (n: number) => void;
  milestones: Milestone[]; step: number; leaseNote: boolean;
};

export default function ForecastChart({ rows, base, months, setMonths, miles, setMiles, milestones, step, leaseNote }: Props) {
  const [off, setOff] = useState<Set<string>>(new Set(['cm', 'cr']));
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null); // clicked tile stays highlighted
  const focus = pinned ?? hover;
  const toggle = (k: string) => setOff(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const data = rows.map((r, i) => ({
    label: r.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    band: [Math.round(r.lo), Math.round(r.hi)], val: Math.round(r.val), owed: Math.round(r.owed), equity: Math.round(r.equity),
    total: Math.round(r.total), cm: Math.round(r.cm), cr: Math.round(r.cr),
    eqB: base ? Math.round(base[i].equity) : undefined, totB: base ? Math.round(base[i].total) : undefined, r
  }));
  const e = rows[rows.length - 1], b = base ? base[base.length - 1] : null;
  const hm = focus !== null ? milestones[focus] : null;

  const Tip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const r: Row = payload[0].payload.r;
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-xl">
        <div className="mb-1 font-bold">{r.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        {SERIES.filter(s => !off.has(s.k)).map(s => (
          <div key={s.k} className="flex justify-between gap-6"><span style={{ color: s.c }}>{s.l}</span><b>{money(r[s.k])}</b></div>
        ))}
        <div className="mt-2 border-t pt-2 text-xs text-neutral-600">
          <div>Value range: {money(r.lo)} to {money(r.hi)}</div>
          <div>Odometer: {Math.round(r.odo).toLocaleString()} mi</div>
          <div className="mt-1">{r.equity >= 0 ? `Selling here would leave about ${money(r.equity)} after payoff.` : `You would owe about ${money(-r.equity)} more than the car is worth.`}</div>
        </div>
      </div>
    );
  };

  const tiles: [string, number, string, string?][] = [
    [`Value in ${horizonLabel(months)}`, e.val, `${money(e.lo)} to ${money(e.hi)}`],
    [leaseNote ? 'Buyout price at lease end' : 'Amount owed', e.owed, ''],
    ['Equity', e.equity, b ? `before repair: ${money(b.equity)}` : '', e.equity >= 0 ? 'text-pos' : 'text-toyota'],
    ['Total ownership cost', e.total, b ? `before repair: ${money(b.total)}` : '']
  ];

  return (
    <section id="forecast" className="mt-8 rounded-xl border border-neutral-200 border-t-4 border-t-toyota p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your Toyota's future: what happens next?</h2>
          <p className="mt-1 text-sm text-neutral-600">Click a legend item to show or hide it. Hover or tap the chart for details.</p>
        </div>
        <div className="flex overflow-hidden rounded-full border border-black">
          {[6, 12, 24, 36, 60].map(n => (
            <button key={n} onClick={() => setMonths(n)} className={`px-4 py-2 text-sm ${n === months ? 'bg-black text-white' : 'hover:bg-mist'}`}>{n < 12 ? '6 mo' : `${n / 12} yr`}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SERIES.map(s => (
          <button key={s.k} onClick={() => toggle(s.k)} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${off.has(s.k) ? 'opacity-40' : ''}`}>
            <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.c }} />{s.l}
          </button>
        ))}
        {base && <span className="flex items-center gap-2 px-2 text-sm text-neutral-600">Dashed = before repair</span>}
      </div>

      <div className="mt-4 h-[440px] max-sm:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#e5e6e8" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={40} />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} width={56} tick={{ fontSize: 12 }} />
            <Tooltip content={<Tip />} />
            {hm && <ReferenceArea x1={data[hm.from].label} x2={data[hm.to].label} fill={RED} fillOpacity={0.12} stroke={RED} strokeDasharray="4 4" />}
            <Area dataKey="band" stroke="none" fill="#1a1a1a" fillOpacity={0.08} isAnimationActive={false} />
            {SERIES.filter(s => !off.has(s.k)).map(s => (
              <Line key={s.k} type="monotone" dataKey={s.k} stroke={s.c} strokeWidth={s.w} strokeDasharray={'dash' in s ? s.dash : undefined} dot={false} animationDuration={500} />
            ))}
            {base && !off.has('equity') && <Line dataKey="eqB" type="monotone" stroke="#12805c" strokeDasharray="8 5" strokeWidth={2} dot={false} isAnimationActive={false} />}
            {base && !off.has('total') && <Line dataKey="totB" type="monotone" stroke={RED} strokeDasharray="8 5" strokeWidth={2} dot={false} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([k, v, note, cls]) => (
          <div key={k} className="rounded-md bg-mist p-3">
            <div className="text-xs text-neutral-600">{k}</div>
            <motion.div key={Math.round(v)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`text-2xl font-bold ${cls ?? ''}`}>{money(v)}</motion.div>
            <div className="text-xs text-neutral-600">{note || ' '}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-bold">Coming up: likely maintenance, every {step === 12 ? 'year' : `${step} months`}</h3>
        <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}>
          {milestones.map((m, i) => {
            const on = focus === i;
            return (
              <button
                key={m.index}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onClick={() => setPinned(pinned === i ? null : i)} aria-pressed={pinned === i}
                className={`rounded-md border p-3 text-left transition ${on ? 'border-toyota bg-toyota text-white shadow-md' : 'border-neutral-200 bg-white hover:border-toyota'}`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{step === 12 ? `Year ${m.index + 1}` : m.label}</div>
                <div className="mt-1 text-sm font-bold">{m.items.length} {m.items.length === 1 ? 'item' : 'items'}</div>
                {m.severity && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs capitalize ${on ? 'bg-white text-toyota' : SEV[m.severity]}`}>{m.severity}</span>}
                <div className="mt-1 text-xs opacity-80">{m.items.length ? `${money(m.costMin)} to ${money(m.costMax)}` : 'Nothing due'}</div>
              </button>
            );
          })}
        </div>
        {hm && hm.items.length > 0 && (
          <div className="mt-3 rounded-md border-l-4 border-toyota bg-red-50 p-4 text-sm">
            <b>{hm.label}:</b>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {hm.items.map(({ item, reason }) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md bg-white px-3 py-2">
                  <span className="flex items-center gap-3">
                    <span className={`w-16 shrink-0 rounded-full py-0.5 text-center text-xs capitalize ${SEV[item.severity]}`}>{item.severity}</span>
                    <span>{item.name} <span className="text-xs text-neutral-500">({reason === 'miles' ? 'by mileage' : 'by time'})</span></span>
                  </span>
                  <b className="whitespace-nowrap">{money(item.min)}–{money(item.max)}</b>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <label className="mt-5 block text-sm">Miles driven per year: <b>{miles.toLocaleString()}</b>
        <input type="range" min={MILES.min} max={MILES.max} step={500} value={miles} onChange={e => setMiles(clampMiles(+e.target.value))} className="mt-2 w-full" />
      </label>

    </section>
  );
}
