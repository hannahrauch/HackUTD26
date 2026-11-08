'use client';
import { useEffect, useMemo, useState } from 'react';
import { money } from '@/lib/engine';
import { REPAIRS, dealerToggleIssuePatch, effectiveIssues, inspectionDefaults, withOverrides } from '@/lib/issues';
import type { Customer, CustomerRecord, OutreachRecord, StoreData } from '@/lib/types';

export const DEALER = 'Toyota of McKinney';
const TEMPLATES: [string, string][] = [
  ['price_drop', 'Price drop'], ['sale', 'Sale / deal'], ['service', 'Service reminder'], ['trade_in', 'Trade-in offer'], ['search', 'Saved search follow-up'], ['custom', 'Custom update'],
];

type Props = {
  customers: Customer[];
  store: StoreData;
  save: (customerId: string, patch: Partial<CustomerRecord>) => Promise<void>;
  refresh: () => Promise<void>;
  selectedId: string;
  setSelectedId: (id: string) => void;
};

export default function DealerView({ customers, store, save, refresh, selectedId, setSelectedId }: Props) {
  const base = customers.find(c => c.id === selectedId) ?? customers[0];
  const rec = store.customers[base.id];
  const c = withOverrides(base, rec);
  const eff = effectiveIssues(c, rec);
  const dealerIds = rec?.dealerIds ?? inspectionDefaults(c);
  const owed = c.a.contract_type === 'loan' ? c.a.current_balance! : c.a.payoff_quote!;
  const history = useMemo(() => store.messages.filter(m => m.customerId === base.id), [store.messages, base.id]);
  const changed = (rec?.addedIds?.length ?? 0) + (rec?.removedIds?.length ?? 0) > 0;

  // composer state
  const [template, setTemplate] = useState('price_drop');
  const [offer, setOffer] = useState('');
  const [note, setNote] = useState('');
  const [text, setText] = useState('');
  const [source, setSource] = useState<string>('');
  const [reviewed, setReviewed] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState<'' | 'draft' | 'send'>('');
  useEffect(() => { setText(''); setSource(''); setReviewed(false); setStatus(null); }, [base.id]);

  const searches = rec?.searches ?? [];
  const hasConsent = c.consent;
  const blocked = !hasConsent;

  async function draft() {
    setBusy('draft'); setStatus(null);
    try {
      const r = await fetch('/api/ai/draft', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-role': 'dealer' }, body: JSON.stringify({ customerId: base.id, template, offer, note }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Draft failed');
      setText(j.text); setSource(j.source === 'gemini' ? 'Drafted by Gemini. Edit before sending.' : 'Standard draft (AI unavailable). Edit before sending.');
      setReviewed(false);
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Draft failed.' });
    } finally { setBusy(''); }
  }

  async function send() {
    setBusy('send'); setStatus(null);
    try {
      const r = await fetch('/api/photon', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-role': 'dealer' }, body: JSON.stringify({ customerId: base.id, text, template }) });
      const j = await r.json();
      setStatus({ ok: r.ok, msg: r.ok ? `Text sent to ${base.first} through Photon.` : j.error ?? `Photon returned status ${r.status}.` });
      if (r.ok) { setText(''); setReviewed(false); }
    } catch {
      setStatus({ ok: false, msg: 'Could not reach the server.' });
    } finally {
      setBusy(''); refresh();
    }
  }

  const cardCls = 'rounded-xl border border-neutral-200 p-6 shadow-sm';
  return (
    <section id="dealer" className="mt-8">
      <div className="mb-4 rounded-lg bg-black p-4 text-white">
        <div className="text-xs text-neutral-400">Dealer view</div>
        <div className="text-2xl font-bold">{DEALER}</div>
        <p className="text-sm text-neutral-300">Customers can only change their own details. Only the dealership sees their interest and sends messages.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className={`${cardCls} max-h-[720px] overflow-y-auto p-3`}>
          <h3 className="px-2 pb-2 text-sm font-semibold uppercase tracking-wide text-neutral-600">Customers ({customers.length})</h3>
          <ul className="grid gap-1">
            {customers.map(x => {
              const r = store.customers[x.id];
              const cx = withOverrides(x, r);
              const n = (r?.addedIds?.length ?? 0) + (r?.removedIds?.length ?? 0);
              const sent = store.messages.filter(m => m.customerId === x.id && m.status === 'sent').length;
              const on = x.id === base.id;
              return (
                <li key={x.id}>
                  <button onClick={() => setSelectedId(x.id)} className={`w-full rounded-md border p-2 text-left text-sm transition ${on ? 'border-toyota bg-red-50' : 'border-transparent hover:bg-mist'}`}>
                    <div className="font-semibold">{x.first} <span className="font-normal text-neutral-600">· {x.v.model_year} {x.v.model}</span></div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      {!cx.consent && <span className="rounded bg-neutral-200 px-1.5 py-0.5">No consent</span>}
                      {cx.vuln && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">Extra care</span>}
                      {n > 0 && <span className="rounded bg-red-100 px-1.5 py-0.5 text-toyota">{n} customer change{n > 1 ? 's' : ''}</span>}
                      {sent > 0 && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-pos">{sent} sent</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="grid gap-6">
          <div className={cardCls}>
            <h2 className="text-2xl font-bold tracking-tight">{base.first}: {c.v.model_year} Toyota {c.v.model} {c.v.trim}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[['Odometer', `${c.v.odometer_now.toLocaleString()} mi`], ['Estimated value', money(c.v.est_market_value_now)], [c.a.contract_type === 'loan' ? 'Loan balance' : 'Payoff', money(owed)], ['Equity', money(c.v.est_market_value_now - owed)]].map(([k, v]) => (
                <div key={k} className="rounded-md bg-mist p-3"><div className="text-xs text-neutral-600">{k}</div><div className="text-lg font-bold">{v}</div></div>
              ))}
            </div>
            <p className="mt-3 text-sm">Payments: <b>{c.a.paying !== false ? 'on schedule' : 'NOT being made'}</b> · Drives <b>{c.v.annual_miles_est.toLocaleString()}</b> miles a year</p>
            <div className="mt-4 flex flex-wrap gap-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={c.consent} onChange={e => save(base.id, { flags: { consent: e.target.checked, vuln: c.vuln } })} className="h-4 w-4" /> Marketing consent</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={c.vuln} onChange={e => save(base.id, { flags: { consent: c.consent, vuln: e.target.checked } })} className="h-4 w-4" /> Extra care</label>
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="text-xl font-bold">Inspection findings</h3>
            <p className="text-sm text-neutral-600">Tick what your inspection found. The customer sees these and can change them.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {REPAIRS.map(item => {
                const on = dealerIds.includes(item.id);
                return (
                  <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-md border p-2 text-sm ${on ? 'border-black' : 'border-neutral-200 opacity-70'}`}>
                    <input type="checkbox" checked={on} onChange={() => save(base.id, dealerToggleIssuePatch(c, rec, item.id))} className="h-4 w-4" />
                    <span className="flex-1">{item.name}</span>
                    <span className="text-xs text-neutral-600">{money(item.min)}–{money(item.max)}</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 text-sm">
              <b>Customer changes:</b>{' '}
              {!changed ? <span className="text-neutral-600">none yet</span> : (
                <>
                  {eff.added.filter(x => !dealerIds.includes(x.id)).map(x => <span key={x.id} className="mr-2 rounded bg-red-100 px-2 py-0.5 text-toyota">Added: {x.name}</span>)}
                  {eff.removed.map(x => <span key={x.id} className="mr-2 rounded bg-neutral-200 px-2 py-0.5">Turned off: {x.name}</span>)}
                </>
              )}
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="text-xl font-bold">Customer interest</h3>
            <p className="mt-1 text-sm text-neutral-600">Vehicle searches {base.first} chose to save. Only saved searches with their consent appear here.</p>
            {searches.length === 0 ? <p className="mt-2 text-sm text-neutral-500">Nothing saved yet.</p> : (
              <ul className="mt-3 grid gap-2">
                {searches.map(x => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-mist p-3 text-sm">
                    <span>
                      <b>{x.model === 'Any' ? 'Any Toyota' : x.model}</b> {x.yearMin && x.yearMax ? `${x.yearMin}–${x.yearMax} ` : ''}near ZIP {x.zips.join(', ')} · {x.matchCount} matches in stock · top match: {x.topMatch}
                      <span className="block text-xs text-neutral-600">Mobile {x.phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')} · saved {new Date(x.savedAt).toLocaleDateString('en-US')} · consent: {x.consentText}</span>
                    </span>
                    <button onClick={() => { setTemplate('search'); document.getElementById('composer')?.scrollIntoView({ behavior: 'smooth' }); }} className="rounded-full border-2 border-black px-4 py-1 text-xs font-semibold hover:bg-white">Text about this search</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div id="composer" className={cardCls}>
            <h3 className="text-xl font-bold">Message {base.first}</h3>
            <p className="text-sm text-neutral-600">Pick a reason, optionally add a price or note, let Gemini draft the text, then edit and approve before it sends.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TEMPLATES.map(([k, l]) => (
                <button key={k} onClick={() => setTemplate(k)} className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold ${template === k ? 'border-black bg-black text-white' : 'border-black hover:bg-mist'}`}>{l}</button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Offer or price (optional)
                <input value={offer} onChange={e => setOffer(e.target.value)} placeholder="e.g. $1,500 off, or $27,990" className="mt-1 w-full rounded border border-neutral-400 px-3 py-2" />
              </label>
              <label className="text-sm">Note for Gemini (optional)
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. ends Sunday, RAV4 Hybrid in stock" className="mt-1 w-full rounded border border-neutral-400 px-3 py-2" />
              </label>
            </div>
            <button onClick={draft} disabled={busy !== ''} className="mt-3 rounded-full border-2 border-black px-5 py-2 text-sm font-semibold hover:bg-mist disabled:opacity-60">{busy === 'draft' ? 'Drafting...' : 'Draft with Gemini'}</button>

            <textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="Draft appears here. You can also type your own." className="mt-3 w-full rounded border border-neutral-400 p-3" />
            {source && <p className="mt-1 text-xs text-neutral-600">{source}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> I reviewed this message</label>
              <button disabled={!!blocked || !reviewed || !text.trim() || busy !== ''} onClick={send}
                className="rounded-full border-2 border-toyota bg-toyota px-6 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300">
                {busy === 'send' ? 'Sending...' : 'Approve and send text'}
              </button>
            </div>
            {status && <p className={`mt-3 text-sm ${status.ok ? 'text-pos' : 'text-toyota'}`}>{status.msg}</p>}
          </div>

          <div className={cardCls}>
            <h3 className="text-xl font-bold">Message history</h3>
            {history.length === 0 ? <p className="mt-2 text-sm text-neutral-600">No messages yet.</p> : (
              <ul className="mt-3 grid gap-2">
                {history.map((m: OutreachRecord) => (
                  <li key={m.id} className="rounded-md bg-mist p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2 text-xs text-neutral-600">
                      <span>{new Date(m.at).toLocaleString('en-US')} · {TEMPLATES.find(t => t[0] === m.template)?.[1] ?? m.template}</span>
                      <span className={m.status === 'sent' ? 'text-pos' : 'text-toyota'}>{m.status}{m.detail ? `: ${m.detail}` : ''}</span>
                    </div>
                    <p className="mt-1">{m.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-neutral-500">Demo note: texts are delivered to the demo phone number in .env.local, whichever customer is selected.</p>
    </section>
  );
}
