'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { horizonLabel, money, parseIssue, type Row } from '@/lib/engine';
import type { Issue } from '@/lib/types';

const CHIPS = ['My transmission is slipping', 'My brakes need replacing', 'My battery is failing', 'My A/C stopped working', 'My check engine light is on', 'I need a $2,500 repair'];
type Props = { issue: Issue | null; setIssue: (i: Issue | null) => void; repair: number; setRepair: (n: number) => void; months: number; end: Row; baseEnd: Row | null };

export default function WhatIf({ issue, setIssue, repair, setRepair, months, end, baseEnd }: Props) {
  const [text, setText] = useState('');
  const [miss, setMiss] = useState(false);
  const apply = (t: string) => {
    const i = parseIssue(t);
    setMiss(!i);
    if (i) { setIssue(i); setRepair(i.exp); }
  };
  const clear = () => { setIssue(null); setRepair(0); setText(''); setMiss(false); };

  return (
    <section id="whatif" className="mt-8 rounded-xl border border-neutral-200 p-6 shadow-sm">
      <h2 className="text-3xl font-bold tracking-tight">What if something goes wrong?</h2>
      <p className="mt-1 text-sm text-neutral-600">Describe a problem or pick one. The forecast above updates right away, with dashed lines showing your path before the repair.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply(text)}
          placeholder="e.g. my transmission is slipping, or I need a $2,500 repair"
          className="min-w-[240px] flex-1 rounded border border-neutral-400 px-3 py-2" />
        <button onClick={() => apply(text)} className="rounded-full border-2 border-toyota bg-toyota px-6 py-2 font-semibold text-white hover:bg-red-700">Add to forecast</button>
        <button onClick={clear} className="rounded-full border-2 border-black px-6 py-2 font-semibold hover:bg-mist">Remove</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map(c => (<button key={c} onClick={() => { setText(c); apply(c); }} className="rounded-full border bg-mist px-3 py-1.5 text-sm hover:border-toyota">{c}</button>))}
      </div>
      {miss && <p className="mt-3 text-sm text-neutral-700">I didn't recognize that. Try "brakes", "battery", or "$2,500 repair", or use the slider.</p>}

      {issue && (
        <div className="mt-4 flex flex-wrap gap-2">
          {([['Best case', 'min'], ['Expected case', 'exp'], ['Worst case', 'max']] as const).map(([l, k]) => (
            <button key={k} onClick={() => setRepair(issue[k])} className={`rounded-full border-2 border-black px-4 py-1.5 text-sm font-semibold ${repair === issue[k] ? 'bg-black text-white' : 'hover:bg-mist'}`}>{l}: {money(issue[k])}</button>
          ))}
        </div>
      )}

      <label className="mt-5 block text-sm">Repair cost: <b>{money(repair)}</b>
        <input type="range" min={0} max={8000} step={100} value={repair} onChange={e => { setRepair(+e.target.value); if (+e.target.value === 0) setIssue(null); }} className="mt-2 w-full" />
      </label>

      <AnimatePresence mode="wait">
        <motion.div key={repair ? 'on' : 'off'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`mt-4 border-l-4 p-4 text-sm ${repair ? 'border-warn bg-amber-50' : 'border-neutral-300 bg-mist'}`}>
          {repair && baseEnd ? (
            <>
              <b>{issue?.name ?? 'Repair'}: {money(repair)}.</b> Over {horizonLabel(months)} it raises your total ownership cost from {money(baseEnd.total)} to {money(end.total)}.
              {issue && <> Typical range for this kind of issue: {money(issue.min)} to {money(issue.max)}.</>} Compare repairing and keeping against selling as-is.
              These are preliminary estimates, not a diagnosis. Get a professional inspection, and do not keep driving if the problem affects brakes, steering, or safety.
            </>
          ) : 'No repair added. The chart shows your baseline forecast.'}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
