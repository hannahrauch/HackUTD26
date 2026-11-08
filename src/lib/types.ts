export type Severity = 'high' | 'moderate' | 'low';

export type Customer = {
  id: string; first: string; city: string; consent: boolean; vuln: boolean; says: string;
  v: { model_year: number; model: string; trim: string; odometer_now: number; annual_miles_est: number; est_market_value_now: number; toyota_care_ends: string; basic_warranty_ends: string; open_recall: string };
  a: { contract_type: 'loan' | 'lease'; months_remaining: number; apr: number | null; monthly_payment: number; current_balance: number | null; payoff_quote: number | null; residual_value: number | null; paying?: boolean };
  best: { move: string; msg: string; why: string; guard: string };
  opts: Opt[];
};
export type Opt = { id: string; name: string; pay: number | null; chg: number | null; up: number | null; vs: number | null; ok: string; sum: string };

/** A repair or maintenance item from the catalog, or a custom one the customer typed in. */
export type IssueItem = {
  id: string; name: string; kind: 'repair' | 'maintenance'; severity: Severity;
  min: number; exp: number; max: number;
  everyMonths?: number; everyMiles?: number; // maintenance schedule
};

/** Result of interpreting a what-if text. */
export type Issue = { name: string; min: number; exp: number; max: number };

/** Per-customer data the customer (and dealer) can change. Stored server-side. */
export type CustomerOverrides = Partial<{
  current_balance: number; monthly_payment: number; apr: number; months_remaining: number;
  odometer_now: number; annual_miles_est: number; est_market_value_now: number; paying: boolean;
}>;

export type CustomerRecord = {
  overrides?: CustomerOverrides;
  dealerIds?: string[];   // issues the dealer selected from inspection (undefined = use inspection defaults)
  addedIds?: string[];    // issues the customer added on top of the dealer's list
  removedIds?: string[];  // dealer issues the customer turned off
  customItems?: IssueItem[]; // issues the customer typed in
  searches?: SavedSearch[];  // vehicle searches the customer chose to save
  flags?: { consent?: boolean; vuln?: boolean }; // set by the dealership (marketing consent, extra care)
};

export type SavedSearch = {
  id: string; zips: string[]; model: string; yearMin?: number; yearMax?: number; phone: string; consentText: string;
  savedAt: string; matchCount: number; topMatch: string;
};

export type OutreachRecord = {
  id: string; customerId: string; text: string; template: string; at: string;
  status: 'sent' | 'failed' | 'blocked'; detail?: string;
};

export type StoreData = { customers: Record<string, CustomerRecord>; messages: OutreachRecord[] };
