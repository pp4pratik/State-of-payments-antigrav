"""
Fetches UPI and AutoPay statistics directly from npci.org.in - the NPCI half of the
"fetch from source, not hand-entry" pipeline (see scripts/fetch_rbi_data.py for the
RBI half). NPCI's stats pages call a clean JSON API under the hood, but that API is
behind Akamai bot protection that rejects plain HTTP requests (confirmed: curl gets
a 403 even with a normal browser User-Agent). A real browser passes straight through
with no extra work - no cookies/session priming needed - so this uses Playwright
(headless Chromium) to fetch each endpoint instead of urllib.

NOT covered: P2P/P2M Transactions. NPCI's own site currently 500s on that tab for
every month tested (confirmed via both the live UI and the raw API endpoint,
independent of any request details this script controls) - a live bug on their end,
not something fixable here. Falls back to Airtable hand-entry until NPCI fixes it.

Writes to BOTH Airtable (kept as the human-editable audit trail) and Supabase (what
the live site reads). Single-row-per-month tables (Monthly Trend) are found-and-
updated like fetch_rbi_data.py. Multi-row-per-month tables (App Stats, Merchant
Categories, Statewise, PSP Member Performance, AutoPay Registrations/Executions) use
delete-then-recreate for that month in Airtable instead of per-row matching - simpler
and safer than trying to match entity identity row-by-row across runs, and Supabase's
upsert (on_conflict on the natural key) handles the equivalent there directly.

Usage:
    python3 scripts/fetch_npci_data.py [--dry-run] [--only monthly_trend,app_stats,...]

Requires .env: AIRTABLE_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Requires: pip install playwright && playwright install chromium
"""

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

from playwright.sync_api import sync_playwright

PROJECT_DIR = Path(__file__).resolve().parent.parent
MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def load_env(path):
    env = dict(os.environ)
    if path.exists():
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env.setdefault(k, v)
    return env


def month_iso(year, month_abbr_val):
    return f"{year}-{MONTH_ABBR.index(month_abbr_val) + 1:02d}-01"


def num(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", "").rstrip("%")
    if s == "" or s == "-":
        return None
    return float(s)


# ---------------- Fetching (Playwright, bypasses Akamai) ----------------
def fetch_json(page, url, retries=3):
    """NPCI's origin is occasionally flaky under repeated requests (seen: a
    transient 503 mid-session that would otherwise have silently looked like "no
    circulars exist" instead of "the fetch failed") - retry transient failures
    instead of treating them as empty results."""
    last_status = None
    for attempt in range(retries):
        resp = page.goto(url, wait_until="load", timeout=30000)
        last_status = resp.status if resp else None
        if resp is not None and resp.status == 200:
            try:
                return json.loads(page.inner_text("body")), resp.status
            except json.JSONDecodeError:
                pass  # fall through to retry
        if attempt < retries - 1:
            page.wait_for_timeout(2000 * (attempt + 1))
    return None, last_status


def fetch_all_pages(page, url_builder, page_size=100):
    """Follows totalCount/pageNum pagination, returns the flattened `results` (or
    `data.files` for the circulars endpoint) list across all pages."""
    all_rows = []
    page_no = 1
    while True:
        data, status = fetch_json(page, url_builder(page_no, page_size))
        if data is None or data.get("status") != 200:
            if page_no == 1:
                sys.exit(f"Fetch failed for page 1 (HTTP {status}) - aborting rather than treating this as 'no data'")
            break
        payload = data["data"]
        rows = payload.get("results")
        if rows is None:
            rows = payload.get("files", [])
        if isinstance(rows, dict):  # mcc's shape: {"tableDetail": [...]}
            rows = rows.get("tableDetail", [])
        all_rows.extend(rows)
        total = payload.get("totalCount", len(all_rows))
        if len(all_rows) >= total or not rows:
            break
        page_no += 1
    return all_rows


def find_latest_month(page, url_for_month, months_back=6):
    """Walks backward from the current month until one returns real data. NPCI's
    ecosystem-statistics tabs (app stats, categories, geography, member performance)
    consistently lag ~1 month behind the headline monthly-trend figure."""
    today = date.today()
    y, m = today.year, today.month
    for _ in range(months_back):
        month_abbr_val = MONTH_ABBR[m - 1]
        data, status = fetch_json(page, url_for_month(y, month_abbr_val))
        if data and data.get("status") == 200:
            payload = data["data"]
            rows = payload.get("results")
            if isinstance(rows, dict):
                rows = rows.get("tableDetail", [])
            if rows:
                return y, month_abbr_val, data
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    sys.exit(f"No data found for the last {months_back} months - NPCI page layout may have changed")


# ---------------- Domain fetchers ----------------
def fetch_monthly_trend(page):
    url = (
        "https://www.npci.org.in/api/product-statistic/tab/detail"
        "?product_name=upi&tab_name=product-statistics-upi&year_range=2026-27"
        "&excel_type=monthly&page_no=1&page_size=1&locale=en"
    )
    data, status = fetch_json(page, url)
    if not data or data.get("status") != 200 or not data["data"]["results"]:
        sys.exit("Could not fetch Monthly Trend - page layout may have changed")
    r = data["data"]["results"][0]
    m, y = r["month"].split("-")  # e.g. "July-2026"
    return {
        "Month": month_iso(int(y), m[:3]),
        "Banks Live": num(r["no_of_banks_live_on_upi"]),
        "Total Volume (Mn)": num(r["volume_in_mn"]),
        "Total Value (Cr)": num(r["value_in_cr"]),
    }


def fetch_app_stats(page):
    def url_for(y, m):
        return (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=UPI&tab_name=upi-apps&year={y}&month={m}&page_no=1&sort_by=asc&size=1&locale=en"
        )

    y, m, _ = find_latest_month(page, url_for)
    rows = fetch_all_pages(
        page,
        lambda pn, sz: (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=UPI&tab_name=upi-apps&year={y}&month={m}&page_no={pn}&sort_by=asc&size={sz}&locale=en"
        ),
    )
    out = []
    for r in rows:
        name = re.sub(r"\s*#\s*$", "", r["application_name"]).strip()  # strip TPAP marker
        out.append(
            {
                "App Name": name,
                "Month": month_iso(y, m),
                "Volume (Mn)": num(r["total_volume_mn"]),
                "Value (Cr)": num(r["total_value_cr"]),
            }
        )
    return out


def fetch_merchant_categories(page):
    def url_for(y, m):
        return (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=UPI&tab_name=mcc&year={y}&month={m}&page_no=1&sort_by=asc&size=1&locale=en"
        )

    y, m, _ = find_latest_month(page, url_for)
    rows = fetch_all_pages(
        page,
        lambda pn, sz: (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=UPI&tab_name=mcc&year={y}&month={m}&page_no={pn}&sort_by=asc&size={sz}&locale=en"
        ),
    )
    out = []
    for r in rows:
        description = (r["description"] or "").strip()
        # NPCI's mcc tab includes a grand-total footer row ("Total") alongside the
        # real "Others" catch-all category - both have a blank MCC, and if "Total"
        # isn't dropped it has the single largest volume/value of any row, so it'd
        # show up on the site as the #1 "top merchant category", which is nonsense.
        if description.lower() == "total":
            continue
        out.append(
            {
                "Description": description,
                # '' not None: Supabase's upsert matches on_conflict(mcc, month), and
                # SQL NULL never equals NULL for that purpose, so a null MCC (real for
                # "Others") would insert a fresh duplicate row on every single run
                # instead of updating the existing one. Confirmed the hard way: three
                # duplicate "Others" rows had piled up in Supabase before this fix.
                "MCC": r["mcc"] or "",
                # Airtable's Type select field only has the short-form options
                # ("High Transacting" etc.) - NPCI's site now labels them with a
                # trailing " Categories" that isn't a valid existing option, and
                # this token lacks permission to add new ones.
                "Type": re.sub(r"\s+Categories$", "", r["type"] or "").strip(),
                "Month": month_iso(y, m),
                "Volume (Mn)": num(r["volume_in_mn"]),
                "Value (Cr)": num(r["value_in_cr"]),
            }
        )
    return out


def fetch_statewise(page):
    def url_for(y, m):
        return (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=UPI&tab_name=statewise-statistic&year={y}&month={m}&page_no=1&sort_by=asc&size=1&locale=en"
        )

    y, m, _ = find_latest_month(page, url_for)
    rows = fetch_all_pages(
        page,
        lambda pn, sz: (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=UPI&tab_name=statewise-statistic&year={y}&month={m}&page_no={pn}&sort_by=asc&size={sz}&locale=en"
        ),
        page_size=100,
    )
    out = []
    for r in rows:
        state = re.sub(r"\s*#\s*$", "", (r["state_union_territory"] or "")).strip()
        district = (r["district"] or "").strip()
        is_unclassified = state.lower().startswith("unclassified")
        # NPCI's response nests a per-state "Total" summary row (district="-") above
        # that state's own district rows - confirmed the district rows already sum
        # back to the same total (55.82% vs 55.93%, within rounding), so keeping
        # both would double: a "Total" row with no district name would rank at the
        # top of any volume-sorted table, ahead of every real district, showing a
        # blank/"-" location. Drop those, but keep "Unclassified" (44% of volume
        # this month - transactions NPCI couldn't attribute to any district) as its
        # own real entry rather than silently losing that share of the total.
        if is_unclassified:
            district = "Unclassified"
        elif district == "-":
            continue
        out.append(
            {
                "State": state,
                "District": district,
                "Month": month_iso(y, m),
                "Volume (Mn)": num(r["volume_in_mn"]),
                "Volume Share %": num(r["volume_contribution"]),
                "Value (Cr)": num(r["value_in_cr"]),
                "Value Share %": num(r["value_contribution"]),
            }
        )
    return out


def fetch_psp_member_performance(page):
    def url_for_direction(direction):
        def url_for(y, m):
            return (
                f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
                f"?product_name=UPI&tab_name=top50-member&type_name={direction}&year={y}&month={m}"
                f"&page_no=1&sort_by=asc&size=1&locale=en"
            )

        return url_for

    out = []
    for direction, label in [("remitter", "Remitter"), ("beneficiary", "Beneficiary")]:
        y, m, _ = find_latest_month(page, url_for_direction(direction))
        rows = fetch_all_pages(
            page,
            lambda pn, sz, direction=direction, y=y, m=m: (
                f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
                f"?product_name=UPI&tab_name=top50-member&type_name={direction}&year={y}&month={m}"
                f"&page_no={pn}&sort_by=asc&size={sz}&locale=en"
            ),
        )
        entity_key = "upi_remitter_banks" if direction == "remitter" else "upi_beneficiary_banks"
        for r in rows:
            entity_name = r.get(entity_key) or r.get("upi_remitter_banks") or r.get("upi_beneficiary_banks")
            out.append(
                {
                    "Entity Name": entity_name,
                    "Direction": label,
                    "Month": month_iso(y, m),
                    "Volume (Mn)": num(r["total_volume_in_mn"]),
                    "Approved %": num(r["approved_percent"]),
                    "BD %": num(r["bd_percent"]),
                    "TD %": num(r["td_percent"]),
                }
            )
    return out


def fetch_autopay_registrations(page):
    def url_for(y, m):
        return (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=Autopay&tab_name=psp-reg&type_name=payer&year={y}&month={m}"
            f"&page_no=1&sort_by=asc&size=1&locale=en"
        )

    y, m, _ = find_latest_month(page, url_for)
    rows = fetch_all_pages(
        page,
        lambda pn, sz: (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=Autopay&tab_name=psp-reg&type_name=payer&year={y}&month={m}"
            f"&page_no={pn}&sort_by=asc&size={sz}&locale=en"
        ),
    )
    return [
        {"PSP": r["payer_psp"], "Month": month_iso(y, m), "Registrations (Mn)": num(r["total_volume"])}
        for r in rows
    ]


def fetch_autopay_executions(page):
    def url_for(y, m):
        return (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=Autopay&tab_name=top50-remitter&type_name=execution&year={y}&month={m}"
            f"&page_no=1&sort_by=asc&size=1&locale=en"
        )

    y, m, _ = find_latest_month(page, url_for)
    rows = fetch_all_pages(
        page,
        lambda pn, sz: (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=Autopay&tab_name=top50-remitter&type_name=execution&year={y}&month={m}"
            f"&page_no={pn}&sort_by=asc&size={sz}&locale=en"
        ),
    )
    return [
        {"Bank": r["remitter_bank"], "Month": month_iso(y, m), "Executions (Mn)": num(r["total_volume"])}
        for r in rows
    ]


def parse_circular(r):
    """NPCI's fileName freetext is wildly inconsistent (en-dashes vs pipes, missing
    separators, non-'UPI' categories like 'Product Compliance'/'PCOMP Portal'). Only
    reliable structured field is yearLabel ("FY 26-27") - use that for FY instead of
    parsing it out of the filename. Ref/Title come from splitting on '|': segment 0
    is the category (discarded), segment 1 is the ref, everything after is the
    title (with a leading 'FY ...-..' token stripped if present, since it's usually
    repeated redundantly in segment 2)."""
    name = r["fileName"].strip()
    year_match = re.search(r"(\d{2,4})\s*[-–]\s*(\d{2})", r.get("yearLabel") or "")
    if not year_match:
        return None
    fy_start, fy_end = year_match.groups()
    fy = (fy_start if len(fy_start) == 4 else f"20{fy_start}") + "-" + fy_end

    parts = [p.strip() for p in name.split("|")]
    if len(parts) < 2:
        return None
    ref = re.sub(r"\s+", " ", parts[1])
    rest = " | ".join(parts[2:]) if len(parts) > 2 else ""
    rest = re.sub(r"^FY\s*\d{2,4}\s*[-–]\s*\d{2}\s*[|–-]*\s*", "", rest, flags=re.IGNORECASE)
    title = re.sub(r"\s+", " ", rest).strip(" |-–") or name
    return ref, fy, title


def fetch_circulars(page, years):
    out = []
    for year in years:
        rows = fetch_all_pages(
            page,
            lambda pn, sz, year=year: (
                f"https://www.npci.org.in/api/circulars/upi?pageNum={pn}&year={year}&sort=desc&size={sz}&locale=en"
            ),
        )
        for r in rows:
            parsed = parse_circular(r)
            if not parsed:
                print(f"  WARNING: could not parse circular, skipping: {r['fileName']!r}")
                continue
            ref, fy, title = parsed
            pdf_url = f"https://www.npci.org.in{r['media']['url']}" if r.get("media") else None
            out.append({"Ref": ref, "FY": fy, "Title": title, "PDF URL": pdf_url})
    return out


# ---------------- Write to Airtable + Supabase ----------------
def airtable_request(url, token, method="GET", body=None):
    headers = {"Authorization": f"Bearer {token}"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else {}


def airtable_find_ids_for_month(base_id, table_id, token, month_iso_val):
    ids = []
    offset = None
    while True:
        formula = urllib.parse.quote(f"IS_SAME({{Month}}, '{month_iso_val}')")
        url = f"https://api.airtable.com/v0/{base_id}/{table_id}?filterByFormula={formula}&pageSize=100"
        if offset:
            url += f"&offset={offset}"
        data = airtable_request(url, token)
        ids.extend(r["id"] for r in data["records"])
        offset = data.get("offset")
        if not offset:
            break
    return ids


def airtable_batch_delete(base_id, table_id, token, ids):
    for i in range(0, len(ids), 10):
        batch = ids[i : i + 10]
        qs = "&".join(f"records[]={rid}" for rid in batch)
        airtable_request(f"https://api.airtable.com/v0/{base_id}/{table_id}?{qs}", token, method="DELETE")


def airtable_batch_create(base_id, table_id, token, field_rows):
    for i in range(0, len(field_rows), 10):
        batch = field_rows[i : i + 10]
        body = {"records": [{"fields": f} for f in batch]}
        airtable_request(f"https://api.airtable.com/v0/{base_id}/{table_id}", token, method="POST", body=body)


def airtable_upsert_single_row(base_id, table_id, token, fields, dry_run):
    month_iso_val = fields["Month"]
    if dry_run:
        print(f"  [dry-run] Airtable: would upsert 1 record for {month_iso_val}")
        return
    existing = airtable_find_ids_for_month(base_id, table_id, token, month_iso_val)
    if existing:
        airtable_request(
            f"https://api.airtable.com/v0/{base_id}/{table_id}/{existing[0]}",
            token,
            method="PATCH",
            body={"fields": fields},
        )
        print(f"  Airtable: updated record for {month_iso_val}")
    else:
        airtable_batch_create(base_id, table_id, token, [fields])
        print(f"  Airtable: created record for {month_iso_val}")


def airtable_replace_month_rows(base_id, table_id, token, field_rows, dry_run):
    if not field_rows:
        return
    month_iso_val = field_rows[0]["Month"]
    if dry_run:
        print(f"  [dry-run] Airtable: would replace {len(field_rows)} row(s) for {month_iso_val}")
        return
    # Create the new rows BEFORE deleting the old ones - if create fails partway
    # (e.g. a field validation error), the existing data is left untouched instead
    # of being wiped with nothing to replace it. Learned this the hard way: an
    # earlier version deleted-then-created and a 422 on create left Merchant
    # Categories empty for a month until manually re-run.
    existing = airtable_find_ids_for_month(base_id, table_id, token, month_iso_val)
    airtable_batch_create(base_id, table_id, token, field_rows)
    if existing:
        airtable_batch_delete(base_id, table_id, token, existing)
    print(f"  Airtable: replaced {len(existing)} -> {len(field_rows)} row(s) for {month_iso_val}")


def airtable_replace_all_circulars(base_id, table_id, token, field_rows, dry_run):
    """Circulars have no month axis, so dedupe by (FY, Ref) instead - delete any
    existing record with the same key before recreating, leaving everything else
    (older years not covered by this run) untouched."""
    if dry_run:
        print(f"  [dry-run] Airtable: would upsert {len(field_rows)} circular(s)")
        return

    all_records = []
    offset = None
    while True:
        url = f"https://api.airtable.com/v0/{base_id}/{table_id}?pageSize=100"
        if offset:
            url += f"&offset={offset}"
        data = airtable_request(url, token)
        all_records.extend(data["records"])
        offset = data.get("offset")
        if not offset:
            break

    by_key = {}
    for r in all_records:
        key = (r["fields"].get("FY"), r["fields"].get("Ref"))
        by_key[key] = r["id"]

    to_delete = [by_key[(row["FY"], row["Ref"])] for row in field_rows if (row["FY"], row["Ref"]) in by_key]
    airtable_batch_create(base_id, table_id, token, field_rows)  # create before delete - see note above
    if to_delete:
        airtable_batch_delete(base_id, table_id, token, to_delete)
    print(f"  Airtable: upserted {len(field_rows)} circular(s) ({len(to_delete)} replaced, {len(field_rows) - len(to_delete)} new)")


def snake(label):
    # Must match supabase/schema.sql's original generator (scratchpad gen_schema.mjs)
    # exactly, including replacing % with "pct" before the generic collapse -
    # otherwise "Volume Share %" becomes "volume_share" instead of the real column
    # "volume_share_pct" and every upsert 400s on "column not found".
    label = label.replace("%", "pct")
    return re.sub(r"^_+|_+$", "", re.sub(r"[^a-z0-9]+", "_", label.lower()))


def supabase_upsert(supabase_url, service_role_key, pg_table, unique_cols, rows, dry_run):
    if not rows:
        return
    if dry_run:
        print(f"  [dry-run] Supabase: would upsert {len(rows)} row(s) into {pg_table}")
        return
    url = f"{supabase_url}/rest/v1/{pg_table}?on_conflict={','.join(unique_cols)}"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    req = urllib.request.Request(url, data=json.dumps(rows).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"  ERROR upserting into {pg_table}: {e.code} {e.read().decode()}")
    print(f"  Supabase: upserted {len(rows)} row(s) into {pg_table}")


def supabase_get(supabase_url, service_role_key, pg_table, select_cols, filter_qs):
    headers = {"apikey": service_role_key, "Authorization": f"Bearer {service_role_key}"}
    url = f"{supabase_url}/rest/v1/{pg_table}?select={','.join(select_cols)}&{filter_qs}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def supabase_delete_by_ids(supabase_url, service_role_key, pg_table, ids):
    if not ids:
        return
    headers = {"apikey": service_role_key, "Authorization": f"Bearer {service_role_key}"}
    id_list = ",".join(str(i) for i in ids)
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/{pg_table}?id=in.({id_list})", headers=headers, method="DELETE"
    )
    with urllib.request.urlopen(req) as resp:
        resp.read()


def supabase_replace_month(supabase_url, service_role_key, pg_table, unique_cols, rows, dry_run):
    """Upsert never deletes rows absent from the new batch, so a renamed or
    dropped entity (confirmed the hard way: NPCI silently renamed 'FamApp' to
    'FamApp by Trio' between syncs) leaves a stale orphaned row behind forever.
    Upsert first (safe, additive - matches the create-before-delete rule used for
    Airtable), then delete anything left over for that month whose natural key
    isn't in the fresh batch."""
    if not rows:
        return
    month_val = rows[0]["month"]
    if dry_run:
        print(f"  [dry-run] Supabase: would replace all {pg_table} rows for {month_val}")
        return
    supabase_upsert(supabase_url, service_role_key, pg_table, unique_cols, rows, dry_run=False)

    fresh_keys = {tuple(r.get(c) for c in unique_cols) for r in rows}
    existing = supabase_get(
        supabase_url, service_role_key, pg_table, ["id"] + unique_cols, f"month=eq.{month_val}"
    )
    stale_ids = [r["id"] for r in existing if tuple(r.get(c) for c in unique_cols) not in fresh_keys]
    supabase_delete_by_ids(supabase_url, service_role_key, pg_table, stale_ids)
    if stale_ids:
        print(f"  Supabase: removed {len(stale_ids)} stale row(s) for {month_val} (renamed/dropped entities)")


def to_pg_rows(field_rows):
    return [{("month" if k == "Month" else snake(k)): v for k, v in row.items()} for row in field_rows]


# ---------------- Main ----------------
DOMAINS = {
    "monthly_trend": ("Monthly Trend", "monthly_trend", ["month"], fetch_monthly_trend, "single"),
    "app_stats": ("App Stats", "app_stats", ["app_name", "month"], fetch_app_stats, "multi"),
    "merchant_categories": ("Merchant Categories", "merchant_categories", ["mcc", "month"], fetch_merchant_categories, "multi"),
    "statewise": ("Statewise", "statewise", ["state", "district", "month"], fetch_statewise, "multi"),
    "psp_member_performance": ("PSP Member Performance", "psp_member_performance", ["entity_name", "direction", "month"], fetch_psp_member_performance, "multi"),
    "autopay_registrations": ("AutoPay Registrations", "autopay_registrations", ["psp", "month"], fetch_autopay_registrations, "multi"),
    "autopay_executions": ("AutoPay Executions", "autopay_executions", ["bank", "month"], fetch_autopay_executions, "multi"),
    "circulars": ("Circulars", "circulars", ["fy", "ref"], None, "circulars"),
}


def main():
    dry_run = "--dry-run" in sys.argv
    only = None
    for arg in sys.argv:
        if arg.startswith("--only"):
            only = set(arg.split("=", 1)[1].split(",")) if "=" in arg else None
    domains = {k: v for k, v in DOMAINS.items() if only is None or k in only}

    env = load_env(PROJECT_DIR / ".env")
    airtable_token = env.get("AIRTABLE_TOKEN")
    supabase_url = env.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (airtable_token and supabase_url and service_role_key):
        sys.exit("Missing AIRTABLE_TOKEN, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY in .env")

    with open(PROJECT_DIR / "supabase" / "airtable_schema.json") as f:
        airtable_schema = json.load(f)
    base_id = airtable_schema["baseId"]

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")

        for key, (airtable_name, pg_table, unique_cols, fetch_fn, kind) in domains.items():
            print(f"Fetching {airtable_name}...")
            table_id = airtable_schema["tables"][airtable_name]

            if kind == "single":
                fields = fetch_fn(page)
                print(f"  Found {fields['Month']}")
                airtable_upsert_single_row(base_id, table_id, airtable_token, fields, dry_run)
                supabase_upsert(supabase_url, service_role_key, pg_table, unique_cols, to_pg_rows([fields]), dry_run)

            elif kind == "multi":
                rows = fetch_fn(page)
                if not rows:
                    print("  No rows found, skipping")
                    continue
                print(f"  Found {len(rows)} row(s) for {rows[0]['Month']}")
                airtable_replace_month_rows(base_id, table_id, airtable_token, rows, dry_run)
                supabase_replace_month(supabase_url, service_role_key, pg_table, unique_cols, to_pg_rows(rows), dry_run)

            elif kind == "circulars":
                rows = fetch_circulars(page, years=[2025, 2026])
                print(f"  Found {len(rows)} circular(s)")
                airtable_replace_all_circulars(base_id, table_id, airtable_token, rows, dry_run)
                supabase_upsert(supabase_url, service_role_key, pg_table, unique_cols, to_pg_rows(rows), dry_run)

        browser.close()

    print("Done. (P2P/P2M Transactions not included - NPCI's own site currently errors on that tab; still hand-entered via Airtable.)")


if __name__ == "__main__":
    main()
