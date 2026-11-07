'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { interestSeries, money, rateFor, valueAt } from '@/lib/engine';
import type { Customer } from '@/lib/types';

const COL: Record<string, string> = { KEEP: '#1a1a1a', REFI: '#EB0A1E', EXTEND: '#c98200', EXTRA100: '#12805c', RETURN: '#8a8d91', BUYOUT: '#12805c', RENEW: '#EB0A1E' };

export default function NextMove({ c }: { c: Customer }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const { a } = c, loan = a.contract_type === 'loan', n = a.months_remaining;

  const { data, lines, title, sub } = useMemo(() => {
    const H = loan ? Math.max(12, Math.min(72, n + 12)) : n + 18;
    let lines: { id: string; label: string; vals: (number | null)[] }[];
    if (loan) {
      lines = c.opts.filter(o => ['KEEP', 'REFI', 'EXTEND', 'EXTRA100'].includes(o.id) && o.pay != null && o.ok.startsWith('Y')).map(o => {
        const r = o.id === 'REFI' ? rateFor(a.current_balance!, o.pay!, n) : a.apr! / 1200;
        return { id: o.id, label: o.name, vals: interestSeries(a.current_balance!, r, o.pay!, H) };
      });
    } else {
      const by = Object.fromEntries(c.opts.map(o => [o.id, o]));
      const mk = (id: string, label: string, f: (t: number) => number) => ({ id, label, vals: Array.from({ length: H + 1 }, (_, t) => (t < n ? null : Math.round(f(t)))) });
      lines = [mk('RETURN', 'Return the car', () => -(by.RETURN.up ?? 0)), mk('BUYOUT', 'Buy the car', t => valueAt(c, t, c.v.annual_miles_est) - (by.BUYOUT.up ?? 0)), mk('RENEW', 'Renew early', () => -(by.RENEW.up ?? 0))];
    }
    const data = Array.from({ length: H + 1 }, (_, t) => ({ m: `Month ${t}`, ...Object.fromEntries(lines.map(l => [l.id, l.vals[t]])) }));
    return {
      data, lines,
      title: loan ? 'Interest you pay under each option' : 'Your cash position after the lease ends',
      sub: loan ? 'Lower is better. Only options you qualify for are drawn. Click a card to show or hide its line.' : 'Above zero means you come out ahead. Buying keeps the car (value minus buyout price); returning costs the turn-in and mileage fees.'
    };
  }, [c, loan, n, a.apr, a.current_balance]);

  const drawn = new Set(lines.map(l => l.id));
  const toggle = (id: string) => drawn.has(id) && setHidden(s => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x; });
  const caution = !c.consent || c.vuln;

  return (
    <section id="move" className="mt-8 rounded-xl border border-neutral-200 p-6 shadow-sm">
      <h2 className="text-3xl font-bold tracking-tight">Your next move</h2>
      <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="my-4 rounded-lg bg-black p-6 text-white">
        <div className="text-xs text-neutral-400">Recommended for {c.first}</div>
        <h3 className="my-1 text-2xl font-bold">{c.best.move}</h3>
        <p className="mt-2">{c.best.msg}</p>
        <p className="mt-2"><b>Why not the others:</b> {c.best.why}</p>
        <p className="mt-2 text-xs text-neutral-300">{caution ? 'Care note: ' : ''}{c.best.guard}</p>
      </motion.div>

      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-neutral-600">{sub}</p>
      <div className="mt-3 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#e5e6e8" vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 12 }} minTickGap={30} />
            <YAxis tickFormatter={(v: number) => `$${v.toLocaleString()}`} width={72} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => money(v)} />
            <Legend />
            {lines.filter(l => !hidden.has(l.id)).map(l => (
              <Line key={l.id} name={l.label} dataKey={l.id} type="monotone" stroke={COL[l.id]} strokeWidth={3} dot={false} animationDuration={500} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {c.opts.map(o => {
          const ok = o.ok.startsWith('Y');
          return (
            <button key={o.id} onClick={() => toggle(o.id)} className={`rounded-md border p-4 text-left transition hover:border-black ${hidden.has(o.id) ? 'opacity-40' : ''}`}>
              <b className="flex items-center gap-2">{drawn.has(o.id) && <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COL[o.id] }} />}{o.name}</b>
              <span className="mt-1 block text-sm text-neutral-600">{o.sum}</span>
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${ok ? 'bg-mist' : 'bg-red-100 text-red-900'}`}>{ok ? 'Eligible' : 'Not available now'}</span>
              {o.chg != null && o.chg !== 0 && <span className="ml-2 inline-block rounded-full bg-mist px-2 py-0.5 text-xs">Payment {o.chg < 0 ? '' : '+'}{money(o.chg)}/mo</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
