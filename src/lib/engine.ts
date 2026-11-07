import type { Customer, Issue } from './types';

export const money = (n: number) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
const DEP: Record<string, number> = { Tacoma: .07, Tundra: .07, 'RAV4 Hybrid': .09, Prius: .09, RAV4: .095, Highlander: .10, Camry: .10, Corolla: .105, 'Corolla Cross': .105, Avalon: .11 };

export type Row = { t: number; date: Date; odo: number; val: number; hi: number; lo: number; owed: number; equity: number; cm: number; cr: number; paid: number; total: number };

/** Deterministic value model: model-specific yearly depreciation, adjusted for driving more/less than usual. */
export function valueAt(c: Customer, t: number, miles: number) {
  const y = t / 12, v = c.v;
  const adj = Math.max(0.7, Math.min(1.1, 1 - 0.000002 * (miles - v.annual_miles_est) * y));
  return v.est_market_value_now * Math.pow(1 - (DEP[v.model] ?? .10), y) * adj;
}

export function forecast(c: Customer, N: number, miles: number, repair: number): Row[] {
  const { v, a } = c, loan = a.contract_type === 'loan', now = new Date(), out: Row[] = [];
  const r = loan ? a.apr! / 1200 : 0;
  let bal = loan ? a.current_balance! : a.payoff_quote!, cm = 0, cr = 0, paid = 0;
  for (let t = 0; t <= N; t++) {
    const date = new Date(now.getFullYear(), now.getMonth() + t, now.getDate());
    const odo = v.odometer_now + (miles * t) / 12;
    if (t > 0) {
      cm += (35 + 0.0011 * odo) * (new Date(v.toyota_care_ends) > date ? 0.4 : 1);
      if (new Date(v.basic_warranty_ends) <= date) cr += 12 + 0.0007 * Math.max(0, odo - 30000);
      if (loan) {
        if (bal > 0) { const due = bal * (1 + r), pay = Math.min(a.monthly_payment, due); paid += pay; bal = due - pay; }
      } else {
        if (t <= a.months_remaining) paid += a.monthly_payment;
        const k = Math.min(t, a.months_remaining) / a.months_remaining;
        bal = a.payoff_quote! + (a.residual_value! - a.payoff_quote!) * k;
      }
    }
    const val = valueAt(c, t, miles), band = .03 + .025 * (t / 12);
    out.push({ t, date, odo, val, hi: val * (1 + band), lo: val * (1 - band), owed: bal, equity: val - bal, cm, cr: cr + repair, paid, total: paid + cm + cr + repair });
  }
  return out;
}

export function rateFor(B: number, p: number, n: number) {
  let lo = 0, hi = .05;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; (B * m / (1 - Math.pow(1 + m, -n)) < p) ? (lo = m) : (hi = m); }
  return lo;
}
export function interestSeries(B: number, r: number, p: number, H: number) {
  const out = [0]; let bal = B, tot = 0;
  for (let t = 1; t <= H; t++) { if (bal > 0) { const i = bal * r; tot += i; bal = Math.max(0, bal + i - p); } out.push(Math.round(tot)); }
  return out;
}

const ISSUES: [RegExp, string, number, number, number][] = [
  [/transmission/, 'Transmission repair', 1800, 3000, 4500], [/brake/, 'Brake service', 350, 600, 900],
  [/battery/, 'Battery replacement', 150, 250, 400], [/tire/, 'Tire replacement', 500, 800, 1200],
  [/a\/c|air cond/, 'A/C repair', 600, 1200, 2000], [/check engine/, 'Check-engine diagnosis', 150, 500, 2500],
  [/noise|engine/, 'Engine noise', 500, 1500, 5000]
];
export function parseIssue(text: string): Issue | null {
  const t = text.toLowerCase(), m = t.match(/\$\s?([\d,]+)/), it = ISSUES.find(i => i[0].test(t));
  if (m) { const n = +m[1].replace(/,/g, ''); return { name: it ? it[1] : 'Custom repair', min: Math.round(n * .7), exp: n, max: Math.round(n * 1.4) }; }
  return it ? { name: it[1], min: it[2], exp: it[3], max: it[4] } : null;
}
export const horizonLabel = (n: number) => (n < 12 ? `${n} months` : n === 12 ? '1 year' : `${n / 12} years`);
