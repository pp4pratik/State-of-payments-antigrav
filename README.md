# UPI Pulse — State of Payments

A live, database-backed rebuild of [UPI-Dash](https://github.com/pp4pratik/UPI-Dash) — same single-page layout and view structure (UPI / UPI AutoPay / RBI Cards / RBI Payments / Circulars), same Airtable source data, but reading from a live Supabase database instead of numbers baked into a static HTML file at generation time.

## Architecture

- **Data source of truth**: [Airtable](https://airtable.com) base `UPI Pulse` (`appbVBAj5OHS5xYQ6`) — the same base [UPI-Dash](https://github.com/pp4pratik/UPI-Dash) uses. Two scripts fetch straight from the original government sources instead of hand-entry, writing to **both** Airtable (kept as the human-editable audit trail — easy to spot a bad month) and Supabase (what the live site reads) in the same run:
  - **RBI data** (RBI Cards, RBI Payments) — `scripts/fetch_rbi_data.py`. No bot protection on RBI's side, so a plain HTTP request + HTML table parse works.
  - **NPCI data** (UPI monthly trend, app stats, merchant categories, geography, AutoPay, circulars) — `scripts/fetch_npci_data.py`. NPCI's stats pages call a clean JSON API under the hood, but it's behind Akamai bot protection that blocks plain HTTP requests (`curl` gets a 403); a real (headless) browser passes straight through with no extra work, so this uses [Playwright](https://playwright.dev) instead of `urllib`.
  - **Not yet automated**: P2P/P2M Transactions. NPCI's own ecosystem-statistics page currently 500s on that specific tab for every month tested — confirmed via both the live UI and the raw API endpoint, so it's a bug on NPCI's end, not something fixable client-side. Falls back to Airtable hand-entry until they fix it.
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

To pull the latest NPCI data (monthly trend, app stats, merchant categories, geography, AutoPay, circulars) straight from npci.org.in:

```bash
pip install playwright && playwright install chromium   # one-time setup

python3 scripts/fetch_npci_data.py                              # everything
python3 scripts/fetch_npci_data.py --dry-run                    # preview without writing
python3 scripts/fetch_npci_data.py --only=circulars,app_stats   # just specific domains
```

Multi-row-per-month tables (app stats, merchant categories, geography, PSP member performance, AutoPay) replace that month's rows wholesale in Airtable (create-then-delete, so a mid-run failure never leaves the old data half-wiped) rather than trying to match individual entities row-by-row across runs; Supabase's upsert handles the equivalent via its natural key.

Both scripts need `AIRTABLE_TOKEN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the same `.env` (service role, not anon — the public read-only RLS policy blocks writes from anything else). Run manually once a new month is published — nothing is scheduled yet.

## Deployment

Pushing to `main` builds via `npm run build` and publishes `dist/` to GitHub Pages through `.github/workflows/deploy.yml`. The site currently lives at the GitHub Pages project URL (`base: '/state-of-payments/'` in `vite.config.ts`); if a custom domain is attached later, change that to `'/'` and redeploy.

## Known gaps vs. UPI-Dash

- No combined "download all data" export yet — every section has its own CSV button, but there's no single per-view export like UPI-Dash's `downloadAllBtn`.
- AutoPay's weighted approval/business-decline/technical-decline rates are computed live from the `psp_member_performance` table (volume-weighted average) rather than reproduced as a frozen snapshot.

## Disclaimer

All figures ultimately come from NPCI's and RBI's official statistics and circulars pages. This project is not affiliated with or endorsed by NPCI or RBI.
