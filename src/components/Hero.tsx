'use client';
import { motion } from 'framer-motion';
import { money } from '@/lib/engine';
import type { Customer } from '@/lib/types';
import { HERO_PHOTOS } from '@/lib/photos';

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
        <h1 className="mt-2 mb-5 text-5xl font-bold leading-[1.05] tracking-tight max-sm:text-4xl">{v.model_year} Toyota {v.model} {v.trim}</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map(([k, x, cls]) => (<div key={k} className="rounded-md bg-mist p-3"><div className="text-xs text-neutral-600">{k}</div><div className={`text-lg font-bold ${cls ?? ''}`}>{x}</div></div>))}
        </div>
      </motion.div>
      {HERO_PHOTOS[v.model] ? (
        <div className="max-md:order-first">
          <motion.img key={c.id + 'i'} src={HERO_PHOTOS[v.model]!} alt={`${v.model} (photo from the dealer's site; your car may differ in trim and color)`}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            className="w-full object-contain max-md:max-h-[260px]" />
        </div>
      ) : (
        <motion.div key={c.id + 'i'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-neutral-400 text-center text-sm text-neutral-600">
          Photo of the {v.model} coming soon
        </motion.div>
      )}
    </section>
  );
}
