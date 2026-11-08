'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '@/lib/engine';
import { nextMove } from '@/lib/nextmove';
import type { Customer } from '@/lib/types';

const COL: Record<string, string> = { KEEP: '#1a1a1a', REFI: '#EB0A1E', EXTEND: '#c98200', EXTRA100: '#12805c', RETURN: '#8a8d91', BUYOUT: '#12805c', RENEW: '#EB0A1E', SELL: '#8a8d91', REPAIR: '#c98200' };

type Props = { c: Customer; base: Customer; repair: number };

/** Your next move is computed from the customer's current numbers, so it updates with every change. */
export default function NextMove({ c, base, repair }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const res = useMemo(() => nextMove(c, base, repair), [c, base, repair]);
  const drawn = new Set(res.lines.map(l => l.id));
  const toggle = (id: string) => drawn.has(id) && setHidden(s => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x; });
  const loan = c.a.contract_type === 'loan';
  const data = useMemo(() => {
    const H = res.lines.reduce((m, l) => Math.max(m, l.vals.length - 1), 0);
    return Array.from({ length: H + 1 }, (_, t) => ({ m: `Month ${t}`, ...Object.fromEntries(res.lines.map(l => [l.id, l.vals[t]])) }));
  }, [res]);

  return (
    <section id="move" className="mt-8 rounded-xl border border-neutral-200 p-6 shadow-sm">
      <h2 className="text-3xl font-bold tracking-tight">Your next move</h2>
      <p className="mt-1 text-sm text-neutral-600">This recommendation is calculated from your current numbers. Change your details, repairs or forecast and it updates.</p>
      <motion.div key={`${c.id}-${res.bestId}-${Math.round(repair)}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="my-4 rounded-lg bg-black p-6 text-white">
        <div className="text-xs text-neutral-400">Recommended for {c.first}</div>
        <h3 className="my-1 text-2xl font-bold">{res.best.move}</h3>
        <p className="mt-2">{res.best.msg}</p>
        <p className="mt-2"><b>Why:</b> {res.best.why}</p>
      </motion.div>

      <h3 className="text-lg font-bold">{res.title}</h3>
      <p className="text-sm text-neutral-600">{res.sub}</p>
      <div className="mt-3 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#e5e6e8" vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 12 }} minTickGap={30} />
            <YAxis tickFormatter={(v: number) => `$${v.toLocaleString()}`} width={72} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => money(v)} />
            <Legend />
            {res.lines.filter(l => !hidden.has(l.id)).map(l => (
              <Line key={l.id} name={l.label} dataKey={l.id} type="monotone" stroke={COL[l.id]} strokeWidth={3} dot={false} animationDuration={500} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {res.opts.map(o => {
          const ok = o.ok.startsWith('Y');
          const isBest = o.id === res.bestId;
          return (
            <button key={o.id} onClick={() => toggle(o.id)} className={`rounded-md border p-4 text-left transition hover:border-black ${hidden.has(o.id) ? 'opacity-40' : ''} ${isBest ? 'border-toyota ring-2 ring-toyota/30' : ''}`}>
              <b className="flex items-center gap-2">{drawn.has(o.id) && <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COL[o.id] }} />}{o.name}</b>
              <span className="mt-1 block text-sm text-neutral-600">{o.sum}</span>
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${ok ? 'bg-mist' : 'bg-red-100 text-red-900'}`}>{ok ? (isBest ? 'Recommended' : 'Eligible') : o.ok}</span>
              {o.chg != null && o.chg !== 0 && <span className="ml-2 inline-block rounded-full bg-mist px-2 py-0.5 text-xs">Payment {o.chg < 0 ? '' : '+'}{money(o.chg)}/mo</span>}
            </button>
          );
        })}
      </div>
      {!loan && <p className="mt-3 text-xs text-neutral-500">Lease return fees come from the data pack.</p>}
    </section>
  );
}
