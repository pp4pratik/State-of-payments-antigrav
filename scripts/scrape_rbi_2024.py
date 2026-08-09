"""
Historical 2024-2026 RBI Data Scraper & Sync

Scrapes full historical monthly data (all 12 months of 2024, 2025, and 2026) for:
- RBI Cards (ATM/POS/Card Statistics)
- RBI Payments (Payment System Indicators)

Updates public/data/rbi_cards.json, public/data/rbi_payments.json,
data/rbi_cards.json, data/rbi_payments.json, and syncs to Google Drive.

Usage:
    python3 scripts/scrape_rbi_2024.py
"""

import json
import re
import sys
import urllib.request
from pathlib import Path
from gdrive_sync import sync_table_data

PROJECT_DIR = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

MONTH_NUM = {
    "January": "01", "February": "02", "March": "03", "April": "04",
    "May": "05", "June": "06", "July": "07", "August": "08",
    "September": "09", "October": "10", "November": "11", "December": "12",
}

RBI_CARDS_FIELDS = [
    "atms_onsite", "atms_offsite", "pos_terminals", "micro_atms", "bharat_qr_codes", "upi_qr_codes",
    "credit_cards_outstanding", "debit_cards_outstanding",
    "credit_pos_volume", "credit_pos_value", "credit_online_volume", "credit_online_value",
    "credit_others_volume", "credit_others_value", "credit_atm_withdrawal_volume", "credit_atm_withdrawal_value",
    "debit_pos_volume", "debit_pos_value", "debit_online_volume", "debit_online_value",
    "debit_others_volume", "debit_others_value", "debit_atm_withdrawal_volume", "debit_atm_withdrawal_value",
    "debit_pos_withdrawal_volume", "debit_pos_withdrawal_value",
]

RBIP_VOLVAL_ROWS = [
    ("CCIL Operated Systems", "ccil_total"),
    ("Govt. Securities Clearing", "ccil_govt_securities"),
    ("Outright", "ccil_govt_outright"),
    ("Repo", "ccil_govt_repo"),
    ("Tri-party Repo", "ccil_govt_tri_party_repo"),
    ("Forex Clearing", "ccil_forex"),
    ("Rupee Derivatives", "ccil_rupee_derivatives"),
    ("Credit Transfers - RTGS", "rtgs_total"),
    ("Customer Transactions", "rtgs_customer"),
    ("Interbank Transactions", "rtgs_interbank"),
    ("Credit Transfers - Retail", "retail_credit_transfers"),
    ("AePS (Fund Transfers)", "aeps_fund_transfers"),
    ("APBS", "apbs"),
    ("IMPS", "imps"),
    ("NACH Cr", "nach_credit"),
    ("NEFT", "neft"),
    ("UPI", "upi"),
    ("Debit Transfers and Direct Debits", "debit_transfers"),
    ("BHIM Aadhaar Pay", "bhim_aadhaar_pay"),
    ("NACH Dr", "nach_debit"),
    ("NETC (linked to bank account)", "netc_linked_account"),
    ("Card Payments", "card_payments"),
    ("Credit Cards", "credit_cards"),
    ("PoS based", "credit_cards_pos"),
    ("Others", "credit_cards_other"),
    ("Debit Cards", "debit_cards"),
    ("PoS based", "debit_cards_pos"),
    ("Others", "debit_cards_other"),
    ("Prepaid Payment Instruments", "ppi_total"),
    ("Wallets", "ppi_wallets"),
    ("Cards", "ppi_cards"),
    ("PoS based", "ppi_cards_pos"),
    ("Others", "ppi_cards_other"),
    ("Paper-based Instruments", "paper_instruments"),
    ("CTS (NPCI Managed)", "paper_cts"),
    ("Total Retail Payments", "total_retail_payments"),
    ("Total Payments", "total_payments"),
    ("Total Digital Payments", "total_digital_payments"),
    ("Mobile Payments (mobile app based)", "mobile_payments"),
    ("Intra-bank", "mobile_intrabank"),
    ("Inter-bank", "mobile_interbank"),
    ("Internet Payments", "internet_payments"),
    ("Intra-bank", "internet_intrabank"),
    ("Inter-bank", "internet_interbank"),
    ("Cash Withdrawal at ATMs", "atm_cash_withdrawal"),
    ("Using Credit Cards", "atm_withdrawal_credit_card"),
    ("Using Debit Cards", "atm_withdrawal_debit_card"),
    ("Using Pre-paid Cards", "atm_withdrawal_prepaid_card"),
    ("Cash Withdrawal at PoS", "pos_cash_withdrawal"),
    ("Using Debit Cards", "pos_withdrawal_debit_card"),
    ("Using Pre-paid Cards", "pos_withdrawal_prepaid_card"),
    ("Cash Withdrawal at Micro ATMs", "micro_atm_withdrawal"),
    ("AePS", "micro_atm_aeps"),
]

RBIP_COUNT_ROWS = [
    ("Number of Cards", "cards_total_count"),
    ("Credit Cards", "credit_cards_count"),
    ("Debit Cards", "debit_cards_count"),
    ("Number of PPIs", "ppi_total_count"),
    ("Wallets", "ppi_wallets_count"),
    ("Cards", "ppi_cards_count"),
    ("Number of ATMs and CRMs", "atms_and_crms_count"),
    ("Bank owned ATMs", "bank_owned_atms_count"),
    ("White Label ATMs", "white_label_atms_count"),
    ("Number of Micro ATMs", "micro_atms_count"),
    ("Number of PoS Terminals", "pos_terminals_count"),
    ("Bharat QR", "bharat_qr_count"),
    ("UPI QR", "upi_qr_count"),
]

def fetch_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="ignore")

def parse_table_rows(html):
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL)
    out = []
    for r in rows:
        cells = re.findall(r"<td[^>]*>(.*?)</td>", r, re.DOTALL)
        cleaned = [re.sub(r"<[^>]+>", "", c).replace("&nbsp;", " ").strip() for c in cells]
        cleaned = [c for c in cleaned if c != ""]
        if cleaned:
            out.append(cleaned)
    return out

def month_label_to_iso(month_name, year):
    return f"{year}-{MONTH_NUM[month_name]}-01"

def scrape_all_rbi_cards():
    print("\n--- Scraping All RBI Cards (Range atmid=150 to 185) ---")
    all_rows = []
    seen_months = set()
    for atmid in range(185, 149, -1):
        try:
            html = fetch_url(f"https://rbi.org.in/Scripts/ATMView.aspx?atmid={atmid}")
            m = re.search(r"for the Month of ([A-Za-z]+) (\d{4})", html)
            if not m or m.group(1) not in MONTH_NUM:
                continue
            month_iso = month_label_to_iso(m.group(1), m.group(2))
            if month_iso in seen_months:
                continue
            
            rows = parse_table_rows(html)
            total_rows = [r for r in rows if r[0] == "Total"]
            if not total_rows:
                continue
            total_row = total_rows[0]
            numbers = [c for c in total_row[1:] if re.match(r"^-?[\d,.]+$", c)]
            if len(numbers) != len(RBI_CARDS_FIELDS):
                continue
                
            row_data = {"month": month_iso}
            for name, value in zip(RBI_CARDS_FIELDS, numbers):
                row_data[name] = float(value.replace(",", ""))
            all_rows.append(row_data)
            seen_months.add(month_iso)
            print(f"  ✓ Processed RBI Cards for {month_iso}")
        except Exception:
            pass

    if all_rows:
        sync_table_data("rbi_cards", ["month"], all_rows)

def strip_row_number(label):
    label = re.sub(r"^[\d.]+\.?\s*", "", label)
    return re.sub(r"[@$#*]", "", label).strip()

def match_rows(rows, expected, numbers_per_row):
    results = {}
    expected_iter = iter(expected)
    current = next(expected_iter, None)
    for row in rows:
        if current is None:
            break
        label = strip_row_number(row[0])
        numbers = [c for c in row[1:] if re.match(r"^-?[\d,.]+$", c)]
        if len(numbers) != numbers_per_row:
            continue
        match_substr, field_name = current
        if match_substr.lower() in label.lower():
            results[field_name] = numbers
            current = next(expected_iter, None)
    return results

def scrape_all_rbi_payments():
    print("\n--- Scraping All RBI Payments (Range Id=30 to 65) ---")
    all_rows = []
    seen_months = set()
    for psi_id in range(65, 29, -1):
        try:
            html = fetch_url(f"https://rbi.org.in/Scripts/PSIUserView.aspx?Id={psi_id}")
            m = re.search(r"Payment System Indicators - ([A-Za-z]+) (\d{4})", html)
            if not m or m.group(1) not in MONTH_NUM:
                continue
            month_iso = month_label_to_iso(m.group(1), m.group(2))
            if month_iso in seen_months:
                continue
            
            rows = parse_table_rows(html)
            volval = match_rows(rows, RBIP_VOLVAL_ROWS, numbers_per_row=8)
            counts = match_rows(rows, RBIP_COUNT_ROWS, numbers_per_row=4)
            
            row_data = {"month": month_iso}
            for base, numbers in volval.items():
                row_data[f"{base}_volume"] = float(numbers[3].replace(",", ""))
                row_data[f"{base}_value"] = float(numbers[7].replace(",", ""))
            for base, numbers in counts.items():
                row_data[base] = float(numbers[3].replace(",", ""))
                
            all_rows.append(row_data)
            seen_months.add(month_iso)
            print(f"  ✓ Processed RBI Payments for {month_iso}")
        except Exception:
            pass

    if all_rows:
        sync_table_data("rbi_payments", ["month"], all_rows)

def main():
    scrape_all_rbi_cards()
    scrape_all_rbi_payments()
    print("\n🎉 RBI Full 2024-2026 Historical Scraping Completed Successfully!")

if __name__ == "__main__":
    main()
