# My Little Toyota

Next.js 14 (App Router) + React + TypeScript + Tailwind + Recharts + Framer Motion.

## Run it
```bash
npm install
npm run dev        # http://localhost:3000
```
Needs Node 18.17 or newer. In VS Code: File > Open Folder, then use the built-in terminal (Ctrl+`).

## Structure
- `src/lib/engine.ts`   forecast engine: plain math, no AI (value, loan/lease balance, equity, maintenance, repairs, cost, confidence band)
- `src/lib/messages.ts` message templates (SMS, email, dealership; 3 tones)
- `src/components/`     Hero, ForecastChart (the centerpiece), WhatIf, NextMove, Messages
- `src/data/customers.json`  the Toyota Next Move data pack (20 customers) converted from Excel
- `src/app/api/photon/route.ts`  server-side send route (key stays on the server)

## Photon
1. `cp .env.example .env.local` and fill in `PHOTON_API_KEY` and `PHOTON_API_URL`.
2. Open `src/app/api/photon/route.ts` and match the request body to the Photon 2.0 docs (the field names there are placeholders).
3. Restart `npm run dev`. The route already refuses customers without consent or flagged for extra care.

Never commit `.env.local` (already in `.gitignore`).
