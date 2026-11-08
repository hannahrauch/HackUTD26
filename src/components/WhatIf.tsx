'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { REPAIRS } from '@/lib/issues';
import { horizonLabel, money, type Row } from '@/lib/engine';
import type { IssueItem, Severity } from '@/lib/types';

const SEV: Record<Severity, string> = { high: 'bg-black text-white', moderate: 'bg-warn text-white', low: 'bg-neutral-200 text-neutral-800' };
export type Scenario = 'min' | 'exp' | 'max';
const SCEN: [Scenario, string][] = [['min', 'Best case'], ['exp', 'Expected case'], ['max', 'Worst case']];

type Props = {
  dealer: IssueItem[];      // findings from the dealer's inspection
  added: IssueItem[];       // things the customer added
  active: IssueItem[];      // what is currently counted in the forecast
  changed: boolean;         // customer has changed anything from the dealer's list
  scenario: Scenario; setScenario: (s: Scenario) => void;
  total: number;            // repair cost at the chosen scenario
  months: number; baseEnd: Row | null; end: Row;
  onToggle: (item: IssueItem, fromDealer: boolean) => void;
  onAdd: (item: IssueItem) => void;
  onRevert: () => void;
};

export default function WhatIf({ dealer, added, active, changed, scenario, setScenario, total, months, baseEnd, end, onToggle, onAdd, onRevert }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const isOn = (i: IssueItem) => active.some(x => x.id === i.id);
  const dealerIds = new Set(dealer.map(x => x.id));
  const addedIds = new Set(added.map(x => x.id));
  const others = REPAIRS.filter(r => !dealerIds.has(r.id) && !addedIds.has(r.id));

  async function interpret() {
    if (!text.trim()) return;
    setBusy(true); setNote('');
    try {
      const r = await fetch('/api/ai/issue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const j = await r.json();
      if (j.issue) { onAdd(j.issue as IssueItem); setNote(`${j.source === 'gemini' ? 'Gemini' : 'Keyword match'}: ${j.reason || j.issue.name} added.`); setText(''); }
      else setNote('I did not recognize that. Try "brakes", "battery", or "$2,500 repair".');
    } catch {
      setNote('Could not reach the interpreter. Pick an item below instead.');
    } finally {
      setBusy(false);
    }
  }

  const IssueRow = ({ item, fromDealer }: { item: IssueItem; fromDealer: boolean }) => (
    <label key={item.id} className={`flex cursor-pointer flex-wrap items-center gap-3 rounded-md border p-3 ${isOn(item) ? 'border-black bg-white' : 'border-neutral-200 bg-mist opacity-70'}`}>
      <input type="checkbox" checked={isOn(item)} onChange={() => onToggle(item, fromDealer)} className="h-4 w-4" />
      <span className="flex-1 font-semibold">{item.name}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${SEV[item.severity]}`}>{item.severity}</span>
      <span className="text-sm">{money(item.min)} to {money(item.max)}</span>
      <span className="text-xs text-neutral-600">{fromDealer ? (isOn(item) ? 'Dealer found' : 'Dealer found, turned off by you') : 'Added by you'}</span>
    </label>
  );

  return (
    <section id="whatif" className="mt-8 rounded-xl border border-neutral-200 p-6 shadow-sm">
      <h2 className="text-3xl font-bold tracking-tight">Inspection &amp; Vehicle Maintenance</h2>
      <p className="mt-1 text-sm text-neutral-600">Below is what your Toyota dealer found at inspection. You can untick anything you disagree with, and add anything else you have noticed. Use <b>Reset to dealer inspection</b> to undo all of your changes. The forecast above updates right away.</p>

      <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-neutral-600">Found at inspection</h3>
      <div className="mt-2 grid gap-2">
        {dealer.length === 0 && <p className="text-sm text-neutral-600">The inspection found nothing that needs attention.</p>}
        {dealer.map(i => <IssueRow key={i.id} item={i} fromDealer />)}
      </div>

      {added.length > 0 && (
        <>
          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-neutral-600">Added by you</h3>
          <div className="mt-2 grid gap-2">{added.map(i => <IssueRow key={i.id} item={i} fromDealer={false} />)}</div>
        </>
      )}

      <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-neutral-600">Something else you noticed?</h3>
      <div className="mt-2 flex flex-wrap gap-3">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && interpret()}
          placeholder="e.g. my transmission is slipping, or I need a $2,500 repair"
          className="min-w-[240px] flex-1 rounded border border-neutral-400 px-3 py-2" />
        <button onClick={interpret} disabled={busy} className="rounded-full border-2 border-toyota bg-toyota px-6 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60">{busy ? 'Thinking...' : 'Add it'}</button>
      </div>
      {note && <p className="mt-2 text-sm text-neutral-700">{note}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {others.map(r => (
          <button key={r.id} onClick={() => onAdd(r)} className="rounded-full border bg-mist px-3 py-1.5 text-sm hover:border-toyota">+ {r.name}</button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {SCEN.map(([k, l]) => (
            <button key={k} onClick={() => setScenario(k)} className={`rounded-full border-2 border-black px-4 py-1.5 text-sm font-semibold ${scenario === k ? 'bg-black text-white' : 'hover:bg-mist'}`}>{l}</button>
          ))}
        </div>
        <button onClick={onRevert} disabled={!changed} className="rounded-full border-2 border-black px-5 py-1.5 text-sm font-semibold hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40">Reset to dealer inspection</button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${active.length}-${scenario}-${total}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`mt-4 border-l-4 p-4 text-sm ${total > 0 ? 'border-warn bg-amber-50' : 'border-neutral-300 bg-mist'}`}>
          {total > 0 && baseEnd ? (
            <>
              <b>Repairs counted: {money(total)}</b> ({active.length} {active.length === 1 ? 'item' : 'items'}, {SCEN.find(s => s[0] === scenario)?.[1].toLowerCase()}). Over {horizonLabel(months)} this moves your total ownership cost from {money(baseEnd.total)} to {money(end.total)}.
              {active.some(a => a.severity === 'high') && <> Some of these affect safety: do not keep driving if brakes or steering are involved.</>}
              {' '}These are preliminary estimates, not a diagnosis. Get a professional inspection before you decide.
            </>
          ) : 'No repairs counted. The chart shows your baseline forecast.'}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
