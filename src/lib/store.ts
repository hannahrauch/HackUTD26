import { promises as fs } from 'fs';
import path from 'path';
import type { CustomerRecord, OutreachRecord, StoreData } from './types';

// Server-only. A small JSON file keeps demo state (customer edits, dealer findings, messages)
// so it survives reloads and is shared between the customer view and the dealer view.
const FILE = path.join(process.cwd(), 'data', 'store.json');

export async function readStore(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw) as StoreData;
    return { customers: parsed.customers ?? {}, messages: parsed.messages ?? [] };
  } catch {
    return { customers: {}, messages: [] };
  }
}

let queue: Promise<unknown> = Promise.resolve();
/** Serializes writes so two requests cannot overwrite each other. */
export function updateStore<T>(fn: (s: StoreData) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const s = await readStore();
    const out = await fn(s);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(s, null, 2));
    return out;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function patchCustomer(customerId: string, patch: Partial<CustomerRecord>) {
  return updateStore(s => {
    s.customers[customerId] = { ...(s.customers[customerId] ?? {}), ...patch };
    return s.customers[customerId];
  });
}

export async function logMessage(rec: Omit<OutreachRecord, 'id' | 'at'>) {
  return updateStore(s => {
    const row: OutreachRecord = { ...rec, id: `m${Date.now()}${Math.floor(Math.random() * 1000)}`, at: new Date().toISOString() };
    s.messages.unshift(row);
    return row;
  });
}
