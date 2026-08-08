# UPI Pulse — State of Payments

A live, database-backed rebuild of [UPI-Dash](https://github.com/pp4pratik/UPI-Dash) — same single-page layout and view structure (UPI / UPI AutoPay / RBI Cards / RBI Payments / Circulars), same Airtable source data, but reading from a live Supabase database instead of numbers baked into a static HTML file at generation time.

## Architecture

- **Data source of truth**: [Airtable](https://airtable.com) base `UPI Pulse` (`appbVBAj5OHS5xYQ6`) — the same base [UPI-Dash](https://github.com/pp4pratik/UPI-Dash) uses. Two ingestion paths feed it:
  - **NPCI data** (UPI monthly trend, app stats, P2P/P2M, categories, geography, AutoPay, circulars) is still hand-entered into Airtable. NPCI's stats pages *do* have a clean JSON API under the hood, but it sits behind Akamai bot protection that blocks plain HTTP requests (confirmed: `curl` gets a 403; a real browser doesn't) — automating this would need a headless-browser fetcher, not yet built.
  - **RBI data** (RBI Cards, RBI Payments) is fetched directly from rbi.org.in by `scripts/fetch_rbi_data.py` — no bot protection on RBI's side, so a plain HTTP request + HTML table parse works. Writes to **both** Airtable (kept as the human-editable audit trail — easy to spot a bad month) and Supabase (what the live site reads) in the same run.
- **Backend**: [Supabase](https://supabase.com) Postgres, exposed read-only via its auto-generated REST API. `scripts/sync_airtable_to_supabase.py` mirrors the Airtable tables into Supabase (replacing UPI-Dash's `regenerate_dashboard.py`, which rewrote a static HTML file instead).
- **Frontend**: Vite + React + TypeScript, single page (`src/routes/index.tsx`) with a view switcher (`src/lib/DashboardContext.tsx`) rather than separate routes — matching UPI-Dash's own UX of one dropdown swapping between UPI/AutoPay/RBI Cards/RBI Payments/Circulars, plus a shared Volume/Value toggle and Year/Month selector. [TanStack Query](https://tanstack.com/query) fetches each table once and caches it; [Chart.js](https://www.chartjs.org/) (via `react-chartjs-2`) renders the bar+line, donut, and line charts. Numbers are normalized to a single **Crore** unit throughout (see `src/lib/format.ts`), matching UPI-Dash's convention.
- **Hosting**: GitHub Pages, deployed via GitHub Actions on every push to `main`.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

To repopulate Supabase from the latest Airtable data:

```bash
python3 scripts/sync_airtable_to_supabase.py
```

To pull the latest RBI Cards / RBI Payments month straight from rbi.org.in (writes to Airtable and Supabase):

```bash
python3 scripts/fetch_rbi_data.py           # run for real
python3 scripts/fetch_rbi_data.py --dry-run # parse and print without writing anything
```

Both scripts need `AIRTABLE_TOKEN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the same `.env` (service role, not anon — the public read-only RLS policy blocks writes from anything else). Run this manually once a new month is published — nothing is scheduled yet.

## Deployment

Pushing to `main` builds via `npm run build` and publishes `dist/` to GitHub Pages through `.github/workflows/deploy.yml`. The site currently lives at the GitHub Pages project URL (`base: '/state-of-payments/'` in `vite.config.ts`); if a custom domain is attached later, change that to `'/'` and redeploy.

## Known gaps vs. UPI-Dash

- No combined "download all data" export yet — every section has its own CSV button, but there's no single per-view export like UPI-Dash's `downloadAllBtn`.
- AutoPay's weighted approval/business-decline/technical-decline rates are computed live from the `psp_member_performance` table (volume-weighted average) rather than reproduced as a frozen snapshot.

## Disclaimer

All figures ultimately come from NPCI's and RBI's official statistics and circulars pages. This project is not affiliated with or endorsed by NPCI or RBI.
