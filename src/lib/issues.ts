import type { Customer, CustomerRecord, IssueItem, Severity } from './types';

/** Repairs a dealer can find at inspection or a customer can add. Costs are illustrative estimates. */
export const REPAIRS: IssueItem[] = [
  { id: 'transmission', name: 'Transmission repair', kind: 'repair', severity: 'high', min: 1800, exp: 3000, max: 4500 },
  { id: 'brakes', name: 'Brake service', kind: 'repair', severity: 'high', min: 350, exp: 600, max: 900 },
  { id: 'battery-failure', name: 'Battery failure', kind: 'repair', severity: 'high', min: 150, exp: 250, max: 400 },
  { id: 'tires', name: 'Tire replacement', kind: 'repair', severity: 'moderate', min: 500, exp: 800, max: 1200 },
  { id: 'ac', name: 'A/C repair', kind: 'repair', severity: 'moderate', min: 600, exp: 1200, max: 2000 },
  { id: 'check-engine', name: 'Check-engine diagnosis and fix', kind: 'repair', severity: 'moderate', min: 150, exp: 500, max: 2500 },
  { id: 'engine-noise', name: 'Engine noise investigation', kind: 'repair', severity: 'high', min: 500, exp: 1500, max: 5000 },
  { id: 'suspension', name: 'Suspension work', kind: 'repair', severity: 'moderate', min: 400, exp: 900, max: 1600 },
  { id: 'alternator', name: 'Alternator replacement', kind: 'repair', severity: 'moderate', min: 400, exp: 650, max: 900 },
];

/** Routine items that come due on a schedule. Used for the milestone strip on the forecast chart. */
export const MAINTENANCE: IssueItem[] = [
  { id: 'oil', name: 'Oil and filter change', kind: 'maintenance', severity: 'low', min: 75, exp: 95, max: 120, everyMonths: 12, everyMiles: 10000 },
  { id: 'rotation', name: 'Tire rotation', kind: 'maintenance', severity: 'low', min: 25, exp: 35, max: 50, everyMonths: 6, everyMiles: 6000 },
  { id: 'wipers', name: 'Wiper blades', kind: 'maintenance', severity: 'low', min: 30, exp: 45, max: 60, everyMonths: 12 },
  { id: 'cabin-filter', name: 'Cabin air filter', kind: 'maintenance', severity: 'low', min: 40, exp: 60, max: 90, everyMonths: 24, everyMiles: 20000 },
  { id: 'ac-service', name: 'A/C service', kind: 'maintenance', severity: 'low', min: 120, exp: 170, max: 250, everyMonths: 36 },
  { id: 'battery', name: 'Battery replacement', kind: 'maintenance', severity: 'high', min: 150, exp: 200, max: 250, everyMonths: 48 },
  { id: 'brake-pads', name: 'Brake pads and rotors', kind: 'maintenance', severity: 'high', min: 350, exp: 600, max: 900, everyMonths: 36, everyMiles: 40000 },
  { id: 'tires-due', name: 'Tire set replacement', kind: 'maintenance', severity: 'moderate', min: 500, exp: 800, max: 1000, everyMonths: 48, everyMiles: 45000 },
  { id: 'trans-fluid', name: 'Transmission fluid service', kind: 'maintenance', severity: 'moderate', min: 150, exp: 220, max: 300, everyMonths: 48, everyMiles: 60000 },
  { id: 'coolant', name: 'Coolant flush', kind: 'maintenance', severity: 'moderate', min: 120, exp: 160, max: 200, everyMonths: 60, everyMiles: 60000 },
  { id: 'spark-plugs', name: 'Spark plugs', kind: 'maintenance', severity: 'moderate', min: 180, exp: 300, max: 450, everyMonths: 60, everyMiles: 100000 },
];

export const ALL_ITEMS = [...REPAIRS, ...MAINTENANCE];
export const severityRank: Record<Severity, number> = { high: 3, moderate: 2, low: 1 };

/** What the dealer's inspection finds, derived from age and mileage (simulated, not a real inspection). */
export function inspectionDefaults(c: Customer): string[] {
  const ids: string[] = [];
  const age = new Date().getFullYear() - c.v.model_year;
  if (c.v.odometer_now >= 30000) ids.push('brakes');
  if (c.v.odometer_now >= 40000) ids.push('tires');
  if (age >= 3) ids.push('battery-failure');
  return ids;
}

/** Applies stored customer overrides (edited balance, payment, mileage, etc.) to the base data pack record. */
export function withOverrides(c: Customer, rec?: CustomerRecord): Customer {
  const f = rec?.flags ?? {};
  const flagged = { ...c, consent: f.consent ?? c.consent, vuln: f.vuln ?? c.vuln };
  const o = rec?.overrides;
  if (!o) return flagged;
  c = flagged;
  const v = { ...c.v }, a = { ...c.a };
  if (o.odometer_now != null) v.odometer_now = o.odometer_now;
  if (o.annual_miles_est != null) v.annual_miles_est = o.annual_miles_est;
  if (o.est_market_value_now != null) v.est_market_value_now = o.est_market_value_now;
  if (o.monthly_payment != null) a.monthly_payment = o.monthly_payment;
  if (o.apr != null) a.apr = o.apr;
  if (o.months_remaining != null) a.months_remaining = o.months_remaining;
  if (o.current_balance != null && a.contract_type === 'loan') a.current_balance = o.current_balance;
  if (o.paying != null) a.paying = o.paying;
  return { ...c, v, a };
}

/** The customer's current list of issues: dealer findings plus their additions, minus what they turned off. */
export function effectiveIssues(c: Customer, rec?: CustomerRecord): { dealer: IssueItem[]; added: IssueItem[]; removed: IssueItem[]; active: IssueItem[] } {
  const dealerIds = rec?.dealerIds ?? inspectionDefaults(c);
  const addedIds = rec?.addedIds ?? [];
  const removedIds = rec?.removedIds ?? [];
  const custom = rec?.customItems ?? [];
  const find = (id: string) => REPAIRS.find(x => x.id === id) ?? custom.find(x => x.id === id);
  const dealer = dealerIds.map(find).filter((x): x is IssueItem => !!x);
  const added = addedIds.map(find).filter((x): x is IssueItem => !!x);
  const removed = removedIds.map(find).filter((x): x is IssueItem => !!x);
  const active = [...dealer.filter(x => !removedIds.includes(x.id)), ...added.filter(x => !dealerIds.includes(x.id))];
  return { dealer, added, removed, active };
}

/** Total repair cost of active issues at a chosen scenario. */
export function repairCost(active: IssueItem[], scenario: 'min' | 'exp' | 'max'): number {
  return active.reduce((s, x) => s + x[scenario], 0);
}

export type Milestone = {
  index: number; from: number; to: number; label: string;
  items: { item: IssueItem; reason: 'time' | 'miles' }[];
  severity: Severity | null; costMin: number; costMax: number;
};

/**
 * Splits the horizon into periods and lists the maintenance that comes due in each one.
 * An item is due when the period crosses a multiple of its time interval or its mileage interval.
 * `odo` is the odometer at each month, taken from the forecast rows.
 */
export function milestones(months: number, odo: (t: number) => number, step: number, now = new Date()): Milestone[] {
  const out: Milestone[] = [];
  for (let k = 0; k * step < months; k++) {
    const from = k * step, to = Math.min(months, (k + 1) * step);
    const items: Milestone['items'] = [];
    for (const item of MAINTENANCE) {
      if (item.everyMonths && Math.floor(to / item.everyMonths) > Math.floor(from / item.everyMonths)) items.push({ item, reason: 'time' });
      else if (item.everyMiles && Math.floor(odo(to) / item.everyMiles) > Math.floor(odo(from) / item.everyMiles)) items.push({ item, reason: 'miles' });
    }
    items.sort((a, b) => severityRank[b.item.severity] - severityRank[a.item.severity]);
    const end = new Date(now.getFullYear(), now.getMonth() + to, now.getDate());
    const label = to === 0 ? 'Now' : end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    out.push({
      index: k, from, to, label, items,
      severity: items.length ? items[0].item.severity : null,
      costMin: items.reduce((s, x) => s + x.item.min, 0),
      costMax: items.reduce((s, x) => s + x.item.max, 0),
    });
  }
  return out;
}

/** Customer ticks or unticks an issue. Dealer findings are turned off via removedIds; their own additions via addedIds. */
export function customerToggleIssuePatch(c: Customer, rec: CustomerRecord | undefined, item: IssueItem): Partial<CustomerRecord> {
  const dealerIds = rec?.dealerIds ?? inspectionDefaults(c);
  const addedIds = rec?.addedIds ?? [], removedIds = rec?.removedIds ?? [];
  if (dealerIds.includes(item.id)) {
    return { removedIds: removedIds.includes(item.id) ? removedIds.filter(x => x !== item.id) : [...removedIds, item.id] };
  }
  return { addedIds: addedIds.includes(item.id) ? addedIds.filter(x => x !== item.id) : [...addedIds, item.id] };
}

/** Customer adds an issue they typed in or chose from the catalog. */
export function customerAddIssuePatch(rec: CustomerRecord | undefined, item: IssueItem): Partial<CustomerRecord> {
  const addedIds = rec?.addedIds ?? [];
  const isCatalog = REPAIRS.some(r => r.id === item.id);
  const customItems = isCatalog ? (rec?.customItems ?? []) : [...(rec?.customItems ?? []).filter(x => x.id !== item.id), item];
  return { addedIds: addedIds.includes(item.id) ? addedIds : [...addedIds, item.id], customItems };
}

/** Customer puts their list back to exactly what the dealer found. */
export const customerRevertPatch = (): Partial<CustomerRecord> => ({ addedIds: [], removedIds: [], customItems: [] });

/** Dealer ticks or unticks a finding from the inspection. */
export function dealerToggleIssuePatch(c: Customer, rec: CustomerRecord | undefined, id: string): Partial<CustomerRecord> {
  const dealerIds = rec?.dealerIds ?? inspectionDefaults(c);
  return { dealerIds: dealerIds.includes(id) ? dealerIds.filter(x => x !== id) : [...dealerIds, id] };
}
