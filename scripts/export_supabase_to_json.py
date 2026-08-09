"""
Export Supabase database tables (or current dataset) to JSON files in public/data/
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

def fetch_from_supabase(supabase_url, service_role_key, table):
    url = f"{supabase_url}/rest/v1/{table}?select=*"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def get_sample_data(table):
    """Fallback sample data if Supabase credentials are not present."""
    if table == "monthly_trend":
        return [
            {"month": "2024-09", "total_volume_mn": 15041.5, "total_value_cr": 2064000.0, "banks_live": 612},
            {"month": "2024-10", "total_volume_mn": 16580.2, "total_value_cr": 2352000.0, "banks_live": 624},
            {"month": "2024-11", "total_volume_mn": 15480.0, "total_value_cr": 2155000.0, "banks_live": 630},
            {"month": "2024-12", "total_volume_mn": 16720.0, "total_value_cr": 2389000.0, "banks_live": 642},
            {"month": "2025-01", "total_volume_mn": 16980.5, "total_value_cr": 2420000.0, "banks_live": 650},
        ]
    elif table == "app_stats":
        return [
            {"app_name": "PhonePe", "month": "2025-01", "volume_mn": 8200.0, "value_cr": 1180000.0},
            {"app_name": "Google Pay", "month": "2025-01", "volume_mn": 6200.0, "value_cr": 890000.0},
            {"app_name": "Paytm", "month": "2025-01", "volume_mn": 1100.0, "value_cr": 140000.0},
            {"app_name": "CRED", "month": "2025-01", "volume_mn": 250.0, "value_cr": 65000.0},
            {"app_name": "Amazon Pay", "month": "2025-01", "volume_mn": 180.0, "value_cr": 22000.0},
        ]
    elif table == "p2p_p2m":
        return [
            {"month": "2024-11", "p2p_volume_mn": 5400.0, "p2p_value_cr": 1280000.0, "p2m_volume_mn": 10080.0, "p2m_value_cr": 875000.0},
            {"month": "2024-12", "p2p_volume_mn": 5800.0, "p2p_value_cr": 1390000.0, "p2m_volume_mn": 10920.0, "p2m_value_cr": 999000.0},
            {"month": "2025-01", "p2p_volume_mn": 6000.0, "p2p_value_cr": 1420000.0, "p2m_volume_mn": 10980.0, "p2m_value_cr": 1000000.0},
        ]
    elif table == "merchant_categories":
        return [
            {"mcc": "5411", "description": "Groceries & Supermarkets", "type": "Everyday", "month": "2025-01", "volume_mn": 3200.0, "value_cr": 150000.0},
            {"mcc": "5812", "description": "Restaurants & Dining", "type": "Food", "month": "2025-01", "volume_mn": 1800.0, "value_cr": 65000.0},
            {"mcc": "5541", "description": "Fuel Stations", "type": "Utilities", "month": "2025-01", "volume_mn": 1200.0, "value_cr": 85000.0},
            {"mcc": "5311", "description": "Department Stores", "type": "Shopping", "month": "2025-01", "volume_mn": 950.0, "value_cr": 72000.0},
            {"mcc": "5912", "description": "Pharmacies", "type": "Health", "month": "2025-01", "volume_mn": 780.0, "value_cr": 34000.0},
        ]
    elif table == "statewise":
        return [
            {"state": "Maharashtra", "district": "Maharashtra", "month": "2025-01", "volume_mn": 2200.0, "volume_share_pct": 13.0, "value_cr": 315000.0, "value_share_pct": 13.0},
            {"state": "Karnataka", "district": "Karnataka", "month": "2025-01", "volume_mn": 1650.0, "volume_share_pct": 9.7, "value_cr": 242000.0, "value_share_pct": 10.0},
            {"state": "Tamil Nadu", "district": "Tamil Nadu", "month": "2025-01", "volume_mn": 1400.0, "volume_share_pct": 8.2, "value_cr": 198000.0, "value_share_pct": 8.2},
            {"state": "Uttar Pradesh", "district": "Uttar Pradesh", "month": "2025-01", "volume_mn": 1550.0, "volume_share_pct": 9.1, "value_cr": 210000.0, "value_share_pct": 8.7},
            {"state": "Telangana", "district": "Telangana", "month": "2025-01", "volume_mn": 1250.0, "volume_share_pct": 7.4, "value_cr": 182000.0, "value_share_pct": 7.5},
        ]
    elif table == "circulars":
        return [
            {"ref": "NPCI/UPI/OC-182/2024-25", "fy": "2024-25", "title": "Enhancement of Transaction Limit for Specific Categories", "date_added": "2024-12-15", "pdf_url": "https://www.npci.org.in/PDF/circulars/UPI-Limit-Enhancement.pdf"},
            {"ref": "NPCI/UPI/OC-175/2024-25", "fy": "2024-25", "title": "Guidelines on UPI AutoPay Execution Windows", "date_added": "2024-10-20", "pdf_url": "https://www.npci.org.in/PDF/circulars/AutoPay-Guidelines.pdf"},
            {"ref": "NPCI/UPI/OC-160/2024-25", "fy": "2024-25", "title": "Interoperability of Credit Cards on UPI", "date_added": "2024-07-10", "pdf_url": "https://www.npci.org.in/PDF/circulars/Credit-Cards-UPI.pdf"},
        ]
    elif table == "autopay_registrations":
        return [
            {"psp": "PhonePe", "month": "2025-01", "registrations_mn": 16.5, "approved_pct": 94.2, "bd_pct": 3.4, "td_pct": 2.4},
            {"psp": "Google Pay", "month": "2025-01", "registrations_mn": 12.1, "approved_pct": 92.8, "bd_pct": 4.1, "td_pct": 3.1},
            {"psp": "Paytm", "month": "2025-01", "registrations_mn": 3.4, "approved_pct": 89.5, "bd_pct": 6.2, "td_pct": 4.3},
        ]
    elif table == "autopay_executions":
        return [
            {"bank": "State Bank of India", "month": "2025-01", "executions_mn": 48.2, "approved_pct": 91.8, "bd_pct": 4.8, "td_pct": 3.4},
            {"bank": "HDFC Bank", "month": "2025-01", "executions_mn": 32.5, "approved_pct": 95.4, "bd_pct": 2.8, "td_pct": 1.8},
            {"bank": "ICICI Bank", "month": "2025-01", "executions_mn": 28.0, "approved_pct": 94.9, "bd_pct": 3.1, "td_pct": 2.0},
            {"bank": "Axis Bank", "month": "2025-01", "executions_mn": 21.4, "approved_pct": 93.8, "bd_pct": 3.9, "td_pct": 2.3},
        ]
    elif table == "autopay_registrations_by_bank":
        return [
            {"remitter_bank": "State Bank of India", "month": "2025-01", "registrations_mn": 19.2, "approved_pct": 92.5, "bd_pct": 4.5, "td_pct": 3.0},
            {"remitter_bank": "HDFC Bank", "month": "2025-01", "registrations_mn": 14.8, "approved_pct": 96.0, "bd_pct": 2.5, "td_pct": 1.5},
            {"remitter_bank": "ICICI Bank", "month": "2025-01", "registrations_mn": 12.0, "approved_pct": 95.2, "bd_pct": 2.9, "td_pct": 1.9},
        ]
    elif table == "autopay_executions_by_psp":
        return [
            {"psp": "PhonePe", "month": "2025-01", "executions_mn": 42.0, "approved_pct": 95.1, "bd_pct": 2.9, "td_pct": 2.0},
            {"psp": "Google Pay", "month": "2025-01", "executions_mn": 31.5, "approved_pct": 93.6, "bd_pct": 3.8, "td_pct": 2.6},
            {"psp": "Paytm", "month": "2025-01", "executions_mn": 9.8, "approved_pct": 90.2, "bd_pct": 5.8, "td_pct": 4.0},
        ]
    elif table == "psp_member_performance":
        return [
            {"entity_name": "PhonePe", "direction": "Payer", "month": "2025-01", "volume_mn": 7450.0, "approved_pct": 98.4, "bd_pct": 1.0, "td_pct": 0.6},
            {"entity_name": "Google Pay", "direction": "Payer", "month": "2025-01", "volume_mn": 5600.0, "approved_pct": 97.9, "bd_pct": 1.3, "td_pct": 0.8},
            {"entity_name": "State Bank of India", "direction": "Payee", "month": "2025-01", "volume_mn": 4900.0, "approved_pct": 94.5, "bd_pct": 3.5, "td_pct": 2.0},
        ]
    elif table == "rbi_cards":
        return [
            {
                "month": "2024-12",
                "atms_onsite": 114500, "atms_offsite": 104200, "pos_terminals": 8450000, "micro_atms": 1480000,
                "bharat_qr_codes": 4950000, "upi_qr_codes": 345000000,
                "credit_cards_outstanding": 99500000, "debit_cards_outstanding": 955000000,
                "credit_pos_volume": 178.0, "credit_pos_value": 41500.0,
                "credit_online_volume": 205.0, "credit_online_value": 84000.0,
                "credit_others_volume": 4.8, "credit_others_value": 1150.0,
                "credit_atm_withdrawal_volume": 0.48, "credit_atm_withdrawal_value": 390.0,
                "debit_pos_volume": 148.0, "debit_pos_value": 21800.0,
                "debit_online_volume": 108.0, "debit_online_value": 27500.0,
                "debit_others_volume": 1.9, "debit_others_value": 490.0,
                "debit_atm_withdrawal_volume": 445.0, "debit_atm_withdrawal_value": 278000.0,
                "debit_pos_withdrawal_volume": 0.95, "debit_pos_withdrawal_value": 145.0
            },
            {
                "month": "2025-01",
                "atms_onsite": 115000, "atms_offsite": 105000, "pos_terminals": 8500000, "micro_atms": 1500000,
                "bharat_qr_codes": 5000000, "upi_qr_codes": 350000000,
                "credit_cards_outstanding": 100000000, "debit_cards_outstanding": 960000000,
                "credit_pos_volume": 180.5, "credit_pos_value": 42000.0,
                "credit_online_volume": 210.0, "credit_online_value": 85000.0,
                "credit_others_volume": 5.0, "credit_others_value": 1200.0,
                "credit_atm_withdrawal_volume": 0.5, "credit_atm_withdrawal_value": 400.0,
                "debit_pos_volume": 150.0, "debit_pos_value": 22000.0,
                "debit_online_volume": 110.0, "debit_online_value": 28000.0,
                "debit_others_volume": 2.0, "debit_others_value": 500.0,
                "debit_atm_withdrawal_volume": 450.0, "debit_atm_withdrawal_value": 280000.0,
                "debit_pos_withdrawal_volume": 1.0, "debit_pos_withdrawal_value": 150.0
            }
        ]
    elif table == "rbi_payments":
        return [
            {
                "month": "2024-12",
                "upi_volume": 16720.0, "upi_value": 2389000.0,
                "neft_volume": 640.0, "neft_value": 3050000.0,
                "imps_volume": 510.0, "imps_value": 610000.0,
                "rtgs_total_volume": 21.5, "rtgs_total_value": 14200000.0
            },
            {
                "month": "2025-01",
                "upi_volume": 16980.5, "upi_value": 2420000.0,
                "neft_volume": 650.0, "neft_value": 3100000.0,
                "imps_volume": 520.0, "imps_value": 620000.0,
                "rtgs_total_volume": 22.0, "rtgs_total_value": 14500000.0
            }
        ]
    return []

def main():
    env = load_env(PROJECT_DIR / ".env")
    supabase_url = env.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = env.get("SUPABASE_SERVICE_ROLE_KEY")

    for table in TABLES:
        rows = None
        if supabase_url and service_role_key:
            try:
                rows = fetch_from_supabase(supabase_url, service_role_key, table)
                print(f"Fetched {len(rows)} rows from Supabase for table: {table}")
            except Exception as e:
                print(f"Supabase fetch failed for {table}: {e}")
        
        if not rows:
            rows = get_sample_data(table)
            print(f"Using initial seed dataset for table: {table} ({len(rows)} rows)")
        
        out_file = OUTPUT_DIR / f"{table}.json"
        with open(out_file, "w") as f:
            json.dump(rows, f, indent=2)
        print(f"Saved -> {out_file.relative_to(PROJECT_DIR)}")

    print("\nAll JSON files exported successfully!")

if __name__ == "__main__":
    main()
