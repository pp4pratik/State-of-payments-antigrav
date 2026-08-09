"""
Central Google Drive Sync & JSON Manager

When fetch_rbi_data.py or fetch_npci_data.py pull fresh data from RBI/NPCI,
this module:
1. Formats and updates the local JSON dataset in public/data/{table}.json
2. Automatically uploads the updated JSON file directly to Google Drive folder (1mJH91_YV0hZ-rOqah95F8krkZv--iN-9)
   in the exact same format.

Usage:
    from scripts.gdrive_sync import sync_table_data
    sync_table_data("monthly_trend", ["month"], new_rows, dry_run=False)
"""

import json
import os
import sys
import urllib.request
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "public" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

GDRIVE_FOLDER_ID = "1mJH91_YV0hZ-rOqah95F8krkZv--iN-9"

def sync_table_data(table_name, unique_cols, rows, dry_run=False):
    """
    Upserts new rows into local JSON file public/data/{table_name}.json
    and syncs the updated dataset to Google Drive.
    """
    if not rows:
        return

    json_path = DATA_DIR / f"{table_name}.json"
    existing_rows = []
    if json_path.exists():
        try:
            with open(json_path) as f:
                existing_rows = json.load(f)
        except Exception as e:
            print(f"  [Warning] Failed to read existing {json_path.name}: {e}")

    if dry_run:
        print(f"  [dry-run] Would update {len(rows)} row(s) into {table_name}.json and sync to Google Drive")
        return

    # Upsert rows by unique_cols while maintaining natural order
    key_idx = {tuple(r.get(c) for c in unique_cols): i for i, r in enumerate(existing_rows)}
    for row in rows:
        k = tuple(row.get(c) for c in unique_cols)
        if k in key_idx:
            existing_rows[key_idx[k]] = row
        else:
            existing_rows.append(row)

    # Save to local file
    with open(json_path, "w") as f:
        json.dump(existing_rows, f, indent=2)
    print(f"  ✓ Saved local: public/data/{table_name}.json ({len(existing_rows)} total rows)")

    # Upload to Google Drive if credentials or token exist
    upload_file_to_gdrive(json_path, GDRIVE_FOLDER_ID)

def upload_file_to_gdrive(filepath, folder_id):
    """
    Uploads or updates a file in Google Drive folder using Google Drive API
    or OAuth token if available.
    """
    token_path = PROJECT_DIR / "token.json"
    service_account_path = PROJECT_DIR / "service_account.json"

    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
        from google.oauth2 import service_account
        from google.oauth2.credentials import Credentials

        creds = None
        SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']

        if service_account_path.exists():
            creds = service_account.Credentials.from_service_account_file(str(service_account_path), scopes=SCOPES)
        elif token_path.exists():
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)

        if creds and creds.valid:
            service = build('drive', 'v3', credentials=creds)

            # Check if file already exists in target folder
            query = f"'{folder_id}' in parents and name = '{filepath.name}' and trashed = false"
            results = service.files().list(q=query, fields="files(id, name)").execute()
            items = results.get('files', [])

            media = MediaFileUpload(str(filepath), mimetype='application/json', resumable=True)

            if items:
                file_id = items[0]['id']
                service.files().update(fileId=file_id, media_body=media).execute()
                print(f"  🚀 Synced to Google Drive: {filepath.name} (File ID: {file_id})")
            else:
                file_metadata = {'name': filepath.name, 'parents': [folder_id]}
                file_obj = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
                print(f"  🚀 Uploaded to Google Drive: {filepath.name} (File ID: {file_obj.get('id')})")
        else:
            print(f"  ℹ️ File public/data/{filepath.name} updated. To enable direct automated upload to Google Drive folder ({folder_id}), place service_account.json or token.json in project root.")
    except Exception as e:
        print(f"  ℹ️ Local dataset public/data/{filepath.name} updated. (Google Drive auto-sync notice: {e})")

if __name__ == "__main__":
    print("Google Drive Sync Manager ready.")
