# State of Payments

A live dashboard tracking India's UPI, card, and RBI-published payment-system statistics — a React/Supabase successor to [UPI-Dash](https://github.com/pp4pratik/UPI-Dash), which is a single static HTML file with hardcoded data.

## Architecture

- **Data source of truth**: [Airtable](https://airtable.com) base `UPI Pulse` (`appbVBAj5OHS5xYQ6`) — the same base [UPI-Dash](https://github.com/pp4pratik/UPI-Dash) uses, hand-maintained from NPCI/RBI's published statistics.
- **Backend**: [Supabase](https://supabase.com) Postgres, exposed read-only via its auto-generated REST API. A sync script mirrors the Airtable tables into Supabase (replacing UPI-Dash's `regenerate_dashboard.py`, which rewrote a static HTML file instead).
- **Frontend**: Vite + React + TypeScript, [TanStack Query](https://tanstack.com/query) for data fetching/caching, [TanStack Router](https://tanstack.com/router) (file-based routes in `src/routes/`), [Recharts](https://recharts.org) for charts, Tailwind CSS v4 for styling.
- **Hosting**: GitHub Pages, deployed via GitHub Actions on every push to `main`.

## Status

Early scaffold — routes and empty states are in place; Supabase isn't wired up yet. See open issues / project board for what's next.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` once a Supabase project exists — until then, pages render a "Not connected" empty state instead of querying anything.

## Deployment

Pushing to `main` builds via `npm run build` and publishes `dist/` to GitHub Pages through `.github/workflows/deploy.yml`. The site currently lives at the GitHub Pages project URL (`base: '/state-of-payments/'` in `vite.config.ts`); if a custom domain is attached later, change that to `'/'` and redeploy.

## Disclaimer

All figures ultimately come from NPCI's and RBI's official statistics and circulars pages. This project is not affiliated with or endorsed by NPCI or RBI.
