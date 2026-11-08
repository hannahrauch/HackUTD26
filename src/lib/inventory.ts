import { CARD_PHOTOS } from './photos';
// DEMO INVENTORY. Synthetic Toyota listings for the McKinney dealership. Not live stock, not verified.
// Every result is labeled as demo data in the UI.

export const DEALERSHIP = { name: 'Toyota of McKinney', zip: '75069', lat: 33.197, lon: -96.639, city: 'McKinney, TX' };

/**
 * Approximate ZIP centroids for the Dallas-Fort Worth area used in the demo.
 * Distances are straight-line and approximate. ZIPs outside this table get no distance.
 */
export const ZIPS: Record<string, { lat: number; lon: number; city: string }> = {
  '75069': { lat: 33.197, lon: -96.639, city: 'McKinney' },
  '75070': { lat: 33.214, lon: -96.615, city: 'McKinney' },
  '75071': { lat: 33.176, lon: -96.670, city: 'McKinney' },
  '75002': { lat: 33.104, lon: -96.670, city: 'Allen' },
  '75024': { lat: 33.077, lon: -96.824, city: 'Plano' },
  '75074': { lat: 33.009, lon: -96.695, city: 'Plano' },
  '75093': { lat: 33.052, lon: -96.749, city: 'Plano' },
  '75078': { lat: 33.236, lon: -96.801, city: 'Prosper' },
  '75034': { lat: 33.165, lon: -96.823, city: 'Frisco' },
  '75035': { lat: 33.152, lon: -96.816, city: 'Frisco' },
  '75080': { lat: 32.948, lon: -96.713, city: 'Richardson' },
  '75081': { lat: 32.943, lon: -96.660, city: 'Richardson' },
  '75006': { lat: 32.975, lon: -96.889, city: 'Carrollton' },
  '75007': { lat: 33.000, lon: -96.900, city: 'Carrollton' },
  '75019': { lat: 32.958, lon: -97.015, city: 'Coppell' },
  '75063': { lat: 32.866, lon: -96.960, city: 'Irving' },
  '75201': { lat: 32.789, lon: -96.799, city: 'Dallas' },
  '75205': { lat: 32.832, lon: -96.800, city: 'Dallas' },
  '75230': { lat: 32.935, lon: -96.817, city: 'Dallas' },
  '75032': { lat: 32.902, lon: -96.458, city: 'Rockwall' },
  '75126': { lat: 32.749, lon: -96.454, city: 'Forney' },
  '76201': { lat: 33.214, lon: -97.133, city: 'Denton' },
};

/**
 * Only models that have a matching photo from the dealer's own site are listed, so every card
 * shows the right kind of car. Photos are current model-year shots, not the exact vehicle.
 */
/** Models that have matching dealer photos. Each car gets a different photo from its model's set. */
export const MODELS: Record<string, { msrp: number; trims: string[] }> = {
  'Corolla': { msrp: 23000, trims: ['LE', 'SE', 'XSE'] },
  'Corolla Cross': { msrp: 27000, trims: ['L', 'LE', 'XLE'] },
  'Camry': { msrp: 28000, trims: ['LE', 'SE', 'XLE'] },
  'RAV4': { msrp: 30000, trims: ['LE', 'XLE', 'Adventure'] },
  'Prius': { msrp: 28000, trims: ['LE', 'XLE'] },
  'Highlander': { msrp: 39000, trims: ['LE', 'XLE', 'Limited'] },
  'Grand Highlander': { msrp: 46000, trims: ['XLE', 'Limited'] },
  'Tacoma': { msrp: 33000, trims: ['SR5', 'TRD Off-Road'] },
  'Tundra': { msrp: 45000, trims: ['SR5', 'Limited'] },
  'Sequoia': { msrp: 62000, trims: ['SR5', 'Limited', 'Platinum'] },
  '4Runner': { msrp: 40000, trims: ['SR5', 'TRD Off-Road', 'Limited'] },
  'Crown': { msrp: 42000, trims: ['XLE', 'Limited'] },
};
const COLORS = ['Supersonic Red', 'Celestial Silver', 'Midnight Black', 'Wind Chill Pearl', 'Ice Cap', 'Lunar Rock', 'Magnetic Gray', 'Blueprint'];

export type Listing = {
  id: string; model: string; year: number; trim: string; color: string; price: number; miles: number;
  monthly: number; dealer: string; zip: string; distance: number | null; // miles from the nearest ZIP searched
  photo: string; // model photo from the dealer's site (not this exact car)
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Same inventory on every load (seeded), so searches are repeatable for the demo. */
const INVENTORY: Omit<Listing, 'distance' | 'zip'>[] = (() => {
  const r = rng(20260);
  const out: Omit<Listing, 'distance' | 'zip'>[] = [];
  let n = 0;
  for (const [model, info] of Object.entries(MODELS)) {
    const photos = CARD_PHOTOS[model] ?? [];
    for (let k = 0; k < 6; k++) {
      const year = 2016 + Math.floor(r() * 11); // 2016 to 2026
      const age = 2026 - year;
      const miles = Math.max(0, Math.round((age * 11000 + (r() - 0.5) * 8000) / 100) * 100);
      const trim = info.trims[Math.floor(r() * info.trims.length)];
      const price = Math.max(9000, Math.round((info.msrp * Math.pow(0.88, age) - miles * 0.03) / 50) * 50);
      out.push({
        id: `TOY-${String(++n).padStart(3, '0')}`, model, year, trim, price, miles,
        color: COLORS[Math.floor(r() * COLORS.length)],
        monthly: Math.round(monthlyPayment(price * 0.9, 0.069, 72)),
        dealer: DEALERSHIP.name, photo: photos[k % photos.length],
      });
    }
  }
  return out;
})();

/** Standard amortized payment (illustrative financing: 10% down, 72 months, 6.9% APR). */
export function monthlyPayment(principal: number, apr: number, months: number) {
  const r = apr / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** Straight-line miles between two points. */
export function milesBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 3958.8, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Searches Toyota listings near one or more ZIP codes. Each listing's distance is the distance from
 * the closest searched ZIP to the dealership. Only Toyota models are ever returned.
 */
export const YEARS = Array.from({ length: 11 }, (_, i) => 2016 + i); // 2016 to 2026

export function searchInventory(zips: string[], model?: string, yearMin = 2016, yearMax = 2026): { results: Listing[]; unknownZips: string[] } {
  const known = zips.filter(z => ZIPS[z]);
  const unknownZips = zips.filter(z => !ZIPS[z]);
  const dist = known.length ? Math.min(...known.map(z => milesBetween(ZIPS[z], DEALERSHIP))) : null;
  const results = INVENTORY
    .filter(l => (!model || model === 'Any' || l.model === model) && l.year >= yearMin && l.year <= yearMax)
    .map(l => ({ ...l, zip: DEALERSHIP.zip, distance: dist === null ? null : Math.round(dist) }))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0) || a.price - b.price);
  return { results, unknownZips };
}

export const MODEL_LIST = Object.keys(MODELS);
