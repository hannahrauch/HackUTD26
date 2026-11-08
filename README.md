# My Little Toyota

A simple dashboard that shows a Toyota owner what their car will cost over the next few years, and helps the dealership follow up.

**Live site:** https://mylittletoyota.select

## Built with
- Next.js, React, TypeScript
- Tailwind CSS
- Recharts and Framer Motion
- Google Gemini (explanations and message drafts)
- Photon (sending approved texts)

## Run it

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev                  # open http://localhost:3000
```

Needs Node 18.17 or newer.

## Two views

- **Customer view:** Pick a customer from the top-right menu. See the car, the forecast, upcoming maintenance, inspection items, the next recommended move, and a ZIP search for Toyotas.
- **Dealer view:** Choose "Admin: Toyota of McKinney." See customers, their changes, and their saved searches. Draft a message, review it, and approve it. Customers never send messages.

## Demo steps

1. In the customer view, pick a user and save a search with a phone number and consent.
2. Switch to "Admin: Toyota of McKinney" and open the user's saved search.
3. Click "Text about this search," draft the message, review it, and send.

## Notes

- Data is saved to a local file (`data/store.json`) and is not committed.
- Never commit `.env.local`. It holds your API keys.
- Sending requires marketing consent.
