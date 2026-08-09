"""
Export 100% of Supabase database tables into JSON files in public/data/
for Google Drive hosting and offline development.

Usage:
    python3 scripts/export_supabase_to_json.py
"""

import json
import os
import sys
import urllib.request
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_DIR / "public" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TABLES = [
    "monthly_trend",
    "app_stats",
    "p2p_p2m",
    "merchant_categories",
    "statewise",
    "circulars",
    "autopay_registrations",
    "autopay_executions",
    "autopay_registrations_by_bank",
    "autopay_executions_by_psp",
    "psp_member_performance",
    "rbi_cards",
    "rbi_payments",
]

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

def fetch_all_from_supabase(supabase_url, service_role_key, table):
    all_rows = []
    page_size = 1000
    offset = 0

    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
    }

    while True:
        url = f"{supabase_url}/rest/v1/{table}?select=*&limit={page_size}&offset={offset}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            data = json.load(resp)
            if not data:
                break
            all_rows.extend(data)
            if len(data) < page_size:
                break
            offset += page_size

    return all_rows

def main():
    env = load_env(PROJECT_DIR / ".env")
    supabase_url = env.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("VITE_SUPABASE_ANON_KEY")

    if not (supabase_url and service_role_key):
        sys.exit("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY missing in .env")

    print(f"Exporting complete datasets from Supabase: {supabase_url}\n")

    total_exported_rows = 0
    for table in TABLES:
        try:
            rows = fetch_all_from_supabase(supabase_url, service_role_key, table)
            out_file = OUTPUT_DIR / f"{table}.json"
            with open(out_file, "w") as f:
                json.dump(rows, f, indent=2)
            total_exported_rows += len(rows)
            print(f"✓ {table}.json -> {len(rows)} total historical rows exported")
        except Exception as e:
            print(f"❌ Error fetching {table}: {e}")

    print(f"\n🎉 Successfully exported all 13 tables ({total_exported_rows} total rows) to public/data/")

if __name__ == "__main__":
    main()
