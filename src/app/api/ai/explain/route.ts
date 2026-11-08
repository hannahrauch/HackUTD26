import { NextResponse } from 'next/server';
import customers from '@/data/customers.json';
import { forecast, horizonLabel, money } from '@/lib/engine';
import { geminiReady, geminiText } from '@/lib/gemini';
import { withOverrides } from '@/lib/issues';
import { readStore } from '@/lib/store';
import type { Customer } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Explains the forecast in plain language. The numbers are computed here by the
 * deterministic engine; Gemini only writes the explanation from those numbers.
 */
export async function POST(req: Request) {
  const { customerId, months, miles, repair } = (await req.json()) as {
    customerId?: string; months?: number; miles?: number; repair?: number;
  };
  const baseCust = (customers as unknown as Customer[]).find(x => x.id === customerId);
  if (!baseCust || !months || !miles) return NextResponse.json({ error: 'Unknown customer or missing inputs.' }, { status: 400 });
  const c = withOverrides(baseCust, (await readStore()).customers[baseCust.id]);

  const rep = Math.max(0, repair ?? 0);
  const rows = forecast(c, months, miles, rep);
  const base = forecast(c, months, miles, 0);
  const end = rows[rows.length - 1], start = base[base.length - 1];
  const loan = c.a.contract_type === 'loan';

  const facts = {
    customer: c.first,
    vehicle: `${c.v.model_year} Toyota ${c.v.model} ${c.v.trim}`,
    odometer_miles: c.v.odometer_now,
    miles_per_year_assumed: miles,
    horizon: horizonLabel(months),
    estimated_value_today: money(c.v.est_market_value_now),
    estimated_value_at_horizon: money(end.val),
    value_range_at_horizon: `${money(end.lo)} to ${money(end.hi)}`,
    contract: loan ? 'loan' : 'lease',
    amount_owed_at_horizon: money(end.owed),
    equity_at_horizon: money(end.equity),
    total_ownership_cost_at_horizon: money(end.total),
    maintenance_cost_at_horizon: money(end.cm),
    repair_added: money(rep),
    total_cost_before_repair: money(start.total),
    customer_says: c.says,
    data_pack_recommendation: c.best.move,
    data_pack_reasoning: c.best.why,
    payments_on_schedule: c.a.paying !== false,
    care_flag:!c.consent || c.vuln ? 'Customer needs extra care; avoid pushy language.' : 'none',
  };

  if (!geminiReady()) {
    return NextResponse.json({ source: 'template', text: templateText(facts) });
  }

  const prompt = `You are the explanation assistant for "My Little Toyota", a Toyota ownership forecast tool.
Explain this forecast to the customer in plain, warm, honest language.

Rules:
- Use ONLY the numbers in FACTS. Do not calculate or invent any other dollar figures or percentages.
- Explain what the forecast shows over the horizon, what changes if there is a repair, and why the recommendation makes sense (or where it might not).
- Say these are estimates, not offers. If a repair is added, remind them that a professional inspection is needed before deciding.
- If a care flag is present, be gentle and avoid pressure.
- Do not greet the customer. Refer to them only by the name in FACTS.customer; never use any other name.
- If FACTS.contract is "lease", describe "amount owed" as the buyout price at lease end, not a loan balance.
- If FACTS.payments_on_schedule is false, say the balance is growing because payments are not being made.
- Write 3 short paragraphs, under 150 words total. No headings, no bullet points.

FACTS (JSON):
${JSON.stringify(facts, null, 2)}`;

  try {
    const text = await geminiText(prompt);
    return NextResponse.json({ source: 'gemini', text });
  } catch (e) {
    console.error('[ai/explain] Gemini failed, using template:', e);
    return NextResponse.json({ source: 'template', text: templateText(facts), warning: 'Gemini was unavailable, so a standard explanation is shown.' });
  }
}

function templateText(f: Record<string, string | number | boolean>) {
  const repairLine = f.repair_added !== '$0'
    ? ` Adding a ${f.repair_added} repair raises total ownership cost from ${f.total_cost_before_repair} to ${f.total_ownership_cost_at_horizon} over ${f.horizon}.`
    : '';
  return `Over ${f.horizon}, your ${f.vehicle} is estimated to be worth about ${f.estimated_value_at_horizon} (range ${f.value_range_at_horizon}), with about ${f.amount_owed_at_horizon} still owed, leaving equity of ${f.equity_at_horizon}.${repairLine} ${f.data_pack_recommendation}: ${f.data_pack_reasoning} These are estimates, not offers. Get a professional inspection before deciding on any repair.`;
}
