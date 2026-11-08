import { promises as fs } from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';
import type { CustomerRecord, OutreachRecord, StoreData } from './types';

// Server-only. Demo state (customer edits, dealer findings, messages) lives in:
// - Upstash Redis when its environment variables are set (live site on Vercel), so saves persist.
// - a local JSON file otherwise (local development).
const FILE = path.join(process.cwd(), 'data', 'store.json');
const KEY = 'my-little-toyota:store';

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

async function load(): Promise<StoreData> {
  if (redis) {
    const parsed = await redis.get<StoreData>(KEY);
    return parsed ? { customers: parsed.customers ?? {}, messages: parsed.messages ?? [] } : { customers: {}, messages: [] };
  }
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw) as StoreData;
    return { customers: parsed.customers ?? {}, messages: parsed.messages ?? [] };
  } catch {
    return { customers: {}, messages: [] };
  }
}

async function save(s: StoreData) {
  if (redis) {
    await redis.set(KEY, s);
    return;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(s, null, 2));
}

export async function readStore(): Promise<StoreData> {
  return load();
}

let queue: Promise<unknown> = Promise.resolve();
/** Serializes writes so two requests cannot overwrite each other. */
export function updateStore<T>(fn: (s: StoreData) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const s = await load();
    const out = await fn(s);
    await save(s);
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

/** Clears saved changes so the site starts from the base data again. */
export async function resetStore() {
  return updateStore(s => {
    s.customers = {};
    s.messages = [];
  });
}
