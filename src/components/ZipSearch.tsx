'use client';
import { useState } from 'react';
import { DEALERSHIP, MODEL_LIST, YEARS, ZIPS, searchInventory, type Listing } from '@/lib/inventory';
import { money } from '@/lib/engine';
import type { SavedSearch } from '@/lib/types';

const CONSENT = `${DEALERSHIP.name} may text me about vehicles that match this search. Reply STOP to opt out.`;
const MAX_ZIPS = 5;

type Props = { first: string; searches: SavedSearch[]; onSave: (next: SavedSearch[]) => void };

export default function ZipSearch({ first, searches, onSave }: Props) {
  const [zipInput, setZipInput] = useState('');
  const [zips, setZips] = useState<string[]>([]);
  const [model, setModel] = useState('Any');
  const [yearMin, setYearMin] = useState(YEARS[0]);
  const [yearMax, setYearMax] = useState(YEARS[YEARS.length - 1]);
  const [err, setErr] = useState('');
  const [found, setFound] = useState<{ results: Listing[]; unknownZips: string[]; zips: string[]; model: string; yearMin: number; yearMax: number } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const addZip = () => {
    const z = zipInput.trim();
    if (!/^\d{5}$/.test(z)) { setErr('Enter a 5-digit ZIP code.'); return; }
    if (zips.includes(z)) { setErr('That ZIP is already in your search.'); return; }
    if (zips.length >= MAX_ZIPS) { setErr(`You can search up to ${MAX_ZIPS} ZIP codes at once.`); return; }
    setZips([...zips, z]); setZipInput(''); setErr(''); setFound(null); setSaveMsg('');
  };

  const search = () => {
    const list = zipInput.trim() ? [...zips, zipInput.trim()] : zips;
    if (!list.length) { setErr('Add at least one ZIP code.'); return; }
    if (list.some(z => !/^\d{5}$/.test(z))) { setErr('Every ZIP must be 5 digits.'); return; }
    if (yearMin > yearMax) { setErr('The earliest year must be before the latest year.'); return; }
    const uniq = [...new Set(list)];
    setZips(uniq); setZipInput(''); setErr(''); setSaveMsg(''); setShowAll(false);
    setFound({ ...searchInventory(uniq, model, yearMin, yearMax), zips: uniq, model, yearMin, yearMax });
  };

  const save = () => {
    if (!found) return;
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) { setSaveMsg('Enter a 10-digit mobile number.'); return; }
    if (!consent) { setSaveMsg('Please tick the box to agree to texts. Saving without it is not possible.'); return; }
    const top = found.results[0];
    const s: SavedSearch = {
      id: `s${Date.now()}`, zips: found.zips, model: found.model, yearMin: found.yearMin, yearMax: found.yearMax, phone: digits, consentText: CONSENT,
      savedAt: new Date().toISOString(), matchCount: found.results.length,
      topMatch: top ? `${top.year} Toyota ${top.model} ${top.trim}` : 'none',
    };
    onSave([s, ...searches]);
    setSaveMsg(`Saved. A Toyota sales person at ${DEALERSHIP.name} can now text you about this search.`);
    setPhone(''); setConsent(false);
  };

  const shown = found ? (showAll ? found.results : found.results.slice(0, 9)) : [];
  const cardCls = 'rounded-xl border border-neutral-200 p-6 shadow-sm';

  return (
    <section id="find" className={`mt-8 ${cardCls}`}>
      <h2 className="text-3xl font-bold tracking-tight">Find a Toyota near you</h2>
      <p className="mt-1 text-sm text-neutral-600">Search Toyota vehicles near one or more ZIP codes. Results are <b>demo inventory</b> for {DEALERSHIP.city}, not live stock, and prices are illustrative.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">ZIP code
          <input value={zipInput} onChange={e => setZipInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addZip()} placeholder="e.g. 75024" inputMode="numeric" maxLength={5}
            className="mt-1 block w-36 rounded border border-neutral-400 px-3 py-2" />
        </label>
        <button onClick={addZip} className="rounded-full border-2 border-black px-5 py-2 text-sm font-semibold hover:bg-mist">Add ZIP</button>
        <label className="text-sm">Years from
          <select value={yearMin} onChange={e => setYearMin(+e.target.value)} className="mt-1 block rounded border border-neutral-400 px-3 py-2">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="text-sm">to
          <select value={yearMax} onChange={e => setYearMax(+e.target.value)} className="mt-1 block rounded border border-neutral-400 px-3 py-2">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="text-sm">Model
          <select value={model} onChange={e => setModel(e.target.value)} className="mt-1 block rounded border border-neutral-400 px-3 py-2">
            <option value="Any">Any Toyota</option>
            {MODEL_LIST.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <button onClick={search} className="rounded-full border-2 border-toyota bg-toyota px-6 py-2 font-semibold text-white hover:bg-red-700">Search</button>
      </div>
      {zips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {zips.map(z => (
            <span key={z} className="flex items-center gap-2 rounded-full bg-mist px-3 py-1">
              {z}{ZIPS[z] ? ` (${ZIPS[z].city})` : ''}
              <button onClick={() => { setZips(zips.filter(x => x !== z)); setFound(null); }} className="text-neutral-500 hover:text-toyota" aria-label={`Remove ${z}`}>×</button>
            </span>
          ))}
        </div>
      )}
      {err && <p className="mt-2 text-sm text-toyota">{err}</p>}

      {found && (
        <div className="mt-6">
          <p className="text-sm text-neutral-700">
            <b>{found.results.length}</b> Toyota {found.results.length === 1 ? 'vehicle' : 'vehicles'} at {DEALERSHIP.name}, {DEALERSHIP.city}, closest to {found.zips.join(', ')}.
            {found.unknownZips.length > 0 && <> Distance is unknown for {found.unknownZips.join(', ')} (not in the demo ZIP list).</>}
          </p>
          {found.results.length === 0 && <p className="mt-3 text-sm">No {found.model} in stock right now. Try "Any Toyota".</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(l => (
              <article key={l.id} className="overflow-hidden rounded-lg border border-neutral-200">
                <div className="relative aspect-[4/3] bg-mist">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.photo} alt={`${l.model}, photo from the dealer's site`} className="h-full w-full object-contain" loading="lazy" />
                </div>
                <div className="p-4">
                <div className="text-xs text-neutral-500">{l.id} · {l.color}</div>
                <h3 className="font-bold">{l.year} Toyota {l.model} {l.trim}</h3>
                <div className="mt-1 text-xl font-bold">{money(l.price)}</div>
                <div className="text-sm text-neutral-700">{l.miles.toLocaleString()} miles · about {money(l.monthly)}/mo</div>
                <div className="mt-2 text-xs text-neutral-600">{l.dealer} · {l.distance !== null ? `about ${l.distance} mi from your ZIP` : 'distance unknown'}</div>
                <div className="mt-1 text-[11px] text-neutral-500">Photo shows a current {l.model}. Year, trim and color may differ.</div>
                </div>
              </article>
            ))}
          </div>
          {found.results.length > 9 && (
            <button onClick={() => setShowAll(!showAll)} className="mt-3 text-sm font-semibold underline">{showAll ? 'Show fewer' : `Show all ${found.results.length}`}</button>
          )}
          <p className="mt-3 text-xs text-neutral-500">Photos are from {DEALERSHIP.name}&apos;s website and show the current model. Monthly figures assume 10% down, 72 months, 6.9% APR. They are not an offer or pre-approval.</p>

          <div className="mt-6 rounded-lg bg-mist p-5">
            <h3 className="text-lg font-bold">Save this search?</h3>
            <p className="text-sm text-neutral-700">Save it and a Toyota sales person at {DEALERSHIP.name} can text you when matching vehicles come in. You can delete the saved search at any time.</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-sm">Mobile number
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-0100" inputMode="tel" className="mt-1 block rounded border border-neutral-400 px-3 py-2" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="h-4 w-4" />
                {CONSENT}
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={save} className="rounded-full border-2 border-black bg-black px-6 py-2 font-semibold text-white hover:bg-neutral-800">Save search and allow texts</button>
              {saveMsg && <span className="text-sm text-neutral-800">{saveMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {searches.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold">{first}&apos;s saved searches</h3>
          <ul className="mt-2 grid gap-2">
            {searches.map(s => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 p-3 text-sm">
                <span><b>{s.model === 'Any' ? 'Any Toyota' : s.model}</b> {s.yearMin && s.yearMax ? `${s.yearMin}–${s.yearMax} ` : ''}near {s.zips.join(', ')} · {s.matchCount} matches · saved {new Date(s.savedAt).toLocaleDateString('en-US')}</span>
                <button onClick={() => onSave(searches.filter(x => x.id !== s.id))} className="rounded-full border border-black px-3 py-1 text-xs font-semibold hover:bg-mist">Delete search</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
