'use client';
import { useState } from 'react';
import type { Customer, CustomerOverrides } from '@/lib/types';
import { MILES } from '@/lib/engine';

type Props = { base: Customer; current: Customer; saved: CustomerOverrides | undefined; onSave: (o: CustomerOverrides) => void };

/** The customer edits their own numbers. Changes feed straight into the forecast and are saved. */
export default function CustomerDetails({ base, current, saved, onSave }: Props) {
  const loan = current.a.contract_type === 'loan';
  const [f, setF] = useState({
    current_balance: String(current.a.current_balance ?? current.a.payoff_quote ?? ''),
    monthly_payment: String(current.a.monthly_payment),
    apr: String(current.a.apr ?? ''),
    months_remaining: String(current.a.months_remaining),
    odometer_now: String(current.v.odometer_now),
    annual_miles_est: String(current.v.annual_miles_est),
    est_market_value_now: String(current.v.est_market_value_now),
    paying: current.a.paying !== false,
  });
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(true);
  const set = (k: keyof typeof f, v: string | boolean) => setF(s => ({ ...s, [k]: v }));

  const save = () => {
    // Accept what people actually type: "$22,920.95", "12.9%", "26,583 mi".
    const parse = (label: string, raw: string): number | null => {
      const cleaned = raw.replace(/[$,%\s]|mi(les)?/gi, '');
      if (cleaned === '') { setMsg(`${label} is empty. Enter a number, or use Reset to restore the data pack value.`); return null; }
      const v = Number(cleaned);
      if (!Number.isFinite(v) || v < 0) { setMsg(`${label} must be a positive number. You typed "${raw}".`); return null; }
      return v;
    };
    const fields: [string, string][] = [
      ['Monthly payment', f.monthly_payment], ['Payments left', f.months_remaining], ['Odometer', f.odometer_now],
      ['Miles per year', f.annual_miles_est], ['Estimated value', f.est_market_value_now],
    ];
    if (loan) fields.push(['Loan balance', f.current_balance], ['Interest rate', f.apr]);
    const vals: Record<string, number> = {};
    for (const [label, raw] of fields) {
      const v = parse(label, raw);
      if (v === null) return;
      vals[label] = v;
    }
    // Miles per year is a driving habit, not the odometer. Keep it within the slider's range.
    const perYear = vals['Miles per year'];
    if (perYear < MILES.min || perYear > MILES.max) {
      setMsg(`Miles you drive per year must be between ${MILES.min.toLocaleString()} and ${MILES.max.toLocaleString()}. For total miles, use Odometer.`);
      return;
    }
    const o: CustomerOverrides = {
      monthly_payment: vals['Monthly payment'], months_remaining: vals['Payments left'],
      odometer_now: vals['Odometer'], annual_miles_est: vals['Miles per year'],
      est_market_value_now: vals['Estimated value'], paying: f.paying,
    };
    if (loan) { o.current_balance = vals['Loan balance']; o.apr = vals['Interest rate']; }
    onSave(o);
    setMsg('Saved. The forecast, chart and next move have been updated.');
  };
  const reset = () => { onSave({}); setMsg('Reset to the data pack values.'); setF({
    current_balance: String(base.a.current_balance ?? base.a.payoff_quote ?? ''), monthly_payment: String(base.a.monthly_payment), apr: String(base.a.apr ?? ''),
    months_remaining: String(base.a.months_remaining), odometer_now: String(base.v.odometer_now), annual_miles_est: String(base.v.annual_miles_est),
    est_market_value_now: String(base.v.est_market_value_now), paying: base.a.paying !== false,
  }); };

  const field = (label: string, k: keyof typeof f, hint?: string) => (
    <label className="text-sm">{label}
      <input value={String(f[k])} onChange={e => set(k, e.target.value)} className="mt-1 w-full rounded border border-neutral-400 px-3 py-2" />
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  );

  return (
    <section id="details" className="mt-8 rounded-xl border border-neutral-200 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My details</h2>
          {open && <p className="mt-1 text-sm text-neutral-600">Change any of these and the forecast, chart and recommendations update.</p>}
        </div>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-full border-2 border-black px-4 py-1.5 text-sm font-semibold hover:bg-mist">{open ? 'Minimize' : 'Expand'}</button>
      </div>
      {open && <>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loan && field('Remaining loan balance ($)', 'current_balance')}
        {loan && field('Interest rate (APR %)', 'apr')}
        {field(loan ? 'Monthly payment ($)' : 'Monthly lease payment ($)', 'monthly_payment')}
        {field('Payments left', 'months_remaining')}
        {field('Odometer (miles)', 'odometer_now')}
        {field('Miles you drive per year', 'annual_miles_est')}
        {field('Estimated market value ($)', 'est_market_value_now', 'Your own estimate or a trade-in quote')}
      </div>

      <label className="mt-5 flex items-center gap-3 text-sm">
        <input type="checkbox" checked={!!f.paying} onChange={e => set('paying', e.target.checked)} className="h-4 w-4" />
        I am making my {loan ? 'loan' : 'lease'} payments on schedule
      </label>
      {!f.paying && <p className="mt-2 text-sm text-amber-900">If payments stop, the amount owed keeps growing with interest instead of going down.</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button onClick={save} className="rounded-full border-2 border-toyota bg-toyota px-6 py-2 font-semibold text-white hover:bg-red-700">Save my details</button>
        <button onClick={reset} className="rounded-full border-2 border-black px-6 py-2 font-semibold hover:bg-mist">Reset to data pack</button>
        {msg && <span className="text-sm text-neutral-700">{msg}</span>}
      </div>
      </>}
    </section>
  );
}
