import { NextResponse } from 'next/server';
import { patchCustomer, readStore } from '@/lib/store';
import type { CustomerRecord } from '@/lib/types';

export const runtime = 'nodejs';

const ALLOWED = ['overrides', 'dealerIds', 'addedIds', 'removedIds', 'customItems', 'searches', 'flags'] as const;

export async function GET() {
  return NextResponse.json(await readStore());
}

/** Merges one customer's changes. Only known fields are accepted. */
export async function POST(req: Request) {
  const body = (await req.json()) as { customerId?: string; patch?: Record<string, unknown> };
  if (!body.customerId || !body.patch) return NextResponse.json({ error: 'customerId and patch are required.' }, { status: 400 });

  const clean: Partial<CustomerRecord> = {};
  for (const k of ALLOWED) if (k in body.patch) (clean as Record<string, unknown>)[k] = body.patch[k];
  const rec = await patchCustomer(body.customerId, clean);
  return NextResponse.json({ ok: true, record: rec });
}
