'use client';
import { useState } from 'react';

type Props = { customerId: string; months: number; miles: number; repair: number };
type Result = { key: string; text: string; source: 'gemini' | 'template'; warning?: string };

/** Asks the server to explain the current forecast. Numbers are computed by the engine; Gemini writes the words. */
export default function AIExplainer({ customerId, months, miles, repair }: Props) {
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const key = `${customerId}|${months}|${miles}|${repair}`;
  const stale = res !== null && res.key !== key;

  async function explain() {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/ai/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId, months, miles, repair }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Request failed');
      setRes({ key, text: j.text, source: j.source, warning: j.warning });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the explanation service.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 bg-mist p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Explain this forecast</h2>
        </div>
        <button onClick={explain} disabled={loading} className="rounded-full border-2 border-black bg-black px-6 py-2 font-semibold text-white hover:bg-neutral-800 disabled:opacity-60">
          {loading ? 'Explaining...' : res ? 'Explain again' : 'Explain with AI'}
        </button>
      </div>

      {stale && <p className="mt-3 text-sm text-amber-900">The inputs changed since this explanation. Click "Explain again" to update it.</p>}
      {error && <p className="mt-3 text-sm text-toyota">{error}</p>}
      {res && (
        <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
          {res.text.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
          {(res.source !== 'gemini' || res.warning) && (
            <p className="text-xs text-neutral-600">
              {res.source !== 'gemini' ? 'Standard explanation (AI unavailable).' : ''}
              {res.warning ? ` ${res.warning}` : ''}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
