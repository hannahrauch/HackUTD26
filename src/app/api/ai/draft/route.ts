import { NextResponse } from 'next/server';
import customers from '@/data/customers.json';
import { money } from '@/lib/engine';
import { geminiReady, geminiText } from '@/lib/gemini';
import { effectiveIssues, withOverrides } from '@/lib/issues';
import { readStore } from '@/lib/store';
import type { Customer } from '@/lib/types';

export const runtime = 'nodejs';

const DEALER = 'Toyota of McKinney';
const TEMPLATES: Record<string, string> = {
  price_drop: 'a price drop on a vehicle or trim they are interested in',
  sale: 'a limited-time sale or deal',
  service: 'a service or maintenance reminder',
  trade_in: 'a trade-in offer for their current Toyota',
  search: 'a follow-up about Toyota vehicles that match the vehicle search they saved',
  custom: 'a general update',
};

/** Drafts a dealer text. The offer amount and deal note come from the dealer; Gemini does not invent prices. */
export async function POST(req: Request) {
  if (req.headers.get('x-role') !== 'dealer') return NextResponse.json({ error: 'Dealer only.' }, { status: 403 });
  const { customerId, template = 'custom', offer, note } = (await req.json()) as { customerId?: string; template?: string; offer?: string; note?: string };
  const base = (customers as unknown as Customer[]).find(x => x.id === customerId);
  if (!base || !TEMPLATES[template]) return NextResponse.json({ error: 'Unknown customer or template.' }, { status: 400 });

  const store = await readStore();
  const c = withOverrides(base, store.customers[base.id]);
  const issues = effectiveIssues(c, store.customers[base.id]).active.map(x => x.name);
  const latest = store.customers[base.id]?.searches?.[0];
  const savedSearch = latest
    ? `${latest.model} near ZIP ${latest.zips.join(', ')}: ${latest.matchCount} matching vehicles, top match ${latest.topMatch}`
    : 'none';
  const owed = c.a.contract_type === 'loan' ? c.a.current_balance! : c.a.payoff_quote!;
  const facts = {
    customer_first_name: c.first,
    vehicle: `${c.v.model_year} Toyota ${c.v.model} ${c.v.trim}`,
    estimated_value: money(c.v.est_market_value_now),
    estimated_equity: money(c.v.est_market_value_now - owed),
    open_issues_on_file: issues,
    message_purpose: TEMPLATES[template],
    dealer_offer: offer?.trim() || 'none given',
    dealer_note: note?.trim() || 'none',
    saved_search: savedSearch,
    dealership: DEALER,
  };

  if (!geminiReady()) return NextResponse.json({ source: 'template', text: fallback(facts, template) });

  const prompt = `Write one text message from ${DEALER} to a customer. Purpose: ${TEMPLATES[template]}.
Rules:
- Plain SMS: friendly, under 300 characters, one clear call to action.
- Address the customer by customer_first_name only. Never use any other name.
- Use ONLY the numbers in FACTS. Do not invent prices, rates, or deadlines. If dealer_offer is "none given", do not mention a price.
- Mention an open issue only if one is listed, and say it neutrally.
- End with: Reply STOP to opt out.
- Return the message text only, no quotes, no preamble.

FACTS (JSON):
${JSON.stringify(facts, null, 2)}`;

  try {
    const text = await geminiText(prompt);
    return NextResponse.json({ source: 'gemini', text });
  } catch (e) {
    console.error('[ai/draft] Gemini failed, using template:', e);
    return NextResponse.json({ source: 'template', text: fallback(facts, template), warning: 'Gemini was unavailable, so a standard draft is shown.' });
  }
}

function fallback(f: Record<string, string | string[]>, template: string) {
  const name = f.customer_first_name as string;
  const car = f.vehicle as string;
  const offer = f.dealer_offer as string;
  const lead: Record<string, string> = {
    price_drop: `Hi ${name}, good news: the price just dropped on the models you were looking at.`,
    sale: `Hi ${name}, we have a limited-time deal on Toyotas this month.`,
    service: `Hi ${name}, your ${car} may be due for routine service. Want us to check what's coming up?`,
    trade_in: `Hi ${name}, we'd like to make you a trade-in offer on your ${car}.`,
    custom: `Hi ${name}, we have an update for you about your ${car}.`,
    search: `Hi ${name}, we found Toyotas that match the search you saved.`,
  };
  const deal = offer !== 'none given' ? ` Offer: ${offer}.` : '';
  return `${lead[template] ?? lead.custom}${deal} Reply to set up a time to talk. - ${DEALER}. Reply STOP to opt out.`;
}
