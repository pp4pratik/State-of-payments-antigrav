"""
Historical 2024 Data Scraper & Sync

Scrapes full 2024 historical monthly data from NPCI endpoints across all domains
and updates public/data/*.json datasets and Google Drive.

Usage:
    python3 scripts/scrape_2024.py
"""

import json
import os
import re
import sys
from datetime import date
from pathlib import Path
from playwright.sync_api import sync_playwright
from gdrive_sync import sync_table_data

PROJECT_DIR = Path(__file__).resolve().parent.parent
MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

def month_iso(year, month_abbr_val):
    return f"{year}-{MONTH_ABBR.index(month_abbr_val) + 1:02d}-01"

def num(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", "").rstrip("%")
    if s == "" or s == "-":
        return None
    try:
        return float(s)
    except ValueError:
        return None

def fetch_json(page, url):
    try:
        resp = page.goto(url, wait_until="load", timeout=15000)
        if resp is not None and resp.status == 200:
            return json.loads(page.inner_text("body"))
    except Exception:
        pass
    return None

def fetch_all_pages(page, url_builder, page_size=100):
    all_rows = []
    page_no = 1
    while True:
        data = fetch_json(page, url_builder(page_no, page_size))
        if not data or data.get("status") != 200:
            break
        payload = data.get("data", {})
        rows = payload.get("results")
        if rows is None:
            rows = payload.get("files", [])
        if isinstance(rows, dict):
            rows = rows.get("tableDetail", [])
        if not rows:
            break
        all_rows.extend(rows)
        total = payload.get("totalCount", len(all_rows))
        if len(all_rows) >= total:
            break
        page_no += 1
    return all_rows

def scrape_2024_app_stats(page):
    print("\n--- Scraping 2024 App Stats ---")
    all_2024_rows = []
    for m_abbr in MONTH_ABBR:
        url_builder = lambda pn, sz: (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=UPI&tab_name=upi-apps&year=2024&month={m_abbr}&page_no={pn}&sort_by=asc&size={sz}&locale=en"
        )
        rows = fetch_all_pages(page, url_builder)
        if rows:
            m_iso = month_iso(2024, m_abbr)
            print(f"  Found {len(rows)} apps for {m_iso}")
            for r in rows:
                name = re.sub(r"\s*#\s*$", "", r.get("application_name", "")).strip()
                all_2024_rows.append({
                    "app_name": name,
                    "month": m_iso,
                    "volume_mn": num(r.get("total_volume_mn")),
                    "value_cr": num(r.get("total_value_cr")),
                })
    if all_2024_rows:
        sync_table_data("app_stats", ["app_name", "month"], all_2024_rows)

def scrape_2024_merchant_categories(page):
    print("\n--- Scraping 2024 Merchant Categories ---")
    all_2024_rows = []
    for m_abbr in MONTH_ABBR:
        url_builder = lambda pn, sz: (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=UPI&tab_name=mcc&year=2024&month={m_abbr}&page_no={pn}&sort_by=asc&size={sz}&locale=en"
        )
        rows = fetch_all_pages(page, url_builder)
        if rows:
            m_iso = month_iso(2024, m_abbr)
            print(f"  Found {len(rows)} MCC rows for {m_iso}")
            for r in rows:
                desc = (r.get("description") or "").strip()
                if desc.lower() == "total":
                    continue
                all_2024_rows.append({
                    "description": desc,
                    "mcc": r.get("mcc") or "",
                    "type": re.sub(r"\s+Categories$", "", r.get("type") or "").strip(),
                    "month": m_iso,
                    "volume_mn": num(r.get("volume_in_mn")),
                    "value_cr": num(r.get("value_in_cr")),
                })
    if all_2024_rows:
        sync_table_data("merchant_categories", ["mcc", "month"], all_2024_rows)

def scrape_2024_statewise(page):
    print("\n--- Scraping 2024 Statewise Geography ---")
    all_2024_rows = []
    for m_abbr in MONTH_ABBR:
        url_builder = lambda pn, sz: (
            f"https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
            f"?product_name=UPI&tab_name=statewise-statistic&year=2024&month={m_abbr}&page_no={pn}&sort_by=asc&size={sz}&locale=en"
        )
        rows = fetch_all_pages(page, url_builder)
        if rows:
            m_iso = month_iso(2024, m_abbr)
            print(f"  Found {len(rows)} statewise rows for {m_iso}")
            for r in rows:
                state = re.sub(r"\s*#\s*$", "", (r.get("state_union_territory") or "")).strip()
                district = (r.get("district") or "").strip()
                if state.lower().startswith("unclassified"):
                    district = "Unclassified"
                elif district == "-":
                    continue
                all_2024_rows.append({
                    "state": state,
                    "district": district,
                    "month": m_iso,
                    "volume_mn": num(r.get("volume_in_mn")),
                    "volume_share_pct": num(r.get("volume_contribution")),
                    "value_cr": num(r.get("value_in_cr")),
                    "value_share_pct": num(r.get("value_contribution")),
                })
    if all_2024_rows:
        sync_table_data("statewise", ["state", "district", "month"], all_2024_rows)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        
        scrape_2024_app_stats(page)
        scrape_2024_merchant_categories(page)
        scrape_2024_statewise(page)
        
        browser.close()
    print("\n🎉 Full 2024 historical scraping completed successfully!")

if __name__ == "__main__":
    main()
