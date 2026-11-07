'use client';
import { useEffect, useMemo, useState } from 'react';
import customers from '@/data/customers.json';
import type { Customer, Issue } from '@/lib/types';
import { forecast } from '@/lib/engine';
import Hero from '@/components/Hero';
import ForecastChart from '@/components/ForecastChart';
import WhatIf from '@/components/WhatIf';
import NextMove from '@/components/NextMove';
import Messages from '@/components/Messages';

const D = customers as unknown as Customer[];

export default function Page() {
  const [id, setId] = useState(D[0].id);
  const c = D.find(x => x.id === id)!;
  const [months, setMonths] = useState(36);
  const [miles, setMiles] = useState(c.v.annual_miles_est);
  const [repair, setRepair] = useState(0);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rows = useMemo(() => forecast(c, months, miles, repair), [c, months, miles, repair]);
  const base = useMemo(() => (repair ? forecast(c, months, miles, 0) : null), [c, months, miles, repair]);

  const pick = (nid: string) => {
    const n = D.find(x => x.id === nid)!;
    setId(nid); setMiles(n.v.annual_miles_est); setRepair(0); setIssue(null);
  };
  if (!mounted) return null; // dates and greeting depend on the browser clock

  return (
    <>
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-white px-7 py-3">
        <div className="flex items-center gap-3">
          <img src="/toyota-red.png" alt="Toyota" className="h-10 w-10" />
          <b className="text-2xl tracking-wide">TOYOTA</b>
          <span className="border-l pl-3 text-neutral-600">My Little Toyota</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-600">Demo customer
          <select value={id} onChange={e => pick(e.target.value)} className="rounded border border-neutral-400 px-3 py-2 text-sm text-black">
            {D.map(x => (<option key={x.id} value={x.id}>{x.first}: {x.v.model_year} {x.v.model}</option>))}
          </select>
        </label>
      </header>
      <nav className="sticky top-[67px] z-10 flex gap-7 overflow-x-auto bg-black px-7 max-sm:top-[112px]">
        {[['forecast', 'Future forecast'], ['whatif', 'What-if simulator'], ['move', 'Next move'], ['messages', 'Messages']].map(([h, l]) => (
          <a key={h} href={`#${h}`} className="whitespace-nowrap border-b-[3px] border-transparent py-4 text-white hover:border-toyota">{l}</a>
        ))}
      </nav>
      <main className="mx-auto max-w-[1180px] px-5 pb-16">
        <Hero c={c} />
        <ForecastChart rows={rows} base={base} months={months} setMonths={setMonths} miles={miles} setMiles={setMiles} />
        <WhatIf issue={issue} setIssue={setIssue} repair={repair} setRepair={setRepair} months={months} end={rows[rows.length - 1]} baseEnd={base ? base[base.length - 1] : null} />
        <NextMove c={c} />
        <Messages c={c} />
      </main>
      <footer className="bg-mist px-5 py-8 text-center text-xs text-neutral-600">Built on the Toyota Next Move data pack. Values are estimates, not offers. Vehicle photo is a placeholder.</footer>
    </>
  );
}
