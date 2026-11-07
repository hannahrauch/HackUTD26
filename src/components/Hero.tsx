'use client';
import { motion } from 'framer-motion';
import { money } from '@/lib/engine';
import type { Customer } from '@/lib/types';

export default function Hero({ c }: { c: Customer }) {
  const { v, a } = c, loan = a.contract_type === 'loan';
  const owed = loan ? a.current_balance! : a.payoff_quote!, eq = v.est_market_value_now - owed, h = new Date().getHours();
  const tiles: [string, string, string?][] = [
    ['Odometer', `${v.odometer_now.toLocaleString()} mi`],
    ['Estimated value', money(v.est_market_value_now)],
    [loan ? 'Loan balance' : 'Lease payoff', money(owed)],
    ['Estimated equity', money(eq), eq >= 0 ? 'text-pos' : 'text-toyota'],
    ['Status', loan ? `Loan, ${a.months_remaining} payments left` : `Lease, ${a.months_remaining} months left`]
  ];
  return (
    <section className="grid items-center gap-6 py-10 md:grid-cols-[1.1fr_.9fr]">
      <motion.div key={c.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-sm text-neutral-600">{h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, {c.first}. Here is what is happening with your Toyota.</p>
        <h1 className="my-2 text-5xl font-bold leading-[1.05] tracking-tight max-sm:text-4xl">{v.model_year} Toyota {v.model} {v.trim}</h1>
        <p className="mb-5 max-w-[52ch] border-l-4 border-toyota pl-4 text-neutral-600">"{c.says}"</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map(([k, x, cls]) => (<div key={k} className="rounded-md bg-mist p-3"><div className="text-xs text-neutral-600">{k}</div><div className={`text-lg font-bold ${cls ?? ''}`}>{x}</div></div>))}
        </div>
      </motion.div>
      <motion.img key={c.id + 'i'} src="/camry.webp" alt="Toyota sedan (placeholder photo)" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full mix-blend-multiply max-md:order-first" />
    </section>
  );
}
