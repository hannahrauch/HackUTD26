'use client';
import { useEffect, useMemo, useState } from 'react';
import customers from '@/data/customers.json';
import type { Customer } from '@/lib/types';
import { clampMiles, forecast } from '@/lib/engine';
import { customerAddIssuePatch, customerRevertPatch, customerToggleIssuePatch, effectiveIssues, milestones, repairCost, withOverrides } from '@/lib/issues';
import { useStore } from '@/lib/useStore';
import type { Scenario } from '@/components/WhatIf';
import Hero from '@/components/Hero';
import ForecastChart from '@/components/ForecastChart';
import AIExplainer from '@/components/AIExplainer';
import CustomerDetails from '@/components/CustomerDetails';
import WhatIf from '@/components/WhatIf';
import NextMove from '@/components/NextMove';
import DealerView, { DEALER } from '@/components/DealerView';
import ZipSearch from '@/components/ZipSearch';

const D = customers as unknown as Customer[];
const DEALER_VALUE = '__dealer__';

export default function Page() {
  const store = useStore();
  const [view, setView] = useState<'customer' | 'dealer'>('customer');
  const [id, setId] = useState(D[0].id);
  const [dealerId, setDealerId] = useState(D[0].id);
  const [months, setMonths] = useState(36);
  const [scenario, setScenario] = useState<Scenario>('exp');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // dates and greetings depend on the browser clock

  const base = D.find(x => x.id === id)!;
  const rec = store.data.customers[id];
  const c = useMemo(() => withOverrides(base, rec), [base, rec]);
  const [miles, setMiles] = useState(() => clampMiles(c.v.annual_miles_est));
  useEffect(() => setMiles(clampMiles(c.v.annual_miles_est)), [c.id, c.v.annual_miles_est]);

  const eff = useMemo(() => effectiveIssues(c, rec), [c, rec]);
  const repair = repairCost(eff.active, scenario);
  const rows = useMemo(() => forecast(c, months, miles, repair), [c, months, miles, repair]);
  const baseline = useMemo(() => (repair ? forecast(c, months, miles, 0) : null), [c, months, miles, repair]);
  const step = months <= 12 ? 3 : 12;
  const ms = useMemo(() => milestones(months, t => rows[Math.min(t, rows.length - 1)].odo, step), [months, rows, step]);
  const changed = (rec?.addedIds?.length ?? 0) + (rec?.removedIds?.length ?? 0) + (rec?.customItems?.length ?? 0) > 0;

  const pick = (value: string) => {
    if (value === DEALER_VALUE) { setView('dealer'); return; }
    setView('customer'); setId(value); setScenario('exp');
  };

  if (!mounted || !store.loaded) return <div className="p-10 text-neutral-600">Loading My Little Toyota...</div>;

  const isDealer = view === 'dealer';
  return (
    <>
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-white px-7 py-3">
        <div className="flex items-center gap-3">
          <img src="/toyota-red.png" alt="Toyota" className="h-10 w-10" />
          <b className="text-2xl tracking-wide">TOYOTA</b>
          <span className="border-l pl-3 text-neutral-600">My Little Toyota</span>
          <span className={`ml-2 rounded-full px-3 py-0.5 text-xs font-semibold ${isDealer ? 'bg-toyota text-white' : 'bg-mist text-neutral-700'}`}>{isDealer ? 'Dealer view' : 'Customer view'}</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-600">View as
          <select value={isDealer ? DEALER_VALUE : id} onChange={e => pick(e.target.value)} className="rounded border border-neutral-400 px-3 py-2 text-sm text-black">
            <optgroup label="Customers">
              {D.map(x => (<option key={x.id} value={x.id}>{x.first}: {x.v.model_year} {x.v.model}</option>))}
            </optgroup>
            <optgroup label="Dealership">
              <option value={DEALER_VALUE}>Admin: {DEALER}</option>
            </optgroup>
          </select>
        </label>
      </header>

      {store.error && <div className="bg-amber-50 px-7 py-2 text-sm text-amber-900">Could not save or load: {store.error}. Your last change may not have been saved; try again.</div>}
      {!isDealer && (
        <nav className="sticky top-[67px] z-10 flex gap-7 overflow-x-auto bg-black px-7 max-sm:top-[112px]">
          {[['details', 'My Details'], ['forecast', 'Future Forecast'], ['whatif', 'Inspection & Maintenance'], ['move', 'Next Move'], ['find', 'Find a Toyota']].map(([h, l]) => (
            <a key={h} href={`#${h}`} className="whitespace-nowrap border-b-[3px] border-transparent py-4 text-white hover:border-toyota">{l}</a>
          ))}
        </nav>
      )}

      <main className="mx-auto max-w-[1180px] px-5 pb-16">
        {isDealer ? (
          <div key="dealer" className="contents">
          <DealerView
            customers={D} store={store.data}
            save={store.save} refresh={store.refresh}
            selectedId={dealerId} setSelectedId={setDealerId}
          />
          </div>
        ) : (
          <div key={c.id} className="contents">
            <Hero c={c} />
            <CustomerDetails key={c.id} base={base} current={c} saved={rec?.overrides} onSave={o => store.save(c.id, { overrides: o })} />
            <ForecastChart
              rows={rows} base={baseline} months={months} setMonths={setMonths} miles={miles} setMiles={setMiles}
              milestones={ms} step={step} leaseNote={c.a.contract_type === 'lease'}
            />
            <AIExplainer key={c.id} customerId={c.id} months={months} miles={miles} repair={repair} />
            <WhatIf
              dealer={eff.dealer} added={eff.added} active={eff.active} changed={changed}
              scenario={scenario} setScenario={setScenario} total={repair} months={months}
              baseEnd={baseline ? baseline[baseline.length - 1] : null} end={rows[rows.length - 1]}
              onToggle={(item) => store.save(c.id, customerToggleIssuePatch(c, rec, item))}
              onAdd={(item) => store.save(c.id, customerAddIssuePatch(rec, item))}
              onRevert={() => store.save(c.id, customerRevertPatch())}
            />
            <NextMove c={c} base={base} repair={repair} />
            <ZipSearch key={c.id} first={c.first} searches={rec?.searches ?? []} onSave={next => store.save(c.id, { searches: next })} />
          </div>
        )}
      </main>
      <footer className="bg-mist px-5 py-8 text-center text-xs text-neutral-600">Built on the Toyota Next Move data pack. Values are estimates, not offers. Vehicle photo is a placeholder. Demo data only.</footer>
    </>
  );
}
