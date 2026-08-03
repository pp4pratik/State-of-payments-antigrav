"""
Syncs the "UPI Pulse" Airtable base into the Supabase Postgres tables defined in
supabase/schema.sql. Replaces UPI-Dash's regenerate_dashboard.py, which rewrote a
static HTML file instead of a database - the Airtable base itself stays the single
source of truth that gets hand-edited each month.

Usage:
    python3 scripts/sync_airtable_to_supabase.py

Requires a .env (see .env.example) with AIRTABLE_TOKEN, SUPABASE_URL, and
SUPABASE_SERVICE_ROLE_KEY. The service role key is required (not the anon key)
because the public read-only RLS policy blocks writes from anything else.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
BATCH_SIZE = 500


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


def fetch_all_airtable(base_id, table_id, token):
    records = []
    offset = None
    while True:
        url = f"https://api.airtable.com/v0/{base_id}/{table_id}?pageSize=100"
        if offset:
            url += f"&offset={offset}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req) as resp:
            data = json.load(resp)
        records.extend(r["fields"] for r in data["records"])
        offset = data.get("offset")
        if not offset:
            break
    return records


def upsert_supabase(supabase_url, service_role_key, pg_table, unique_cols, rows):
    if not rows:
        return 0
    url = f"{supabase_url}/rest/v1/{pg_table}?on_conflict={','.join(unique_cols)}"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    synced = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        req = urllib.request.Request(
            url, data=json.dumps(batch).encode(), headers=headers, method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                resp.read()
        except urllib.error.HTTPError as e:
            print(f"  ERROR upserting into {pg_table}: {e.code} {e.read().decode()}")
            sys.exit(1)
        synced += len(batch)
    return synced


def main():
    env = load_env(PROJECT_DIR / ".env")
    airtable_token = env.get("AIRTABLE_TOKEN")
    supabase_url = env.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (airtable_token and supabase_url and service_role_key):
        sys.exit(
            "Missing AIRTABLE_TOKEN, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY in .env"
        )

    with open(PROJECT_DIR / "supabase" / "airtable_schema.json") as f:
        airtable_schema = json.load(f)
    base_id = airtable_schema["baseId"]
    airtable_table_ids = airtable_schema["tables"]

    with open(PROJECT_DIR / "supabase" / "table_map.json") as f:
        table_map = json.load(f)

    for airtable_name, cfg in table_map.items():
        table_id = airtable_table_ids[airtable_name]
        records = fetch_all_airtable(base_id, table_id, airtable_token)
        rows = []
        for fields in records:
            row = {}
            for airtable_field, pg_col in cfg["fields"].items():
                row[pg_col] = fields.get(airtable_field)
            rows.append(row)

        # A single upsert statement can't touch the same (unique key) row twice, so
        # defensively dedupe by unique key (keeping the last occurrence) rather than
        # failing the whole sync. This masks, but doesn't fix, duplicate rows in
        # Airtable itself - surfaced below so they can be cleaned up at the source.
        by_key = {}
        for row in rows:
            key = tuple(row.get(col) for col in cfg["unique"])
            by_key[key] = row
        if len(by_key) != len(rows):
            print(
                f"  WARNING: {airtable_name} has {len(rows) - len(by_key)} duplicate "
                f"row(s) for the same {cfg['unique']} - keeping the last one seen. "
                f"Clean these up in Airtable directly."
            )
        deduped_rows = list(by_key.values())

        synced = upsert_supabase(
            supabase_url, service_role_key, cfg["pg"], cfg["unique"], deduped_rows
        )
        print(f"{airtable_name} -> {cfg['pg']}: {synced} rows")

    print("Sync complete.")


if __name__ == "__main__":
    main()
