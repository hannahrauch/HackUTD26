export type Opt = { id: string; name: string; pay: number | null; chg: number | null; up: number | null; vs: number | null; ok: string; sum: string };
export type Customer = {
  id: string; first: string; city: string; consent: boolean; vuln: boolean; says: string;
  v: { model_year: number; model: string; trim: string; odometer_now: number; annual_miles_est: number; est_market_value_now: number; toyota_care_ends: string; basic_warranty_ends: string; open_recall: string };
  a: { contract_type: 'loan' | 'lease'; months_remaining: number; apr: number | null; monthly_payment: number; current_balance: number | null; payoff_quote: number | null; residual_value: number | null };
  best: { move: string; msg: string; why: string; guard: string };
  opts: Opt[];
};
export type Issue = { name: string; min: number; exp: number; max: number };
