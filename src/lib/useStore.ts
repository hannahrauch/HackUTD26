'use client';
import { useCallback, useEffect, useState } from 'react';
import type { CustomerRecord, StoreData } from './types';

const EMPTY: StoreData = { customers: {}, messages: [] };

/** Loads the shared demo store (customer edits, dealer findings, messages) from the server. */
export function useStore() {
  const [data, setData] = useState<StoreData | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async (reset = false) => {
    try {
      const r = await fetch(`/api/store${reset ? '?reset=1' : ''}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`Store returned ${r.status}`);
      setData(await r.json());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load saved data.');
      setData(d => d ?? EMPTY);
    }
  }, []);

  // Each page load starts from the base data.
  useEffect(() => { refresh(true); }, [refresh]);

  /** Updates one customer's record locally first, then saves it on the server. */
  const save = useCallback(async (customerId: string, patch: Partial<CustomerRecord>) => {
    setData(d => {
      const base = d ?? EMPTY;
      return { ...base, customers: { ...base.customers, [customerId]: { ...(base.customers[customerId] ?? {}), ...patch } } };
    });
    try {
      const r = await fetch('/api/store', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId, patch }) });
      if (!r.ok) throw new Error(`Save failed (${r.status})`);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
      refresh();
    }
  }, [refresh]);

  return { data: data ?? EMPTY, loaded: data !== null, error, save, refresh };
}
